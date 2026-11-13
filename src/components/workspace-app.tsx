"use client";

import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CalendarBlank, UsersThree, Clock, GearSix } from "@phosphor-icons/react";
import { AuthPanel } from "@/components/auth-panel";
import { WorkspaceCreate } from "@/components/workspace-create";
import { TeamPanel } from "@/components/team-panel";
import { AvailabilityPanel } from "@/components/availability-panel";
import { SettingsPanel } from "@/components/settings-panel";
import { SchedulePanel } from "@/components/schedule-panel";
import { PlansInfo } from "@/components/plans-info";
import { ThemeToggle } from "@/components/theme-toggle";
import { loadSetup } from "@/lib/setup-data";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { SetupData, Workspace } from "@/lib/types";

type View = "schedule" | "team" | "availability" | "settings";
const menu: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "schedule", label: "Raspored", icon: <CalendarBlank size={20} /> }, { id: "team", label: "Tim", icon: <UsersThree size={20} /> },
  { id: "availability", label: "Dostupnost", icon: <Clock size={20} /> }, { id: "settings", label: "Podešavanja", icon: <GearSix size={20} /> },
];
const simpleMenu: typeof menu = [
  { id: "schedule", label: "Raspored", icon: <CalendarBlank size={20} /> },
  { id: "availability", label: "Odsustva i izuzeci", icon: <Clock size={20} /> },
];
const emptyData: SetupData = { roles: [], employees: [], employeeRoles: [], shifts: [], windows: [], exceptions: [], requirements: [], rules: null };

export default function WorkspaceApp({ simple = false }: { simple?: boolean }) {
  const [user, setUser] = useState<User | null>(null); const [checking, setChecking] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null); const [data, setData] = useState<SetupData>(emptyData);
  const [view, setView] = useState<View>("schedule"); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const saving=useRef(false);
  const identity=useRef<string | null>(null);
  const authEpoch=useRef(0);
  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);
  const activeMenu = simple ? simpleMenu : menu;

  useEffect(() => {
    const db = supabaseBrowser();
    let active = true, authEvent = false;
    const acceptUser = (next: User | null) => {
      if (!active) return;
      if (identity.current !== (next?.id ?? null)) {
        authEpoch.current++;
        identity.current = next?.id ?? null;
        setWorkspace(null); setData(emptyData); setError(""); setSaved(""); setView("schedule");
      }
      setUser((current) => current?.id === next?.id ? current : next);
      setChecking(false);
    };
    void db.auth.getUser().then(({ data: result }) => { if (!authEvent) acceptUser(result.user); }).catch(() => { if (active) setChecking(false); });
    const { data: subscription } = db.auth.onAuthStateChange((_event, session) => { authEvent = true; acceptUser(session?.user ?? null); });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const db = supabaseBrowser();
    void (async () => {
      const result = await db.from("workspaces").select("*").eq("owner_user_id", user.id).maybeSingle();
      if (!active) return;
      if (result.error) { setError(result.error.message); setChecking(false); return; }
      const found = result.data as Workspace | null;
      if (found) {
        try { const loaded = await loadSetup(found.id); if (active) { setData(loaded); setWorkspace(found); } }
        catch (cause) { if (active) setError(errorMessage(cause,"Učitavanje nije uspelo.")); }
      } else setWorkspace(null);
      if (active) setChecking(false);
    })();
    return () => { active = false; };
  }, [user, reloadKey]);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    if(saving.current) return;
    saving.current=true;
    const owner = authEpoch.current;
    setBusy(true); setSaved(""); setError("");
    try { await action(); if (authEpoch.current === owner) { setSaved("Sačuvano"); refresh(); } }
    catch (cause) { if (authEpoch.current === owner) setError(errorMessage(cause,"Čuvanje nije uspelo.")); }
    finally { saving.current=false; setBusy(false); }
  }, [refresh]);

  if (checking) return <main className="loading">Učitavanje ShiftFlow…</main>;
  if (!user) return <AuthPanel />;
  if ((!workspace || workspace.owner_user_id !== user.id) && error) return <main className="setup-wrap"><div className="notice error" role="alert">{error} <Button onClick={refresh}>Pokušaj ponovo</Button></div></main>;
  if (!workspace || workspace.owner_user_id !== user.id) return <WorkspaceCreate key={user.id} userId={user.id} onCreated={refresh} />;
  return <div className="app-shell"><aside className="sidebar"><div className="brand">✳ ShiftFlow</div><div className="workspace-chip"><span className="workspace-icon">{workspace.name.slice(0, 1).toUpperCase()}</span><span><strong>{workspace.name}</strong><small>Poslovni prostor</small></span></div><nav aria-label="Glavna navigacija">{activeMenu.map((item) => <Button key={item.id} aria-current={view === item.id ? "page" : undefined} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => { setView(item.id); setSaved(""); }}>{item.icon}<span>{item.label}</span></Button>)}</nav><div className="sidebar-bottom">{!simple && <PlansInfo placement="sidebar" />}<span className="pilot-badge">✦ Besplatan pilot</span><Button className="signout" onClick={() => void supabaseBrowser().auth.signOut()}>Odjavi se ↗</Button></div></aside>
    <div className="main-column"><header className="topbar"><div><span className="breadcrumb">SHIFT FLOW / {workspace.name.toUpperCase()}</span><h1>{activeMenu.find((item) => item.id === view)?.label}</h1></div><div className="topbar-right"><span className="timezone">◷ {workspace.timezone}</span><ThemeToggle /><span className="user-avatar">{(user.email ?? user.phone ?? "U").slice(0, 1).toUpperCase()}</span></div></header><main className="page-content"><div className="page-head"><div><span className="eyebrow">{view === "schedule" ? "PREGLED" : view === "team" ? "TIM" : view === "settings" ? "PODEŠAVANJA" : "DOSTUPNOST"}</span><p>{view === "schedule" ? "Generišite, uredite i objavite nedeljni raspored." : view === "availability" && simple ? "Unesite odsustvo za ceo dan ili deo dana." : view === "team" ? "Članovi tima i oznake poslova u smenama." : view === "availability" ? "Kada su članovi tima dostupni i kada nisu." : "Smene, potrebna pokrivenost i pravila rasporeda."}</p></div><div className="status" aria-live="polite">{busy ? "Čuvanje…" : saved}</div></div>
      {error && <div className="notice error" role="alert">{error} <Button onClick={refresh}>Pokušaj ponovo</Button></div>}
      <div key={`${user.id}:${workspace.id}:schedule`} hidden={view !== "schedule"}><SchedulePanel workspace={workspace} data={data} navigate={simple ? undefined : setView} /></div>
      <fieldset className="setup-fields" disabled={busy}>
      {!simple && view === "team" && <TeamPanel key={`${user.id}:${workspace.id}`} workspaceId={workspace.id} data={data} run={run} />}
      {view === "availability" && <AvailabilityPanel key={`${user.id}:${workspace.id}`} workspaceId={workspace.id} data={data} run={run} exceptionsOnly={simple} />}
      {!simple && view === "settings" && <SettingsPanel key={`${user.id}:${workspace.id}`} workspace={workspace} data={data} run={run} />}
    </fieldset></main></div><nav className="mobile-nav" aria-label="Mobilna navigacija">{activeMenu.map((item) => <Button key={item.id} aria-current={view === item.id ? "page" : undefined} onClick={() => { setView(item.id); setSaved(""); }}><span>{item.icon}</span>{item.label}</Button>)}</nav></div>;
}
