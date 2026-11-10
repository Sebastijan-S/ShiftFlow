"use client";

import { useEffect, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { monday, moveWeek } from "@/lib/scheduling/data";
import { supabaseBrowser } from "@/lib/supabase/browser";

type PublishedSlot = { date: string; start: string; end: string; employee: string; role: string };
type PublishedWeek = { weekStart: string; timezone: string; assignments: PublishedSlot[]; publishedAt: string };
export function TeamCalendar({token}:{token:string}) {
  const [week,setWeek] = useState(monday); const [published,setPublished] = useState<PublishedWeek|null>(null); const [loading,setLoading] = useState(true); const [error,setError] = useState("");
  useEffect(() => {
    let active=true;
    void supabaseBrowser().rpc("read_team_week",{p_token:token,p_week_start:week}).then(({data,error})=>{
      if (!active) return;
      if (error) setError("Kalendar trenutno nije dostupan.");
      else setPublished(data as PublishedWeek|null);
      setLoading(false);
    });
    return ()=>{active=false;};
  },[token,week]);
  const dates=Array.from({length:7},(_,i)=>Temporal.PlainDate.from(week).add({days:i}).toString());
  const label=(date:string)=>new Intl.DateTimeFormat("sr-Latn-RS",{weekday:"long",day:"numeric",month:"short"}).format(new Date(`${date}T12:00:00Z`));
  const changeWeek=(delta:number)=>{setLoading(true);setPublished(null);setError("");setWeek(moveWeek(week,delta));};
  return <main className="shared-calendar"><header><span className="brand">✳ ShiftFlow</span><span>Objavljeni raspored</span></header><div className="shared-head"><div><span className="eyebrow">RASPORED TIMA</span><h1>Nedelja od {label(week)}</h1></div><div className="week-controls"><button onClick={()=>changeWeek(-1)} aria-label="Prethodna nedelja">←</button><button onClick={()=>changeWeek(1)} aria-label="Sledeća nedelja">→</button><button onClick={()=>window.print()}>Štampaj / PDF</button></div></div>{loading ? <p>Učitavanje…</p> : error ? <p role="alert">{error}</p> : !published ? <p className="panel">Za ovu nedelju nema objavljenog rasporeda.</p> : <div className="shared-days">{dates.map((d)=><section className="panel" key={d}><h2>{label(d)}</h2>{published.assignments.filter((s)=>s.date===d).map((s,i)=><article className="shared-shift" key={`${s.start}-${i}`}><strong>{s.employee}</strong><span>{s.role}</span><time>{new Intl.DateTimeFormat("sr-Latn-RS",{hour:"2-digit",minute:"2-digit",timeZone:published.timezone}).format(new Date(s.start))}–{new Intl.DateTimeFormat("sr-Latn-RS",{hour:"2-digit",minute:"2-digit",timeZone:published.timezone}).format(new Date(s.end))}</time></article>)}{!published.assignments.some((s)=>s.date===d) && <p className="empty-hint">Nema smena.</p>}</section>)}</div>}</main>;
}
