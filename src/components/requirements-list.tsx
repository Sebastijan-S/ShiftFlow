"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { removeRow } from "@/lib/setup-data";
import { weekdays, type SetupData } from "@/lib/types";

export function RequirementsList({ data, run, addedId }: { data: SetupData; run: (action: () => Promise<unknown>) => Promise<void>; addedId: string | null }) {
  const [expanded,setExpanded]=useState(false), [removing,setRemoving]=useState<string | null>(null);
  const root=useRef<HTMLDivElement>(null), toggle=useRef<HTMLButtonElement>(null), focusAfter=useRef<string | null>(null);
  const needs=[...data.requirements].sort((a,b)=>{
    const day=(need: typeof a)=>need.local_date ?? `weekly-${(need.weekday!+6)%7}`;
    const time=(id: string)=>data.shifts.find((s)=>s.id===id)?.start_time ?? "";
    const role=(id: string)=>data.roles.find((r)=>r.id===id)?.name ?? "";
    return day(a).localeCompare(day(b)) || time(a.shift_template_id).localeCompare(time(b.shift_template_id)) || role(a.role_id).localeCompare(role(b.role_id),"sr") || a.id.localeCompare(b.id);
  });
  const shown=expanded ? needs : needs.slice(0,3), hidden=needs.length-shown.length;
  useEffect(()=>{
    if (!focusAfter.current) return;
    const button=root.current?.querySelector<HTMLButtonElement>(`[data-need-id="${focusAfter.current}"]`);
    if(button) { button.focus({preventScroll:true}); focusAfter.current=null; }
  },[data.requirements]);
  async function remove(id: string) {
    if(removing) return;
    setRemoving(id);
    let removed=false;
    const index=shown.findIndex((need)=>need.id===id);
    await run(async()=>{
      await removeRow("staffing_requirements",id);
      removed=true;
      const remaining=needs.filter((need)=>need.id!==id), next=remaining[Math.min(index,remaining.length-1)];
      focusAfter.current=next?.id ?? null;
      if(!next) root.current?.querySelector<HTMLElement>("h2")?.focus({preventScroll:true});
    });
    setRemoving(null);
    if(!removed) requestAnimationFrame(()=>root.current?.querySelector<HTMLButtonElement>(`[data-need-id="${id}"]`)?.focus({preventScroll:true}));
  }
  function collapse() {
    setExpanded(false); toggle.current?.focus({preventScroll:true});
    const heading=root.current?.querySelector("h2");
    if(heading && heading.getBoundingClientRect().top<0) heading.scrollIntoView({block:"start"});
  }
  return <div ref={root}><h2 tabIndex={-1}>Potrebni ljudi · {needs.length} ukupno</h2>
    {hidden>0 && <p className="subtle">Prikazano {shown.length} od {needs.length}</p>}
    {addedId && <div className="notice success" role="status"><CheckCircle size={20} aria-hidden />Potreba je dodata.{hidden>0 && !shown.some((need)=>need.id===addedId) && needs.some((need)=>need.id===addedId) && <Button variant="link" onClick={()=>{setExpanded(true); requestAnimationFrame(()=>{const target=root.current?.querySelector<HTMLButtonElement>(`[data-need-id="${addedId}"]`);target?.focus();target?.scrollIntoView({block:"nearest"});});}}>Prikaži dodatu stavku</Button>}</div>}
    <div id="staffing-needs" className="item-list">{!needs.length && <p className="empty-hint">Nema unetih potreba.</p>}{shown.map((need)=><div className="list-row" key={need.id} aria-busy={removing===need.id}>
      <span><strong>{data.roles.find((role)=>role.id===need.role_id)?.name} · {data.shifts.find((shift)=>shift.id===need.shift_template_id)?.name}</strong><small>{need.weekday===null ? need.local_date : weekdays[need.weekday]} · {need.required_count} ljudi</small></span>
      <Button variant="link" data-need-id={need.id} disabled={!!removing} onClick={()=>void remove(need.id)}>{removing===need.id ? "Uklanjanje…" : "Ukloni"}</Button>
    </div>)}</div>
    {needs.length>3 && <Button ref={toggle} className="show-more" aria-expanded={expanded} aria-controls="staffing-needs" onClick={()=>expanded ? collapse() : setExpanded(true)}>{expanded ? "Prikaži manje" : `Prikaži još ${hidden}`}</Button>}
  </div>;
}
