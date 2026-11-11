"use client";

import { useCallback, useEffect, useState } from "react";
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
  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);
  const activeMenu = simple ? simpleMenu : menu;

  useEffect(() => {
    const db = supabaseBrowser();
    void db.auth.getUser().then(({ data: result }) => { setUser(result.user); setChecking(false); }).catch(() => setChecking(false));
    const { data: subscription } = db.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setWorkspace(null); setData(emptyData); setError(""); });
    return () => subscription.subscription.unsubscribe();
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
      setWorkspace(found);
      if (found) {
        try { const loaded = await loadSetup(found.id); if (active) setData(loaded); }
        catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Učitavanje nije uspelo."); }
      }
      if (active) setChecking(false);
    })();
    return () => { active = false; };
  }, [user, reloadKey]);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true); setSaved(""); setError("");
    try { await action(); setSaved("Sačuvano"); refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Čuvanje nije uspelo."); }
    finally { setBusy(false); }
  }, [refresh]);

  if (checking) return <main className="loading">Učitavanje ShiftFlow…</main>;
  if (!user) return <AuthPanel />;
  if (!workspace && error) return <main className="setup-wrap"><div className="notice error" role="alert">{error} <button onClick={refresh}>Pokušaj ponovo</button></div></main>;
  if (!workspace) return <WorkspaceCreate userId={user.id} onCreated={refresh} />;
  return <div className="app-shell"><aside className="sidebar"><div className="brand">✳ ShiftFlow</div><div className="workspace-chip"><span className="workspace-icon">{workspace.name.slice(0, 1).toUpperCase()}</span><span><strong>{workspace.name}</strong><small>Poslovni prostor</small></span></div><nav aria-label="Glavna navigacija">{activeMenu.map((item) => <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => { setView(item.id); setSaved(""); }}>{item.icon}<span>{item.label}</span></button>)}</nav><div className="sidebar-bottom">{!simple && <PlansInfo placement="sidebar" />}<span className="pilot-badge">✦ Besplatan pilot</span><button className="signout" onClick={() => void supabaseBrowser().auth.signOut()}>Odjavi se ↗</button></div></aside>
    <div className="main-column"><header className="topbar"><div><span className="breadcrumb">SHIFT FLOW / {workspace.name.toUpperCase()}</span><h1>{activeMenu.find((item) => item.id === view)?.label}</h1></div><div className="topbar-right"><span className="timezone">◷ {workspace.timezone}</span><ThemeToggle /><span className="user-avatar">{(user.email ?? user.phone ?? "U").slice(0, 1).toUpperCase()}</span></div></header><main className="page-content"><div className="page-head"><div><span className="eyebrow">{view === "schedule" ? "PREGLED" : "ODSUSTVA"}</span><p>{view === "schedule" ? "Generišite, uredite i objavite nedeljni raspored." : view === "availability" && simple ? "Unesite odsustvo za ceo dan ili deo dana." : view === "team" ? "Članovi tima i oznake poslova u smenama." : view === "availability" ? "Kada su članovi tima dostupni i kada nisu." : "Smene, potrebna pokrivenost i pravila rasporeda."}</p></div><div className="status" aria-live="polite">{busy ? "Čuvanje…" : saved}</div></div>
      {error && <div className="notice error" role="alert">{error} <button onClick={refresh}>Pokušaj ponovo</button></div>}
      {view === "schedule" && <SchedulePanel workspace={workspace} data={data} navigate={simple ? undefined : setView} />}
      {!simple && view === "team" && <TeamPanel workspaceId={workspace.id} data={data} run={run} />}
      {view === "availability" && <AvailabilityPanel workspaceId={workspace.id} data={data} run={run} exceptionsOnly={simple} />}
      {!simple && view === "settings" && <SettingsPanel workspace={workspace} data={data} run={run} />}
    </main></div><nav className="mobile-nav" aria-label="Mobilna navigacija">{activeMenu.map((item) => <button key={item.id} aria-current={view === item.id ? "page" : undefined} onClick={() => { setView(item.id); setSaved(""); }}><span>{item.icon}</span>{item.label}</button>)}</nav></div>;
}
