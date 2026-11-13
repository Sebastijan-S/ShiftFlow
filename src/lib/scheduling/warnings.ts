import { Temporal } from "@js-temporal/polyfill";
import { addDate, localInstant, overlappingAbsences, recurringAvailable, type ScheduleInput, type Slot } from "./engine";

export type WarningKind = "multiple_shifts" | "absence" | "weekly_unavailable" | "overlap" | "rest" | "daily_hours" | "weekly_hours" | "inactive" | "invalid_time";
export type ScheduleWarning = { id: string; kind: WarningKind; employeeId: string; slotIds: string[]; message: string };
const hour = 3_600_000;
const duration = (slot: Slot, from: number, to: number) => Math.max(0, Math.min(slot.end, to) - Math.max(slot.start, from));
const dayLabel = (day: string) => new Intl.DateTimeFormat("sr-Latn-RS", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

/** Advisory only. Never used to relax automatic generation or database integrity. */
export function scheduleWarnings(input: ScheduleInput, slots: Slot[]): ScheduleWarning[] {
  const currentIds = new Set(slots.map((s) => s.id));
  const all = [...new Map([...input.adjacent, ...slots].map((s) => [s.id, s])).values()].filter((s) => !s.cancelled && s.employeeId);
  const warnings = new Map<string, ScheduleWarning>();
  const add = (kind: WarningKind, employeeId: string, key: string, affected: Slot[], message: string) => {
    if (!affected.some((s) => currentIds.has(s.id))) return;
    const id = `${kind}|${employeeId}|${key}`;
    const previous = warnings.get(id);
    warnings.set(id, { id, kind, employeeId, slotIds: [...new Set([...(previous?.slotIds ?? []), ...affected.map((s) => s.id)])], message });
  };
  for (const employeeId of new Set(all.map((s) => s.employeeId!))) {
    const own = all.filter((s) => s.employeeId === employeeId).sort((a,b) => a.start - b.start || a.id.localeCompare(b.id));
    const employee = input.setup.employees.find((e) => e.id === employeeId);
    const name = employee?.display_name ?? "Zaposleni";
    if (!employee?.active) add("inactive", employeeId, "", own, `${name} nije aktivan zaposleni.`);
    const days = new Set<string>();
    for (const slot of own) {
      const first = Temporal.Instant.fromEpochMilliseconds(slot.start).toZonedDateTimeISO(input.timezone).toPlainDate().toString();
      const last = Temporal.Instant.fromEpochMilliseconds(slot.end - 1).toZonedDateTimeISO(input.timezone).toPlainDate().toString();
      for (let day = first; day <= last; day = addDate(day, 1)) days.add(day);
      try {
        if (!recurringAvailable(input, slot, employeeId)) add("weekly_unavailable", employeeId, slot.id, [slot], `${name} nije dostupan u terminu smene ${dayLabel(slot.localDate)} prema nedeljnoj dostupnosti.`);
        for (const absence of overlappingAbsences(input, slot, employeeId)) {
          add("absence", employeeId, `${absence.local_date}|${absence.start_time ?? "whole"}|${absence.end_time ?? ""}`, [slot], `${name} ima uneto ${absence.start_time ? `delimično odsustvo (${absence.start_time.slice(0,5)}–${absence.end_time?.slice(0,5)})` : "celodnevno odsustvo"} ${dayLabel(absence.local_date)}.`);
        }
      } catch { add("invalid_time", employeeId, slot.id, [slot], `${name}: proverite lokalno vreme dostupnosti i promenu sata.`); }
    }
    for (let i = 0; i < own.length; i++) for (let j = i + 1; j < own.length; j++) {
      const a = own[i], b = own[j], key = [a.id,b.id].sort().join("|");
      if (a.start < b.end && a.end > b.start) add("overlap", employeeId, key, [a,b], `${name} ima preklapanje smena ${dayLabel(b.localDate)}.`);
      else if (b.start - a.end < (input.setup.rules?.min_rest_hours ?? 11) * hour) add("rest", employeeId, key, [a,b], `${name} nema najmanje ${input.setup.rules?.min_rest_hours ?? 11} h odmora između smena ${dayLabel(a.localDate)} i ${dayLabel(b.localDate)}.`);
    }
    const weeks = new Set<string>();
    for (const day of [...days].sort()) {
      const from = localInstant(day, "00:00:00", input.timezone), to = localInstant(addDate(day,1), "00:00:00", input.timezone);
      const affected = own.filter((s) => duration(s,from,to) > 0);
      if (affected.length > 1) add("multiple_shifts", employeeId, day, affected, `${name} ima ${affected.length} smene ${dayLabel(day)}.`);
      const total = affected.reduce((sum,s) => sum + duration(s,from,to),0) / hour;
      if (total > (input.setup.rules?.max_daily_hours ?? 12)) add("daily_hours", employeeId, day, affected, `${name} ima ${Number(total.toFixed(2))} h ${dayLabel(day)}; dnevni maksimum je ${input.setup.rules?.max_daily_hours ?? 12} h.`);
      const date = Temporal.PlainDate.from(day);
      weeks.add(date.subtract({days:date.dayOfWeek-1}).toString());
    }
    for (const week of [...weeks].sort()) {
      const from = localInstant(week,"00:00:00",input.timezone), to = localInstant(addDate(week,7),"00:00:00",input.timezone);
      const affected = own.filter((s) => duration(s,from,to) > 0);
      const total = affected.reduce((sum,s) => sum + duration(s,from,to),0) / hour;
      if (total > (input.setup.rules?.max_weekly_hours ?? 48)) add("weekly_hours", employeeId, week, affected, `${name} ima ${Number(total.toFixed(2))} h u nedelji od ${dayLabel(week)}; maksimum je ${input.setup.rules?.max_weekly_hours ?? 48} h.`);
    }
  }
  return [...warnings.values()];
}
