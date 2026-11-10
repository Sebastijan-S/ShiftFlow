import { supabaseBrowser } from "@/lib/supabase/browser";
import type { SetupData } from "@/lib/types";
import type { Database } from "@/lib/supabase/database.types";

type Table = keyof Database["public"]["Tables"];
type RowInput<T extends Table> = Database["public"]["Tables"][T]["Insert"] | Database["public"]["Tables"][T]["Update"];

export async function loadSetup(workspaceId: string): Promise<SetupData> {
  const db = supabaseBrowser();
  const names = ["roles", "employees", "employee_roles", "shift_templates", "availability_windows", "availability_exceptions", "staffing_requirements", "scheduling_rules"] as const;
  const results = await Promise.all(names.map((table) => db.from(table).select("*").eq("workspace_id", workspaceId)));
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw failure;
  return {
    roles: results[0].data ?? [], employees: results[1].data ?? [], employeeRoles: results[2].data ?? [],
    shifts: results[3].data ?? [], windows: results[4].data ?? [], exceptions: results[5].data ?? [],
    requirements: results[6].data ?? [], rules: results[7].data?.[0] ?? null,
  } as SetupData;
}

export async function saveRow<T extends Table>(table: T, values: RowInput<T>, id?: string) {
  const db = supabaseBrowser();
  const result = id ? await db.from(table).update(values as never).eq("id" as never, id).select().single() : await db.from(table).insert(values as never).select().single();
  if (result.error) throw result.error;
  return result.data;
}

export async function removeRow<T extends Table>(table: T, id: string) {
  const result = await supabaseBrowser().from(table).delete().eq("id" as never, id);
  if (result.error) throw result.error;
}
