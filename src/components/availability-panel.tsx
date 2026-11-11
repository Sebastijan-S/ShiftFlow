"use client";

import { useState } from "react";
import { removeRow, saveRow } from "@/lib/setup-data";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { weekdays, type SetupData } from "@/lib/types";

type Props = { workspaceId: string; data: SetupData; run: (action: () => Promise<unknown>) => Promise<void>; exceptionsOnly?: boolean };

export function AvailabilityPanel({ workspaceId, data, run, exceptionsOnly = false }: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [untilMidnight, setUntilMidnight] = useState(false);
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(3);
  const [absenceEmployee, setAbsenceEmployee] = useState("");
  const [date, setDate] = useState("");
  const [wholeDay, setWholeDay] = useState(true);
  const [absenceStart, setAbsenceStart] = useState("09:00");
  const [absenceEnd, setAbsenceEnd] = useState("12:00");
  const [reason, setReason] = useState("");
  const people = [...data.employees].sort((a, b) => a.display_name.localeCompare(b.display_name, "sr"));
  const matches = people.filter((person) => person.display_name.toLocaleLowerCase("sr").includes(search.toLocaleLowerCase("sr")));
  const activePerson = people.find((person) => person.id === employeeId);
  const windows = data.windows.filter((window) => window.employee_id === employeeId).sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
  const toggleDay = (day: number) => setDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day]);

  return <div className={exceptionsOnly ? "exceptions-layout" : "availability-layout"}>
    {!exceptionsOnly && <section className="panel">
      <span className="eyebrow">PONAVLJA SE NEDELJNO</span><h2>Dostupnost po zaposlenom</h2>
      <p className="subtle">Izaberite ime, označite dane i unesite vreme. Za noćnu smenu dodajte dostupnost do 24:00 i od 00:00 narednog dana.</p>
      <label className="employee-search">Pronađi zaposlenog<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setShown(3); }} placeholder="Pretraži tim" /></label>
      <div className="availability-roster" aria-label="Izaberite zaposlenog">{matches.slice(0, shown).map((person) => <button type="button" key={person.id} className={employeeId === person.id ? "selected" : ""} aria-pressed={employeeId === person.id} onClick={() => { setEmployeeId(person.id); setAbsenceEmployee(person.id); setDays([]); }}><strong>{person.display_name}</strong><span>{data.windows.filter((window) => window.employee_id === person.id).length} prozora</span></button>)}</div>
      {matches.length > shown && <button type="button" className="text-button show-more" onClick={() => setShown((current) => current + 25)}>Prikaži još ({matches.length - shown})</button>}
      {!matches.length && <p className="empty-hint">Nema zaposlenih za ovu pretragu.</p>}
      {activePerson && <div className="availability-editor"><h3>{activePerson.display_name}</h3><form onSubmit={(event) => {
        event.preventDefault();
        const finish = untilMidnight ? "24:00" : end;
        if (!days.length || start >= finish) return;
        void run(async () => {
          const rows = days.filter((day) => !windows.some((window) => window.weekday === day && window.start_time.slice(0, 5) === start && window.end_time.slice(0, 5) === finish)).map((weekday) => ({ workspace_id: workspaceId, employee_id: employeeId, weekday, start_time: start, end_time: finish }));
          if (rows.length) { const result = await supabaseBrowser().from("availability_windows").insert(rows); if (result.error) throw result.error; }
          setDays([]);
        });
      }}>
        <fieldset className="weekday-picker"><legend>Dani kada može da radi</legend><div>{weekdays.map((day, index) => <label key={day} className={days.includes(index) ? "selected" : ""}><input type="checkbox" checked={days.includes(index)} onChange={() => toggleDay(index)} />{day}</label>)}</div></fieldset>
        <div className="form-grid"><label>Od<input required type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>Do<input required type="time" min={start} disabled={untilMidnight} value={end} onChange={(event) => setEnd(event.target.value)} /></label><label className="inline-control full-row"><input type="checkbox" checked={untilMidnight} onChange={(event) => setUntilMidnight(event.target.checked)} /> Do kraja dana (24:00)</label></div>
        <button className="primary-button" disabled={!days.length}>Dodaj za označene dane</button>
      </form>
      <div className="availability-table-wrap"><table className="availability-table"><caption>Uneti prozori za {activePerson.display_name}</caption><thead><tr><th>Dan</th><th>Vreme</th><th><span className="sr-only">Radnja</span></th></tr></thead><tbody>{windows.map((window) => <tr key={window.id}><td>{weekdays[window.weekday]}</td><td>{window.start_time.slice(0, 5)}–{window.end_time.slice(0, 5)}</td><td><button type="button" className="text-button" onClick={() => void run(() => removeRow("availability_windows", window.id))}>Ukloni</button></td></tr>)}</tbody></table>{!windows.length && <p className="empty-hint">Nema unetih dana za ovog zaposlenog.</p>}</div></div>}
    </section>}
    <section className="panel"><span className="eyebrow">KONKRETAN DATUM</span><h2>Odsustva i izuzeci</h2><p className="subtle">Ceo dan ili samo deo dana. Razlog ostaje privatan.</p><form className="form-grid" onSubmit={(event) => { event.preventDefault(); if (!wholeDay && absenceStart >= absenceEnd) return; void run(async () => { await saveRow("availability_exceptions", { workspace_id: workspaceId, employee_id: absenceEmployee, local_date: date, start_time: wholeDay ? null : absenceStart, end_time: wholeDay ? null : absenceEnd, reason: reason.trim() || null }); setReason(""); }); }}><label>Zaposleni<select required value={absenceEmployee} onChange={(event) => setAbsenceEmployee(event.target.value)}><option value="">Izaberite</option>{people.map((person) => <option key={person.id} value={person.id}>{person.display_name}</option>)}</select></label><label>Datum<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="inline-control full-row"><input type="checkbox" checked={wholeDay} onChange={(event) => setWholeDay(event.target.checked)} /> Ceo dan</label>{!wholeDay && <><label>Od<input type="time" required value={absenceStart} onChange={(event) => setAbsenceStart(event.target.value)} /></label><label>Do<input type="time" required min={absenceStart} value={absenceEnd} onChange={(event) => setAbsenceEnd(event.target.value)} /></label></>}<label className="full-row">Privatna napomena<input maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Opciono" /></label><button className="primary-button">Dodaj izuzetak</button></form><div className="item-list">{!data.exceptions.length && <p className="empty-hint">Nema datuma sa izuzecima.</p>}{data.exceptions.map((exception) => <div className="list-row" key={exception.id}><span><strong>{people.find((person) => person.id === exception.employee_id)?.display_name ?? "Zaposleni"}</strong><small>{exception.local_date} · {exception.start_time ? `${exception.start_time.slice(0, 5)}–${exception.end_time?.slice(0, 5)}` : "Ceo dan"}</small></span><button type="button" className="text-button" onClick={() => void run(() => removeRow("availability_exceptions", exception.id))}>Ukloni</button></div>)}</div></section>
  </div>;
}
