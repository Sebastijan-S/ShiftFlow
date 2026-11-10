import { Temporal } from "@js-temporal/polyfill";
import type { SetupData } from "@/lib/types";

export type Slot = { id: string; localDate: string; roleId: string; shiftId: string; start: number; end: number; employeeId: string | null; locked: boolean; cancelled?: boolean };
export type Assignment = Pick<Slot, "id" | "employeeId" | "locked">;
export type ScheduleInput = { weekStart: string; timezone: string; setup: SetupData; adjacent: Slot[]; existing: Slot[] };
export type Issue = { slotId: string; reason: string };
export type Result = { status: "complete" | "incomplete" | "limit" | "cancelled" | "invalid"; slots: Slot[]; issues: Issue[]; nodes: number; elapsedMs: number; coverage: number; targetDeviation: number };

const date = (value: string) => Temporal.PlainDate.from(value);
const weekday = (value: string) => date(value).dayOfWeek % 7;
const instantCache = new Map<string, number>();
const localInstant = (day: string, time: string, zone: string): number => {
  if (time.startsWith("24:00")) return localInstant(addDate(day, 1), "00:00:00", zone);
  const key = `${day}|${time}|${zone}`;
  const cached = instantCache.get(key);
  if (cached !== undefined) return cached;
  const plain = Temporal.PlainDateTime.from(`${day}T${time.slice(0, 8)}`);
  const value = plain.toZonedDateTime(zone, { disambiguation: "reject" }).epochMilliseconds;
  instantCache.set(key, value);
  return value;
};
const clock = (value: string) => { const [h, m, s] = value.split(":").map(Number); return h * 60 + m + (s || 0) / 60; };
const addDate = (day: string, amount: number) => date(day).add({ days: amount }).toString();

export function expandDemand(input: ScheduleInput): Slot[] {
  if (weekday(input.weekStart) !== 1) throw new Error("Week must start on Monday.");
  const slots: Slot[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const localDate = addDate(input.weekStart, offset);
    const matching = input.setup.requirements.filter((r) => r.local_date === localDate || (r.local_date === null && r.weekday === weekday(localDate) && !input.setup.requirements.some((d) => d.local_date === localDate && d.role_id === r.role_id && d.shift_template_id === r.shift_template_id)));
    for (const requirement of matching) {
      const shift = input.setup.shifts.find((s) => s.id === requirement.shift_template_id);
      if (!shift) throw new Error("Staffing requirement refers to a missing shift.");
      const endDay = clock(shift.end_time) <= clock(shift.start_time) ? addDate(localDate, 1) : localDate;
      const start = localInstant(localDate, shift.start_time, input.timezone);
      const end = localInstant(endDay, shift.end_time, input.timezone);
      for (let index = 0; index < requirement.required_count; index++) slots.push({ id: `${localDate}:${requirement.id}:${index}`, localDate, roleId: requirement.role_id, shiftId: shift.id, start, end, employeeId: null, locked: false });
    }
  }
  return slots.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}

function available(input: ScheduleInput, slot: Slot, employeeId: string): boolean {
  // Recurring windows are local calendar intervals. Adjacent-day windows may cover overnight shifts.
  const intervals: { start: number; end: number }[] = [];
  for (let delta = -1; delta <= 1; delta++) {
    const day = addDate(slot.localDate, delta);
    for (const window of input.setup.windows.filter((w) => w.employee_id === employeeId && w.weekday === weekday(day))) {
      intervals.push({ start: localInstant(day, window.start_time, input.timezone), end: localInstant(day, window.end_time, input.timezone) });
    }
  }
  intervals.sort((a, b) => a.start - b.start);
  let covered = slot.start;
  for (const interval of intervals) if (interval.start <= covered) covered = Math.max(covered, interval.end);
  if (covered < slot.end) return false;
  for (const exception of input.setup.exceptions.filter((e) => e.employee_id === employeeId)) {
    const start = localInstant(exception.local_date, exception.start_time ?? "00:00:00", input.timezone);
    const end = localInstant(exception.start_time ? exception.local_date : addDate(exception.local_date, 1), exception.end_time ?? "00:00:00", input.timezone);
    if (start < slot.end && end > slot.start) return false;
  }
  return true;
}

