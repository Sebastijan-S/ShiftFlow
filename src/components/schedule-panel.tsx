"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import type { SetupData, Workspace } from "@/lib/types";
import { expandDemand, replace, swap, validateSchedule, type Result, type ScheduleInput, type Slot } from "@/lib/scheduling/engine";
import { loadWeek, monday, moveWeek, publishWeek, saveWeek } from "@/lib/scheduling/data";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Props = { workspace: Workspace; data: SetupData; navigate?: (view: "team" | "availability" | "settings") => void };
type QueuedChange = { next: Slot[]; previous: Slot[]; operation: string; id: string };
const dayLabel = (value: string) => new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00Z`));
const timeLabel = (value: number, zone: string) => new Intl.DateTimeFormat("sr-Latn-RS", { timeZone: zone, hour: "2-digit", minute: "2-digit" }).format(value);
const tokenKey = (workspaceId: string) => `shiftflow-team-${workspaceId}`;

export function SchedulePanel({ workspace, data, navigate }: Props) {
  const [week, setWeek] = useState(monday);
  const [state, setState] = useState<{ slots: Slot[]; adjacent: Slot[]; revision: number; publishedRevision: number | null }>({ slots: [], adjacent: [], revision: 0, publishedRevision: null });
  const [status, setStatus] = useState("Učitavanje rasporeda…"); const [error, setError] = useState("");
  const [day, setDay] = useState(0); const [role, setRole] = useState(""); const [result, setResult] = useState<Result | null>(null);
  const [working, setWorking] = useState(false); const [generating,setGenerating] = useState(false); const [progress, setProgress] = useState(0); const [link, setLink] = useState("");
  const [loaded,setLoaded] = useState(false);
  const [pending,setPending] = useState<QueuedChange|null>(null);
  const [undo, setUndo] = useState<Slot[] | null>(null); const worker = useRef<Worker | null>(null); const dragged = useRef<string | null>(null);
  const latest = useRef(state);
  const queue = useRef<QueuedChange[]>([]); const processing = useRef(false);
  useEffect(() => { latest.current = state; },[state]);
  const input: ScheduleInput = { weekStart: week, timezone: workspace.timezone, setup: data, adjacent: state.adjacent, existing: state.slots };
  const refresh = useCallback(async () => {
    try { const loadedWeek = await loadWeek(workspace.id,week); latest.current=loadedWeek; queue.current=[]; setState(loadedWeek); setUndo(null); setPending(null); setResult(null); setError(""); setLoaded(true); setStatus(loadedWeek.revision ? `Sačuvana revizija ${loadedWeek.revision}` : "Nema sačuvanog rasporeda"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Učitavanje nije uspelo"); setStatus("Greška pri učitavanju"); setLoaded(false); }
  },[workspace.id,week]);
  useEffect(() => { const timer=setTimeout(() => void refresh(),0); return () => { clearTimeout(timer); worker.current?.terminate(); worker.current=null; }; },[refresh]);
  useEffect(() => { const timer=setTimeout(() => setLink(localStorage.getItem(tokenKey(workspace.id)) ?? ""),0); return () => clearTimeout(timer); },[workspace.id]);

  const drain = useCallback(async () => {
    if (processing.current) return;
    processing.current=true; setWorking(true); setError(""); setStatus("Čuvanje…");
    while (queue.current.length) {
      const job=queue.current[0];
      try {
        const newRevision=await saveWeek(workspace.id,week,latest.current.revision,workspace.setup_revision,job.next,job.operation,job.id);
        queue.current.shift(); latest.current={...latest.current,revision:newRevision};
        setState((current)=>({...current,revision:newRevision})); setUndo(job.previous); setPending(null);
        setStatus(queue.current.length ? `Sačuvana revizija ${newRevision}; sledeća izmena…` : `Sačuvana revizija ${newRevision}`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Čuvanje nije uspelo");
        setStatus("Nije sačuvano. Predlog je zadržan na ekranu."); setPending(job); break;
      }
    }
    processing.current=false; setWorking(false);
  },[workspace.id,workspace.setup_revision,week]);
  const commit = useCallback((next: Slot[], operation: string, previous: Slot[]) => {
    queue.current.push({next,previous,operation,id:crypto.randomUUID()});
    latest.current={...latest.current,slots:next}; setState((current)=>({...current,slots:next}));
    void drain();
  },[drain]);

  const generateWeek = () => {
    if (working || !loaded || pending || worker.current) return;
    setError(""); setProgress(0); setStatus("Generisanje…"); setWorking(true); setGenerating(true);
    const task = new Worker(new URL("../lib/scheduling/worker.ts", import.meta.url)); worker.current = task;
    task.onmessage = (event: MessageEvent<{type:string; nodes?:number; result?:Result; message?:string}>) => {
      if (event.data.type === "progress") { setProgress(event.data.nodes ?? 0); return; }
      task.terminate(); worker.current=null; setWorking(false); setGenerating(false);
      if (event.data.type === "error") { setError(event.data.message ?? "Generisanje nije uspelo"); setStatus("Prethodni nacrt je sačuvan"); return; }
      const generated = event.data.result!; setResult(generated);
      if (generated.status === "invalid" || generated.status === "cancelled") { setStatus("Prethodni nacrt je sačuvan"); return; }
      setStatus(generated.status === "complete" ? "Rešenje pronađeno; čuvanje…" : generated.status === "limit" ? "Granica pretrage dostignuta; čuvanje nepotpunog predloga…" : "Nepotpuna pokrivenost; čuvanje nacrta…");
      void commit(generated.slots,"generate",latest.current.slots.length ? latest.current.slots : generated.slots.map((s)=>({...s,employeeId:null,locked:false})));
    };
    task.onerror = () => { task.terminate(); worker.current=null; setWorking(false); setGenerating(false); setError("Generator nije dostupan"); setStatus("Prethodni nacrt je sačuvan"); };
    task.postMessage(input);
  };
  const cancel = () => { worker.current?.terminate(); worker.current=null; setWorking(false); setGenerating(false); setStatus("Generisanje otkazano. Prethodni nacrt je sačuvan."); };
  const change = (action: (slots: Slot[]) => Slot[], operation: string) => {
    if (generating || !loaded || pending) return;
    try { const previous=latest.current.slots.length ? latest.current.slots : expandDemand(input); const next=action(previous); commit(next,operation,previous); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Neispravna izmena"); }
  };
  const swapOrMove = (from: string, to: string) => change((slots) => {
    const source=slots.find((s) => s.id===from), target=slots.find((s) => s.id===to);
    if (!source?.employeeId || !target || source.locked || target.locked) throw new Error("Smene moraju biti otključane.");
    if (target.employeeId) return swap(input,slots,from,to);
    const next=slots.map((s) => s.id===from ? { ...s,employeeId:null } : s.id===to ? { ...s,employeeId:source.employeeId } : s);
    const issues=validateSchedule(input,next,false); if (issues.length) throw new Error(issues[0].reason); return next;
  },"drag_move_or_swap");
  const publish = async () => {
    setWorking(true); setStatus("Objavljivanje…"); setError("");
    try { const revision=await publishWeek(workspace.id,week,state.revision); setState((s) => ({...s,publishedRevision:revision})); setStatus(`Objavljena revizija ${revision}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Objavljivanje nije uspelo"); setStatus("Objava nije promenjena"); }
    finally { setWorking(false); }
  };
  const createLink = async (rotate = false) => {
    const bytes=crypto.getRandomValues(new Uint8Array(32)); const token=Array.from(bytes,(b)=>b.toString(16).padStart(2,"0")).join("");
    const { error }=await supabaseBrowser().rpc(rotate ? "rotate_team_link" : "create_team_link",{p_workspace:workspace.id,p_token:token});
    if (error) { setError(error.message); return; }
    localStorage.setItem(tokenKey(workspace.id),token); setLink(token);
  };
  const revokeLink = async () => {
    const { error }=await supabaseBrowser().rpc("revoke_team_link",{p_workspace:workspace.id});
    if (error) { setError(error.message); return; }
    localStorage.removeItem(tokenKey(workspace.id)); setLink(""); setStatus("Tim link je opozvan");
  };
  const goWeek=(delta:number)=>{ if (working || pending) return; setLoaded(false); setStatus("Učitavanje rasporeda…"); setWeek(moveWeek(week,delta)); };

  if (!data.employees.length || !data.roles.length || !data.shifts.length || !data.requirements.length || !data.windows.length)
    return <div className="schedule-empty"><span className="eyebrow">RASPORED</span><h2>Pripremite podatke za generisanje.</h2><p>Potrebni su zaposleni, uloge, smene, dostupnost i potrebna pokrivenost.</p>{navigate && <div className="step-list"><button className="step" onClick={() => navigate("team")}>Tim i uloge →</button><button className="step" onClick={() => navigate("availability")}>Dostupnost →</button><button className="step" onClick={() => navigate("settings")}>Smene i potrebe →</button></div>}</div>;
  if (!loaded) return <div className="panel" role="status">{error || "Učitavanje rasporeda…"} {error && <button onClick={()=>void refresh()}>Pokušaj ponovo</button>}</div>;
  const slots = state.slots.length ? state.slots : (() => { try { return expandDemand(input); } catch { return []; } })();
  const dates=Array.from({length:7},(_,i)=>Temporal.PlainDate.from(week).add({days:i}).toString());
  const visible=slots.filter((s) => !s.cancelled && (!role || s.roleId===role));
  const cancelledSlots=slots.filter((s) => s.cancelled && (!role || s.roleId===role));
  const activeSlots=slots.filter((s) => !s.cancelled);
  const coverage=activeSlots.filter((s)=>s.employeeId).length;
  const assignedHours=slots.reduce((h,s)=>h+(s.employeeId ? (s.end-s.start)/3600000 : 0),0);
  const renderSlot = (slot: Slot) => {
    const employee = data.employees.find((person) => person.id === slot.employeeId);
    const roleName = data.roles.find((item) => item.id === slot.roleId)?.name;
    return <article key={slot.id} className={`shift-card ${slot.employeeId ? "filled" : "gap"}`} draggable={!!slot.employeeId && !slot.locked && !generating && !pending}
      onDragStart={() => { dragged.current = slot.id; }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); if (dragged.current && dragged.current !== slot.id) swapOrMove(dragged.current, slot.id); dragged.current = null; }}>
      <div className="shift-card-head"><strong>{timeLabel(slot.start, workspace.timezone)}–{timeLabel(slot.end, workspace.timezone)}</strong><span>{roleName}</span></div>
      <div className="employee-name">{employee?.display_name ?? "Nepokriveno"}</div>
      <div className="shift-controls">
        <label>Zameni<select disabled={generating || !!pending || slot.locked} value={slot.employeeId ?? ""} onChange={(event) => change((all) => replace(input, all, slot.id, event.target.value || null), "replace")}>
          <option value="">Nepokriveno</option>
          {data.employees.map((person) => <option key={person.id} value={person.id}>{person.display_name}{person.active ? "" : " — neaktivan"}</option>)}
        </select></label>
        <label>Zameni mesta<select disabled={generating || !!pending || slot.locked || !slot.employeeId} value="" onChange={(event) => { if (event.target.value) change((all) => swap(input, all, slot.id, event.target.value), "swap"); }}>
          <option value="">Izaberi smenu</option>{activeSlots.filter((item) => item.id !== slot.id && item.employeeId && !item.locked).map((item) => <option key={item.id} value={item.id}>{dayLabel(item.localDate)} {timeLabel(item.start, workspace.timezone)} · {data.employees.find((person) => person.id === item.employeeId)?.display_name}</option>)}
        </select></label>
        <button type="button" disabled={generating || !!pending} onClick={() => change((all) => all.map((item) => item.id === slot.id ? { ...item, locked: !item.locked } : item), slot.locked ? "unlock" : "lock")}>{slot.locked ? "Otključaj" : "Zaključaj"}</button>
        <button type="button" disabled={generating || !!pending || slot.locked} onClick={() => change((all) => all.map((item) => item.id === slot.id ? { ...item, employeeId: null, cancelled: true } : item), "cancel_shift")}>Ukloni smenu</button>
      </div>
    </article>;
  };
  return <div className="schedule-workspace">
    <div className="schedule-toolbar panel"><div className="week-controls"><button type="button" onClick={() => goWeek(-1)} aria-label="Prethodna nedelja">←</button><strong>{dayLabel(week)} – {dayLabel(dates[6])}</strong><button type="button" onClick={() => goWeek(1)} aria-label="Sledeća nedelja">→</button></div><div className="schedule-actions"><select aria-label="Filter uloga" value={role} onChange={(e)=>setRole(e.target.value)}><option value="">Sve uloge</option>{data.roles.map((r)=><option key={r.id} value={r.id}>{r.name}</option>)}</select><button className="primary-button" disabled={working || !!pending} onClick={generateWeek}>Generiši</button>{generating && <button onClick={cancel}>Otkaži</button>}<button disabled={working || !!pending || !state.revision || coverage!==activeSlots.length} onClick={() => void publish()}>Objavi ažuriranje</button><button onClick={() => window.print()}>Štampaj / PDF</button></div></div>
    <div className="schedule-summary"><div className="panel"><strong>{coverage} / {activeSlots.length}</strong><span>Pokrivenost</span></div><div className="panel"><strong>{assignedHours.toFixed(1)} h</strong><span>Dodeljeni sati</span></div><div className="panel"><strong>{state.publishedRevision ?? "—"}</strong><span>Objavljena revizija</span></div></div>
    <div className="schedule-feedback" aria-live="polite">{status}{progress>0 && generating ? ` (${progress} koraka)` : ""}</div><p className="manual-rule-note">Ručne izmene mogu da zaobiđu dostupnost, odmor, preklapanje i ograničenja sati. Generator i dalje poštuje ta pravila.</p>{error && <div className="notice error" role="alert">{error} {pending && <button disabled={working} onClick={() => void drain()}>Pokušaj ponovo</button>} <button onClick={() => void refresh()}>Učitaj sa servera</button></div>}
    {result && result.issues.length>0 && <div className="notice error" role="status">{result.status==="limit" ? "Pretraga je dostigla granicu; nepokrivenost nije dokaz neizvodljivosti." : "Nepotpuna pokrivenost."} {result.issues.length} mesta bez dodele. {result.issues.slice(0,3).map((i)=>i.reason).join("; ")}</div>}
    {undo && <button className="text-button undo-button" disabled={working} onClick={() => { const previous=state.slots; void commit(undo,"undo",previous); setUndo(null); }}>Poništi poslednju izmenu</button>}
    <div className="mobile-day-select" role="group" aria-label="Dan u nedelji">{dates.map((d,i)=><button key={d} aria-pressed={day===i} onClick={()=>setDay(i)}>{dayLabel(d)}</button>)}</div>
    <h2 className="print-title">Raspored: {dayLabel(week)} – {dayLabel(dates[6])}</h2>
    <div className="week-grid">{dates.map((date, index) => <section key={date} className={"day-column " + (day === index ? "selected" : "")}>
      <h3>{dayLabel(date)}</h3>
      <div className="day-slots">
        {visible.filter((slot) => slot.localDate === date).map(renderSlot)}
        {cancelledSlots.filter((slot) => slot.localDate === date).map((slot) => <button type="button" className="add-shift-button" key={slot.id} disabled={generating || !!pending} onClick={() => change((all) => all.map((item) => item.id === slot.id ? { ...item, cancelled: false } : item), "restore_shift")}>+ Dodaj smenu · {timeLabel(slot.start, workspace.timezone)} · {data.roles.find((item) => item.id === slot.roleId)?.name}</button>)}
        {!visible.some((slot) => slot.localDate === date) && !cancelledSlots.some((slot) => slot.localDate === date) && <p className="empty-hint">Nema potrebnih smena.</p>}
      </div>
    </section>)}</div>
    <div className="panel share-panel"><h2>Link za tim</h2><p>Članovi tima vide samo objavljene nedelje. Nacrt i privatni podaci nisu dostupni preko linka.</p>{link ? <><input aria-label="Link za tim" readOnly value={`${typeof window==="undefined"?"":window.location.origin}/team/${link}`} onFocus={(e)=>e.target.select()} /><button onClick={()=>void navigator.clipboard.writeText(`${window.location.origin}/team/${link}`)}>Kopiraj</button><button onClick={()=>void revokeLink()}>Opozovi link</button><button onClick={()=>void createLink(true)}>Rotiraj link</button></> : <><button onClick={()=>void createLink()}>Napravi link za tim</button><button onClick={()=>void createLink(true)}>Zameni postojeći link</button></>}</div>
  </div>;
}
