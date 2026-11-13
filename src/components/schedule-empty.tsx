import { Button } from "@/components/ui/button";
import type { SetupData } from "@/lib/types";
export function ScheduleEmpty({ data, navigate }: { data: SetupData; navigate: (view: "team" | "availability" | "settings") => void }) {
  const steps = [
    { label: "Tim i uloge", ready: data.employees.length > 0 && data.roles.length > 0 && data.employeeRoles.length > 0, view: "team" as const, detail: `${data.employees.length} zaposlenih · ${data.roles.length} uloga` },
    { label: "Dostupnost", ready: data.windows.length > 0, view: "availability" as const, detail: `${data.windows.length} nedeljnih prozora` },
    { label: "Smene i potrebe", ready: data.shifts.length > 0 && data.requirements.length > 0, view: "settings" as const, detail: `${data.shifts.length} smena · ${data.requirements.length} potreba` },
  ];
  return <div className="schedule-empty"><div className="hero-orb">✳</div><span className="eyebrow">FAZA 1 / PRIPREMA</span><h2>Pripremite osnovu za dobar raspored.</h2><p>Unesite tim, dostupnost i potrebnu pokrivenost. Generisanje rasporeda stiže u sledećoj fazi.</p><div className="step-list">{steps.map((step, index) => <Button key={step.label} className="step" onClick={() => navigate(step.view)}><span className={`step-index ${step.ready ? "done" : ""}`}>{step.ready ? "✓" : `0${index + 1}`}</span><span><strong>{step.label}</strong><small>{step.detail}</small></span><span className="step-arrow">↗</span></Button>)}</div></div>;
}