export function violation(input: ScheduleInput, slot: Slot, employeeId: string, assigned: Slot[], availabilityCache?: Map<string, boolean>): string | null {
  const employee = input.setup.employees.find((e) => e.id === employeeId);
  if (!employee?.active) return "inactive or missing employee";
  try {
    const key = `${slot.id}|${employeeId}`;
    let allowed = availabilityCache?.get(key);
    if (allowed === undefined) { allowed = available(input, slot, employeeId); availabilityCache?.set(key, allowed); }
    if (!allowed) return "unavailable interval";
  } catch { return "invalid local time or availability"; }
  const own = [...input.adjacent, ...assigned].filter((s) => s.employeeId === employeeId && s.id !== slot.id);
  const rest = (input.setup.rules?.min_rest_hours ?? 11) * 3_600_000;
  for (const other of own) {
    if (slot.start < other.end && slot.end > other.start) return "overlap";
    if (slot.start >= other.end && slot.start - other.end < rest || other.start >= slot.end && other.start - slot.end < rest) return "minimum rest";
  }
  const maxWeekly = (input.setup.rules?.max_weekly_hours ?? 48) * 3_600_000;
  for (let offset = -1; offset <= 1; offset++) {
    const weekStart = localInstant(addDate(input.weekStart,offset*7), "00:00:00", input.timezone);
    const weekEnd = localInstant(addDate(input.weekStart,(offset+1)*7), "00:00:00", input.timezone);
    const weekly = [...own, slot].reduce((sum, s) => sum + Math.max(0, Math.min(s.end, weekEnd) - Math.max(s.start, weekStart)), 0);
    if (weekly > maxWeekly) return "weekly hour limit";
  }
  const maxDaily = (input.setup.rules?.max_daily_hours ?? 12) * 3_600_000;
  for (let day = -1; day <= 7; day++) {
    const from = localInstant(addDate(input.weekStart, day), "00:00:00", input.timezone);
    const to = localInstant(addDate(input.weekStart, day + 1), "00:00:00", input.timezone);
    const hours = [...own, slot].reduce((sum, s) => sum + Math.max(0, Math.min(s.end, to) - Math.max(s.start, from)), 0);
    if (hours > maxDaily) return "daily hour limit";
  }
  return null;
}

export function validateSchedule(input: ScheduleInput, slots: Slot[], enforceRules = true): Issue[] {
  if (!enforceRules) return [];
  const issues: Issue[] = [];
  for (const slot of slots) if (slot.employeeId) {
    const reason = violation(input, slot, slot.employeeId, slots);
    if (reason) issues.push({ slotId: slot.id, reason });
  }
  return issues;
}

export function replace(input: ScheduleInput, slots: Slot[], id: string, employeeId: string | null): Slot[] {
  const target = slots.find((s) => s.id === id);
  if (!target) throw new Error("Assignment not found.");
  if (target.cancelled) throw new Error("Restore the shift before assigning an employee.");
  if (target.locked) throw new Error("Unlock this assignment first.");
  const next = slots.map((s) => s.id === id ? { ...s, employeeId } : s);
  const issues = validateSchedule(input, next, false);
  if (issues.length) throw new Error(issues[0].reason);
  return next;
}

export function swap(input: ScheduleInput, slots: Slot[], first: string, second: string): Slot[] {
  const a = slots.find((s) => s.id === first), b = slots.find((s) => s.id === second);
  if (!a || !b || !a.employeeId || !b.employeeId || a.locked || b.locked) throw new Error("Both assignments must be filled and unlocked.");
  if (a.cancelled || b.cancelled) throw new Error("Restore the shift before swapping.");
  const next = slots.map((s) => s.id === first ? { ...s, employeeId: b.employeeId } : s.id === second ? { ...s, employeeId: a.employeeId } : s);
  const issues = validateSchedule(input, next, false);
  if (issues.length) throw new Error(`${issues[0].slotId}: ${issues[0].reason}`);
  return next;
}

