"use client";

import { useState } from "react";
import { saveRow } from "@/lib/setup-data";
import type { SetupData } from "@/lib/types";

type Props = { workspaceId: string; data: SetupData; run: (action: () => Promise<unknown>) => Promise<void> };

export function TeamPanel({ workspaceId, data, run }: Props) {
  const [roleName, setRoleName] = useState("");
  const [name, setName] = useState("");
  const [target, setTarget] = useState(40);
  const [preference, setPreference] = useState("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPreference, setEditPreference] = useState("none");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(10);
  const employees = data.employees.filter((person) => person.display_name.toLocaleLowerCase("sr").includes(search.toLocaleLowerCase("sr")));
  return <div className="content-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">TIM</span><h2>Zaposleni</h2></div><span className="count">{data.employees.length} članova</span></div>
    <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void run(async () => { await saveRow("employees", { workspace_id: workspaceId, display_name: name.trim(), target_hours: target, preference }); setName(""); }); }}><label>Ime zaposlenog<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ime i prezime" /></label><label>Cilj sati / nedelja<input required type="number" min="0" max="168" step="0.25" value={target} onChange={(event) => setTarget(Number(event.target.value))} /></label><label>Preferencija<select value={preference} onChange={(event) => setPreference(event.target.value)}><option value="none">Bez preferencije</option><option value="early">Ranije smene</option><option value="late">Kasnije smene</option></select></label><button className="primary-button">Dodaj zaposlenog</button></form>
    <label className="employee-search">Pronađi zaposlenog<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setShown(10); }} placeholder="Pretraži tim" /></label>
    <div className="item-list">{!employees.length && <p className="empty-hint">Nema zaposlenih za ovu pretragu.</p>}{employees.slice(0, shown).map((employee) => <article className="item-card" key={employee.id}>
      <div className="item-main"><span className="avatar">{employee.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{employee.display_name}</strong><small>{employee.target_hours} h nedeljno · {employee.preference === "early" ? "ranije" : employee.preference === "late" ? "kasnije" : "bez preferencije"}</small></div></div>
      <div className="item-actions"><button type="button" className="text-button" onClick={() => { setEditingId(employee.id); setEditName(employee.display_name); setEditPreference(employee.preference); }}>Uredi</button><label className="inline-control">Aktivan <input type="checkbox" checked={employee.active} onChange={(event) => void run(() => saveRow("employees", { active: event.target.checked }, employee.id))} /></label><label className="inline-control">Cilj h <input className="small-number" aria-label={`Cilj sati za ${employee.display_name}`} type="number" min="0" max="168" step="0.25" defaultValue={employee.target_hours} key={`${employee.id}-${employee.target_hours}`} onBlur={(event) => { const value = Number(event.target.value); if (value !== employee.target_hours) void run(() => saveRow("employees", { target_hours: value }, employee.id)); }} /></label></div>
      {editingId === employee.id && <form className="edit-employee" onSubmit={(event) => { event.preventDefault(); void run(async () => { await saveRow("employees", { display_name: editName.trim(), preference: editPreference as "none" | "early" | "late" }, employee.id); setEditingId(null); }); }}><label>Ime<input required maxLength={120} value={editName} onChange={(event) => setEditName(event.target.value)} /></label><label>Preferencija<select value={editPreference} onChange={(event) => setEditPreference(event.target.value)}><option value="none">Bez preferencije</option><option value="early">Ranije smene</option><option value="late">Kasnije smene</option></select></label><button className="primary-button">Sačuvaj</button><button type="button" className="text-button" onClick={() => setEditingId(null)}>Otkaži</button></form>}
    </article>)}</div>
    {employees.length > shown && <button type="button" className="text-button show-more" onClick={() => setShown((current) => current + 25)}>Prikaži još ({employees.length - shown})</button>}
  </section><aside className="panel"><span className="eyebrow">OZNAKE SMENA</span><h2>Uloge</h2><p className="subtle">Ove oznake opisuju posao u smeni. Svaki aktivan član tima može da radi pod bilo kojom oznakom, ako je dostupan i poštuje pravila rada.</p><form className="inline-form" onSubmit={(event) => { event.preventDefault(); void run(async () => { await saveRow("roles", { workspace_id: workspaceId, name: roleName.trim() }); setRoleName(""); }); }}><label className="sr-only" htmlFor="role-name">Nova oznaka</label><input id="role-name" required maxLength={80} placeholder="Nova oznaka" value={roleName} onChange={(event) => setRoleName(event.target.value)} /><button className="primary-button">Dodaj</button></form><div className="tag-list">{data.roles.map((role) => <span className="tag" key={role.id}>{role.name}</span>)}</div></aside></div>;
}
