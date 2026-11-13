"use client";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";

export function TaskTabs({ active, onChange, labels, children }: { active: number; onChange: (index: number) => void; labels: string[]; children: React.ReactNode[] }) {
  const id=useId(); const buttons=useRef<(HTMLButtonElement | null)[]>([]);
  return <><div className="tab-list" role="tablist" aria-label="Vrsta dostupnosti">{labels.map((label,index)=><Button key={label} variant="ghost" ref={(element)=>{buttons.current[index]=element;}} role="tab" id={`${id}-tab-${index}`} aria-selected={active===index} aria-controls={`${id}-panel-${index}`} tabIndex={active===index ? 0 : -1} onClick={()=>onChange(index)} onKeyDown={(event)=>{
    let next=index;
    if(event.key==="ArrowRight") next=(index+1)%labels.length;
    else if(event.key==="ArrowLeft") next=(index+labels.length-1)%labels.length;
    else if(event.key==="Home") next=0;
    else if(event.key==="End") next=labels.length-1;
    else return;
    event.preventDefault(); onChange(next); buttons.current[next]?.focus();
  }}>{label}</Button>)}</div>{children.map((child,index)=><div key={index} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={active!==index}>{child}</div>)}</>;
}