export function generate(input: ScheduleInput, options: { maxNodes?: number; signal?: AbortSignal; onProgress?: (nodes: number) => void } = {}): Result {
  const began = performance.now(); const limit = options.maxNodes ?? 250_000;
  const allDemand = expandDemand(input);
  const cancelled = input.existing.filter((slot) => slot.cancelled && allDemand.some((item) => item.id === slot.id));
  const demand = allDemand.filter((slot) => !cancelled.some((item) => item.id === slot.id));
  const locked = input.existing.filter((s) => s.locked);
  const invalid = validateSchedule(input, locked);
  for (const slot of locked) {
    const required = demand.find((s) => s.id === slot.id);
    if (!slot.employeeId || !required || required.start !== slot.start || required.end !== slot.end || required.roleId !== slot.roleId || required.shiftId !== slot.shiftId)
      invalid.push({slotId:slot.id,reason:"Locked assignment no longer matches demand"});
  }
  if (invalid.length) return { status: "invalid", slots: input.existing, issues: invalid, nodes: 0, elapsedMs: performance.now() - began, coverage: 0, targetDeviation: 0 };
  const open = demand.filter((s) => !locked.some((l) => l.id === s.id));
  const availabilityCache = new Map<string, boolean>();
  const staticCandidates = new Map(open.map((s) => [s.id, input.setup.employees.filter((e) => !violation(input, s, e.id, locked, availabilityCache)).map((e) => e.id)]));
  open.sort((a, b) => (staticCandidates.get(a.id)!.length - staticCandidates.get(b.id)!.length) || a.start - b.start || a.id.localeCompare(b.id));
  let nodes = 0, best = locked.slice(), stopped = false;
  const hours = (employeeId: string, slots: Slot[]) => slots.filter((s) => s.employeeId === employeeId).reduce((h, s) => h + (s.end - s.start) / 3_600_000, 0);
  const score = (slots: Slot[]) => input.setup.employees.reduce((sum, e) => sum + Math.abs(hours(e.id, slots) - e.target_hours), 0);
  const late = (slot: Slot) => clock(input.setup.shifts.find((s) => s.id === slot.shiftId)?.start_time ?? "00:00") >= 12*60;
  const rank = (employeeId: string, slot: Slot, slots: Slot[]) => {
    const employee = input.setup.employees.find((e) => e.id === employeeId)!;
    const targetGap = hours(employeeId, slots) - employee.target_hours;
    const lateCount = late(slot) ? slots.filter((s) => s.employeeId === employeeId && late(s)).length : 0;
    const preferencePenalty = employee.preference === "none" ? 0 : (employee.preference === "late") === late(slot) ? 0 : 1;
    return targetGap * 100 + lateCount * 3 + preferencePenalty;
  };
  let bestScore = Infinity;
  function search(index: number, current: Slot[]) {
    if (options.signal?.aborted || nodes >= limit) { stopped = true; return; }
    nodes++; if (nodes % 1000 === 0) options.onProgress?.(nodes);
    if (current.length > best.length || current.length === best.length && score(current) < bestScore) { best = current.slice(); bestScore = score(current); }
    if (best.length === demand.length || index === open.length || current.length + open.length - index < best.length) return;
    const slot = open[index];
    const candidates = staticCandidates.get(slot.id)!.filter((id) => !violation(input, slot, id, current, availabilityCache));
    candidates.sort((a, b) => rank(a,slot,current) - rank(b,slot,current) || a.localeCompare(b));
    for (const employeeId of candidates) { search(index + 1, [...current, { ...slot, employeeId }]); if (stopped || best.length === demand.length) return; }
    if (best.length < demand.length) search(index + 1, current);
  }
  search(0, locked);
  const slots = [...demand.map((s) => best.find((b) => b.id === s.id) ?? s), ...cancelled].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  const issues = slots.filter((s) => !s.cancelled && !s.employeeId).map((s) => ({ slotId: s.id, reason: staticCandidates.get(s.id)?.length ? "No compatible assignment with other shifts and limits" : "No eligible, available employee" }));
  return { status: options.signal?.aborted ? "cancelled" : issues.length === 0 ? "complete" : stopped ? "limit" : "incomplete", slots, issues, nodes, elapsedMs: performance.now() - began, coverage: demand.length ? best.length / demand.length : 1, targetDeviation: score(best) };
}
