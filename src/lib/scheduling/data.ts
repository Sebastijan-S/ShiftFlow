import { Temporal } from "@js-temporal/polyfill";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Slot } from "./engine";

export const monday = (day = Temporal.Now.plainDateISO().toString()) => {
  const value = Temporal.PlainDate.from(day);
  return value.subtract({ days: value.dayOfWeek - 1 }).toString();
};
export const moveWeek = (week: string, weeks: number) => Temporal.PlainDate.from(week).add({ weeks }).toString();
export type WeekState = { slots: Slot[]; adjacent: Slot[]; revision: number; publishedRevision: number | null };

export async function loadWeek(workspaceId: string, weekStart: string): Promise<WeekState> {
  const db = supabaseBrowser();
  const before = moveWeek(weekStart,-1), after = moveWeek(weekStart,1);
  const weeks = await db.from("schedule_weeks").select("id,week_start,revision,published_revision").eq("workspace_id",workspaceId).gte("week_start",before).lte("week_start",after);
  if (weeks.error) throw weeks.error;
  const ids = (weeks.data ?? []).map((w) => w.id);
  if (!ids.length) return { slots: [], adjacent: [], revision: 0, publishedRevision: null };
  const result = await db.from("assignments").select("week_id,slot_key,local_date,role_id,shift_template_id,starts_at,ends_at,employee_id,locked").eq("workspace_id",workspaceId).in("week_id",ids);
  if (result.error) throw result.error;
  const current = weeks.data?.find((w) => w.week_start === weekStart);
  const mapped = (result.data ?? []).map((row) => ({ id: row.slot_key, localDate: row.local_date, roleId: row.role_id, shiftId: row.shift_template_id, start: Date.parse(row.starts_at), end: Date.parse(row.ends_at), employeeId: row.employee_id, locked: row.locked, weekId: row.week_id }));
  return { slots: mapped.filter((s) => s.weekId === current?.id), adjacent: mapped.filter((s) => s.weekId !== current?.id), revision: current?.revision ?? 0, publishedRevision: current?.published_revision ?? null };
}

export async function saveWeek(workspaceId: string, weekStart: string, revision: number, setupRevision: number, slots: Slot[], operation: string, operationId = crypto.randomUUID()) {
  const payload = slots.map((s) => ({ id: s.id, local_date: s.localDate, role_id: s.roleId, shift_id: s.shiftId, position: Number(s.id.split(":").at(-1)), employee_id: s.employeeId, locked: s.locked }));
  const { data, error } = await supabaseBrowser().rpc("save_schedule", { p_workspace: workspaceId, p_week_start: weekStart, p_expected_revision: revision, p_expected_setup_revision: setupRevision, p_operation_id: operationId, p_operation: operation, p_slots: payload });
  if (error) throw error;
  return data;
}

export async function publishWeek(workspaceId: string, weekStart: string, revision: number) {
  const { data, error } = await supabaseBrowser().rpc("publish_schedule", { p_workspace: workspaceId, p_week_start: weekStart, p_expected_revision: revision });
  if (error) throw error;
  return data;
}
