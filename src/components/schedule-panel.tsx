"use client";

import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useRef, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import type { SetupData, Workspace } from "@/lib/types";
import { expandDemand, replace, swap, validateSchedule, type Result, type ScheduleInput, type Slot } from "@/lib/scheduling/engine";
import { loadWeek, monday, moveWeek, publishWeek, saveWeek } from "@/lib/scheduling/data";
import { scheduleWarnings } from "@/lib/scheduling/warnings";
import { ShiftOptions, ShiftWarnings } from "@/components/shift-options";
import { TeamLinkPanel } from "@/components/team-link-panel";
import { CheckCircle, WarningCircle, CaretLeft, CaretRight } from "@phosphor-icons/react";

type Props = { workspace: Workspace; data: SetupData; navigate?: (view: "team" | "availability" | "settings") => void };
type QueuedChange = { next: Slot[]; previous: Slot[]; operation: string; id: string; setupRevision: number };
const dayLabel = (value: string) => new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00Z`));
const timeLabel = (value: number, zone: string) => new Intl.DateTimeFormat("sr-Latn-RS", { timeZone: zone, hour: "2-digit", minute: "2-digit" }).format(value);


export function SchedulePanel({ workspace, data, navigate }: Props) {
  const [week, setWeek] = useState(monday);
  const [state, setState] = useState<{ slots: Slot[]; adjacent: Slot[]; revision: number; publishedRevision: number | null }>({ slots: [], adjacent: [], revision: 0, publishedRevision: null });
  const [status, setStatus] = useState("Učitavanje rasporeda…"); const [error, setError] = useState("");
  const [day, setDay] = useState(0); const [role, setRole] = useState(""); const [result, setResult] = useState<Result | null>(null);
  const [working, setWorking] = useState(false); const [generating,setGenerating] = useState(false); const [progress, setProgress] = useState(0);
  const [loaded,setLoaded] = useState(false);
  const [pending,setPending] = useState<QueuedChange|null>(null);
  const [undo, setUndo] = useState<Slot[] | null>(null); const worker = useRef<Worker | null>(null); const dragged = useRef<string | null>(null);
  const latest = useRef(state);
  const queue = useRef<QueuedChange[]>([]); const processing = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current=true; return () => { active.current=false; queue.current=[]; worker.current?.terminate(); }; },[]);
  useEffect(() => { latest.current = state; },[state]);
  const input: ScheduleInput = { weekStart: week, timezone: workspace.timezone, setup: data, adjacent: state.adjacent, existing: state.slots };
  const refresh = useCallback(async () => {
    if (processing.current || queue.current.length) return;
    setLoaded(false);
    try { const loadedWeek = await loadWeek(workspace.id,week); if (!active.current) return; latest.current=loadedWeek; queue.current=[]; setState(loadedWeek); setUndo(null); setPending(null); setResult(null); setError(""); setLoaded(true); setStatus(loadedWeek.revision ? `Sačuvana revizija ${loadedWeek.revision}` : "Nema sačuvanog rasporeda"); }
    catch (cause) { if (!active.current) return; setError(errorMessage(cause,"Učitavanje nije uspelo")); setStatus("Greška pri učitavanju"); setLoaded(false); }
  },[workspace.id,week]);
  useEffect(() => { const timer=setTimeout(() => void refresh(),0); return () => { clearTimeout(timer); worker.current?.terminate(); worker.current=null; }; },[refresh]);


  const drain = useCallback(async () => {
    if (processing.current) return;
    processing.current=true; setWorking(true); setError(""); setStatus("Čuvanje…");
    while (active.current && queue.current.length) {
      const job=queue.current[0];
      try {
        const newRevision=await saveWeek(workspace.id,week,latest.current.revision,job.setupRevision,job.next,job.operation,job.id);
        if (!active.current) return;
        queue.current.shift(); latest.current={...latest.current,revision:newRevision};
        setState((current)=>({...current,revision:newRevision})); setUndo(job.previous); setPending(null);
        const savedWarnings=scheduleWarnings({weekStart:week,timezone:workspace.timezone,setup:data,adjacent:latest.current.adjacent,existing:job.next},job.next);
        setStatus(queue.current.length ? "Čuvanje…" : savedWarnings.length ? `Sačuvano uz upozorenja · Sačuvana revizija ${newRevision}` : `Sačuvana revizija ${newRevision}`);
      } catch (cause) {
        if (!active.current) return;
        setError(errorMessage(cause,"Čuvanje nije uspelo"));
        setStatus("Nije sačuvano. Predlog je zadržan na ekranu."); setPending(job); break;
      }
    }
    processing.current=false; setWorking(false);
  },[workspace.id,week,data,workspace.timezone]);
  const commit = useCallback((next: Slot[], operation: string, previous: Slot[]) => {
    queue.current.push({next,previous,operation,id:crypto.randomUUID(),setupRevision:workspace.setup_revision});
    latest.current={...latest.current,slots:next}; setState((current)=>({...current,slots:next}));
    void drain();
  },[drain,workspace.setup_revision]);

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
      void commit(generated.slots,generated.generationMode === "availability_override" ? "generate_availability_override" : "generate",latest.current.slots.length ? latest.current.slots : generated.slots.map((s)=>({...s,employeeId:null,locked:false})));
    };
    task.onerror = () => { task.terminate(); worker.current=null; setWorking(false); setGenerating(false); setError("Generator nije dostupan"); setStatus("Prethodni nacrt je sačuvan"); };
    task.postMessage(input);
  };
  const cancel = () => { worker.current?.terminate(); worker.current=null; setWorking(false); setGenerating(false); setStatus("Generisanje otkazano. Prethodni nacrt je sačuvan."); };
  const change = (action: (slots: Slot[]) => Slot[], operation: string) => {
    if (generating || !loaded || pending) return;
    try { const previous=latest.current.slots.length ? latest.current.slots : expandDemand(input); const next=action(previous); commit(next,operation,previous); }
    catch (cause) { setError(errorMessage(cause,"Neispravna izmena")); }
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
    catch (cause) { setError(errorMessage(cause,"Objavljivanje nije uspelo")); setStatus("Objava nije promenjena"); }
    finally { setWorking(false); }
  };
  const goWeek=(delta:number)=>{ if (working || pending) return; setLoaded(false); setStatus("Učitavanje rasporeda…"); setWeek(moveWeek(week,delta)); };

  if ((!data.employees.length || !data.roles.length || !data.shifts.length || !data.requirements.length) && !pending && !working)
    return <div className="schedule-empty"><span className="eyebrow">RASPORED</span><h2>Pripremite podatke za generisanje.</h2><p>Potrebni su zaposleni, uloge, smene, dostupnost i potrebna pokrivenost.</p>{navigate && <div className="step-list"><Button className="step" onClick={() => navigate("team")}>Tim i uloge →</Button><Button className="step" onClick={() => navigate("availability")}>Dostupnost →</Button><Button className="step" onClick={() => navigate("settings")}>Smene i potrebe →</Button></div>}</div>;
  if (!loaded) return <div className="panel" role="status">{error || "Učitavanje rasporeda…"} {error && <Button onClick={()=>void refresh()}>Pokušaj ponovo</Button>}</div>;
  const slots = state.slots.length ? state.slots : (() => { try { return expandDemand(input); } catch { return []; } })();
  const dates=Array.from({length:7},(_,i)=>Temporal.PlainDate.from(week).add({days:i}).toString());
  const visible=slots.filter((s) => !s.cancelled && (!role || s.roleId===role));
  const cancelledSlots=slots.filter((s) => s.cancelled && (!role || s.roleId===role));
  const activeSlots=slots.filter((s) => !s.cancelled);
  const coverage=activeSlots.filter((s)=>s.employeeId).length;
  const assignedHours=activeSlots.reduce((h,s)=>h+(s.employeeId ? (s.end-s.start)/3600000 : 0),0);
  const warnings=scheduleWarnings(input,slots);
  const renderSlot = (slot: Slot) => {
    const employee = data.employees.find((person) => person.id === slot.employeeId);
    const roleName = data.roles.find((item) => item.id === slot.roleId)?.name;
    return <article key={slot.id} id={`slot-${slot.id}`} tabIndex={-1} className={`shift-card ${slot.employeeId ? "filled" : "gap"}`} draggable={!!slot.employeeId && !slot.locked && !generating && !pending}
      onDragStart={() => { dragged.current = slot.id; }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); if (dragged.current && dragged.current !== slot.id) swapOrMove(dragged.current, slot.id); dragged.current = null; }}>
      <div className="shift-card-head"><strong>{timeLabel(slot.start, workspace.timezone)}–{timeLabel(slot.end, workspace.timezone)}{Temporal.Instant.fromEpochMilliseconds(slot.end).toZonedDateTimeISO(workspace.timezone).toPlainDate().toString() > slot.localDate ? " (+1 dan)" : ""}</strong><span>{roleName}</span></div>
      <div className="employee-name">{employee?.display_name ?? "Nepokriveno"}</div>
      <ShiftWarnings warnings={warnings.filter((warning)=>warning.slotIds.includes(slot.id))} />
      <ShiftOptions locked={slot.locked} title={`${dayLabel(slot.localDate)} · ${timeLabel(slot.start,workspace.timezone)} · ${employee?.display_name ?? "Nepokriveno"}`}><div className="shift-controls">
        <label>Zameni<select aria-label="Zameni" disabled={generating || !!pending || slot.locked} value={slot.employeeId ?? ""} onChange={(event) => change((all) => replace(input, all, slot.id, event.target.value || null), "replace")}>
          <option value="">Nepokriveno</option>
          {data.employees.map((person) => <option key={person.id} value={person.id}>{person.display_name}{person.active ? "" : " — neaktivan"}</option>)}
        </select></label>
        <label>Zameni mesta<select aria-label="Zameni mesta" disabled={generating || !!pending || slot.locked || !slot.employeeId} value="" onChange={(event) => { if (event.target.value) change((all) => swap(input, all, slot.id, event.target.value), "swap"); }}>
          <option value="">Izaberi smenu</option>{activeSlots.filter((item) => item.id !== slot.id && item.employeeId && !item.locked).map((item) => <option key={item.id} value={item.id}>{dayLabel(item.localDate)} {timeLabel(item.start, workspace.timezone)} · {data.employees.find((person) => person.id === item.employeeId)?.display_name}</option>)}
        </select></label>
        <Button type="button" disabled={generating || !!pending} onClick={() => change((all) => all.map((item) => item.id === slot.id ? { ...item, locked: !item.locked } : item), slot.locked ? "unlock" : "lock")}>{slot.locked ? "Otključaj" : "Zaključaj"}</Button>
        <Button type="button" disabled={generating || !!pending || slot.locked} onClick={() => change((all) => all.map((item) => item.id === slot.id ? { ...item, employeeId: null, cancelled: true } : item), "cancel_shift")}>Ukloni smenu</Button>
      </div></ShiftOptions>
    </article>;
  };
  return <div className="schedule-workspace">
    <div className="schedule-toolbar panel">
      <div className="week-controls"><Button disabled={working || !!pending} onClick={() => goWeek(-1)} aria-label="Prethodna nedelja"><CaretLeft size={20} /></Button><strong>{dayLabel(week)} – {dayLabel(dates[6])}</strong><Button disabled={working || !!pending} onClick={() => goWeek(1)} aria-label="Sledeća nedelja"><CaretRight size={20} /></Button></div>
      <div className="filter-actions"><select aria-label="Filter uloga" value={role} onChange={(e)=>setRole(e.target.value)}><option value="">Sve uloge</option>{data.roles.map((r)=><option key={r.id} value={r.id}>{r.name}</option>)}</select><details onKeyDown={(event)=>{if(event.key==="Escape"){event.currentTarget.open=false;event.currentTarget.querySelector("summary")?.focus();}}}><summary>Još</summary><div><Button onClick={() => window.print()}>Štampaj / PDF</Button></div></details></div>
      <div className="schedule-actions"><Button variant="default" disabled={working || !!pending} onClick={generateWeek}>Generiši</Button>{generating && <Button onClick={cancel}>Otkaži</Button>}<Button disabled={working || !!pending || !state.revision || coverage!==activeSlots.length} onClick={() => void publish()}>Objavi ažuriranje</Button></div>
      {coverage!==activeSlots.length && <p className="subtle">Za objavu dodelite zaposlenog svim aktivnim smenama.</p>}
    </div>
    <div className="schedule-summary panel" aria-label="Sažetak nedelje"><div><strong>{coverage} / {activeSlots.length}</strong><span>Pokrivenost</span></div><div><strong>{assignedHours.toFixed(1)} h</strong><span>Dodeljeni sati</span></div><div><strong>{state.publishedRevision ?? "—"}</strong><span>Objavljena revizija</span></div></div>
    <div className="schedule-feedback" role="status">{status}{progress>0 && generating ? ` (${progress} koraka)` : ""}</div>
    {state.slots.length>0 && <p role="status">{coverage!==activeSlots.length ? "Raspored nije potpuno popunjen." : warnings.length ? "Raspored je popunjen uz upozorenja." : "Raspored je popunjen."}</p>}
    {result?.status === "complete" && result.optimizationLimited && <p className="notice warning">Raspored je popunjen; dostignut je limit pretrage za smanjenje odstupanja. Manji broj odstupanja nije dokazan.</p>}
    {state.revision!==state.publishedRevision && <p className="manual-rule-note">Nacrt je odvojen od objave. {state.publishedRevision ? "Tim i dalje vidi prethodnu objavljenu reviziju." : "Tim još nema objavljen raspored za ovu nedelju."}</p>}
    {warnings.length>0 && <div className="notice warning" role="status"><WarningCircle size={20} aria-hidden /><strong>{working ? "Čuvanje…" : pending ? "Izmena nije sačuvana." : "Proverite raspored."} Upozorenja za celu nedelju: {warnings.length}.</strong><p>{warnings.slice(0,2).map((warning)=>warning.message).join(" ")}</p><details><summary>Prikaži sva upozorenja ({warnings.length})</summary><ul>{warnings.map((warning)=><li key={warning.id}>{warning.message} <Button variant="link" onClick={()=>{const target=slots.find((slot)=>warning.slotIds.includes(slot.id));if(target){setRole("");setDay(dates.indexOf(target.localDate));requestAnimationFrame(()=>document.getElementById(`slot-${target.id}`)?.focus());}}}>Prikaži smenu</Button></li>)}</ul></details></div>}
    {!warnings.length && !working && state.revision>0 && !error && <p className="notice success" role="status"><CheckCircle size={20} aria-hidden />Nema upozorenja za trenutne dodele.</p>}
    {error && <div className="notice error" role="alert">{error} {pending && <Button disabled={working} onClick={() => void drain()}>Pokušaj ponovo</Button>} <Button disabled={working} onClick={() => { if (queue.current.length) { setError("Predlog nije sačuvan. Nastavite čuvanje ili izričito odbacite predlog pre učitavanja."); return; } void refresh(); }}>Učitaj sa servera</Button>{pending && <Button disabled={working} onClick={() => { if (window.confirm("Odbaciti sve nesačuvane izmene ove nedelje i učitati raspored sa servera?")) { queue.current=[]; setPending(null); void refresh(); } }}>Odbaci nesačuvani predlog</Button>}</div>}
    {result && result.issues.length>0 && <div className="notice error" role="status">{result.status==="invalid" ? "Proverite zaključane smene pre generisanja." : result.status==="limit" ? "Pretraga je dostigla granicu; nepokrivenost nije dokaz neizvodljivosti." : "Nepotpuna pokrivenost."} {result.issues.length} {result.status==="invalid" ? "problema sa zaključanim smenama." : "mesta bez dodele."} {result.issues.slice(0,3).map((i)=>i.reason).join("; ")}</div>}
    {undo && <Button variant="link" className="text-button undo-button" disabled={working || !!pending} onClick={() => { const previous=state.slots; void commit(undo,"undo",previous); setUndo(null); }}>Poništi poslednju izmenu</Button>}
    <div className="mobile-day-select" role="group" aria-label="Dan u nedelji">{dates.map((d,i)=><Button key={d} aria-pressed={day===i} onClick={(event)=>{setDay(i);event.currentTarget.scrollIntoView({block:"nearest",inline:"nearest"});}}><span>{["pon","uto","sre","čet","pet","sub","ned"][i]}</span><span>{Temporal.PlainDate.from(d).day}</span></Button>)}</div>
    <h2 className="print-title">Raspored: {dayLabel(week)} – {dayLabel(dates[6])}</h2>
    <div className="week-grid">{dates.map((date, index) => <section key={date} className={"day-column " + (day === index ? "selected" : "")}>
      <h3>{dayLabel(date)}</h3>
      <div className="day-slots">
        {visible.filter((slot) => slot.localDate === date).map(renderSlot)}
        {cancelledSlots.filter((slot) => slot.localDate === date).map((slot) => <Button type="button" className="add-shift-button" key={slot.id} disabled={generating || !!pending} onClick={() => change((all) => all.map((item) => item.id === slot.id ? { ...item, cancelled: false } : item), "restore_shift")}>+ Dodaj smenu · {timeLabel(slot.start, workspace.timezone)} · {data.roles.find((item) => item.id === slot.roleId)?.name}</Button>)}
        {!visible.some((slot) => slot.localDate === date) && !cancelledSlots.some((slot) => slot.localDate === date) && <p className="empty-hint">{role && slots.some((slot)=>slot.localDate===date && !slot.cancelled) ? "Filter nema rezultate za ovaj dan." : "Nema potrebnih smena."}</p>}
      </div>
    </section>)}</div>
    <TeamLinkPanel workspaceId={workspace.id} />
  </div>;
}
