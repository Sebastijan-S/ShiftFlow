export type Position = "Barista" | "Konobar" | "Menadžer";
export type Severity = "warning" | "block";
export interface Employee {
  id: string; name: string; initials: string; color: string; positions: Position[];
  targetHours: number; active: boolean; daysOff: number[]; preferredShift?: string;
}
export interface ShiftTemplate { id: string; name: string; start: string; end: string; color: string }
export interface Assignment { id: string; employeeId: string; day: number; templateId: string; position: Position; locked: boolean; note: string }
export interface Rules { minRestHours: number; maxWeeklyHours: number; restSeverity: Severity; hoursSeverity: Severity; allowMultiple: boolean }
export interface Requirement { day: number; templateId: string; position: Position; count: number }
export interface Schedule { week: string; status: "draft" | "published"; assignments: Assignment[]; publishedAt?: string }
export interface Workspace { name: string; employees: Employee[]; templates: ShiftTemplate[]; rules: Rules; requirements: Requirement[]; schedules: Record<string, Schedule> }
export interface Conflict { id: string; severity: Severity; message: string; employeeId?: string; day?: number }
export const DAY_NAMES = ["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja"];
export function minutes(time: string) { const [h, m] = time.split(":").map(Number); return h * 60 + m; }
export function duration(template: ShiftTemplate) { return ((minutes(template.end) - minutes(template.start) + 1440) % 1440 || 1440) / 60; }
export function interval(a: Assignment, templates: ShiftTemplate[]) {
  const t = templates.find(t => t.id === a.templateId)!;
  const start = a.day * 1440 + minutes(t.start);
  return { start, end: start + duration(t) * 60 };
}
export function hoursFor(assignments: Assignment[], employeeId: string, templates: ShiftTemplate[]) {
  return assignments.filter(a => a.employeeId === employeeId).reduce((h, a) => h + duration(templates.find(t => t.id === a.templateId)!), 0);
}
export function monday(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (part: string) => parts.find(p => p.type === part)!.value;
  const d = new Date(`${value("year")}-${value("month")}-${value("day")}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}
export function addDays(date: string, count: number) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10); }
export function weekDates(week: string) { return DAY_NAMES.map((_, i) => new Date(`${addDays(week, i)}T12:00:00Z`)); }
export function neighborAssignments(workspace: Workspace, week: string): Assignment[] {
  return [-7, 7].flatMap(offset => (workspace.schedules[addDays(week, offset)]?.assignments ?? []).map(a => ({ ...a, day: a.day + offset })));
}
export function assignmentConflicts(a: Assignment, assignments: Assignment[], w: Workspace, adjacent: Assignment[] = []): Conflict[] {
  const conflicts: Conflict[] = [];
  const employee = w.employees.find(e => e.id === a.employeeId);
  const template = w.templates.find(t => t.id === a.templateId);
  const push = (id: string, message: string, severity: Severity = "block") => conflicts.push({ id: `${a.id}-${id}`, message, severity, employeeId: a.employeeId, day: a.day });
  if (!employee || !template) { push("missing", "Zaposleni ili smena više ne postoji."); return conflicts; }
  if (!employee.active) push("inactive", `${employee.name} nije aktivan član tima.`);
  if (!employee.positions.includes(a.position)) push("position", `${employee.name} nema poziciju ${a.position.toLowerCase()}.`);
  if (employee.daysOff.includes(a.day)) push("off", `${employee.name} nije dostupan: ${DAY_NAMES[a.day].toLowerCase()}.`);
  const own = assignments.filter(b => b.employeeId === a.employeeId && b.id !== a.id);
  const ai = interval(a, w.templates);
  for (const b of [...own, ...adjacent.filter(b => b.employeeId === a.employeeId)]) {
    const bi = interval(b, w.templates);
    if (ai.start < bi.end && bi.start < ai.end) push(`overlap-${b.id}`, `${employee.name}: smene se vremenski preklapaju.`);
    else if (a.day === b.day && !w.rules.allowMultiple) push(`double-${b.id}`, `${employee.name}: dozvoljena je jedna smena dnevno.`);
    else {
      const rest = Math.max(ai.start - bi.end, bi.start - ai.end) / 60;
      if (rest < w.rules.minRestHours) push(`rest-${b.id}`, `${employee.name}: ${rest} h odmora, potrebno ${w.rules.minRestHours} h.`, w.rules.restSeverity);
    }
  }
  const hours = hoursFor([...own, a], employee.id, w.templates);
  if (hours > w.rules.maxWeeklyHours) push("hours", `${employee.name}: ${hours} h prelazi limit od ${w.rules.maxWeeklyHours} h.`, w.rules.hoursSeverity);
  return conflicts;
}
export function missingRequirements(assignments: Assignment[], requirements: Requirement[]) {
  return requirements.map(r => ({ ...r, missing: Math.max(0, r.count - assignments.filter(a => a.day === r.day && a.templateId === r.templateId && a.position === r.position).length) })).filter(r => r.missing > 0);
}
export function validateSchedule(schedule: Schedule, w: Workspace) {
  const adjacent = neighborAssignments(w, schedule.week);
  const all = schedule.assignments.flatMap(a => assignmentConflicts(a, schedule.assignments, w, adjacent));
  return [...new Map(all.map(c => [c.id, c])).values()];
}
// Reproducible multi-pass greedy search. Locked assignments remain unchanged.
// Each pass prioritizes constrained roles and scores fair hours/weekends/preferences.
export function generateSchedule(w: Workspace, week: string, keepLocked = true): Schedule {
  const locked = keepLocked ? (w.schedules[week]?.assignments ?? []).filter(a => a.locked) : [];
  const adjacent = neighborAssignments(w, week);
  const available = w.employees.filter(e => e.active);
  let best: Assignment[] = [...locked]; let bestScore = Infinity;
  for (let pass = 0; pass < 36; pass++) {
    const result = locked.map(a => ({ ...a }));
    const slots = w.requirements.flatMap(r => Array.from({ length: Math.max(0, r.count - locked.filter(a => a.day === r.day && a.templateId === r.templateId && a.position === r.position).length) }, (_, i) => ({ ...r, slot: i })));
    slots.sort((a, b) => a.day - b.day || available.filter(e => e.positions.includes(a.position)).length - available.filter(e => e.positions.includes(b.position)).length || a.templateId.localeCompare(b.templateId));
    for (const [index, slot] of slots.entries()) {
      const candidates = available.filter(e => e.positions.includes(slot.position)).map((e, ei) => {
        const assignment: Assignment = { id: `${week}-${slot.day}-${slot.templateId}-${slot.position}-${slot.slot}`, employeeId: e.id, day: slot.day, templateId: slot.templateId, position: slot.position, locked: false, note: "" };
        const conflicts = assignmentConflicts(assignment, result, w, adjacent);
        const hours = hoursFor(result, e.id, w.templates);
        const weekend = result.filter(a => a.employeeId === e.id && a.day >= 5).length;
        const tie = ((ei * 17 + pass * 13 + index * (pass + 3)) % 31) / 31;
        const score = hours / Math.max(e.targetHours, 8) * 30 + weekend * 5 + (e.preferredShift && e.preferredShift !== slot.templateId ? 4 : 0) + conflicts.length * 12 + tie * 4;
        return { assignment, conflicts, score };
      }).filter(c => !c.conflicts.some(c => c.severity === "block")).sort((a, b) => a.score - b.score || a.assignment.employeeId.localeCompare(b.assignment.employeeId));
      if (candidates[0]) result.push(candidates[0].assignment);
    }
    const hours = available.map(e => hoursFor(result, e.id, w.templates));
    const score = missingRequirements(result, w.requirements).reduce((s, r) => s + r.missing * 10000, 0) + hours.reduce((s, h) => s + h * h, 0) + result.reduce((s, a) => s + assignmentConflicts(a, result, w, adjacent).length * 10, 0);
    if (score < bestScore) { best = result; bestScore = score; }
  }
  return { week, status: "draft", assignments: best };
}
