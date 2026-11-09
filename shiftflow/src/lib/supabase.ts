import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDemo } from "./demo";
import type { StoredState } from "./storage";

let client: SupabaseClient | null = null;
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key);
  return client;
}
function database() { const db = getSupabase(); if (!db) throw new Error("Supabase projekat još nije povezan."); return db; }
export async function loadCloud(): Promise<{ company_id: string; version: number; state: StoredState } | null> {
  const db = database();
  const { data: membership, error: memberError } = await db.from("memberships").select("company_id").single();
  if (memberError) throw new Error("Nije moguće učitati poslovni prostor: " + memberError.message);
  const { data, error } = await db.from("workspace_documents").select("company_id,version,state").eq("company_id", membership.company_id).single();
  if (error) throw error;
  if (!data.state?.current) {
    const { data: company } = await db.from("companies").select("name").eq("id", membership.company_id).single();
    const current = createDemo(); current.name = company?.name || "Moj kafić";
    // A registered company starts empty and never receives demo employees.
    current.employees = []; current.schedules = {}; current.requirements = current.requirements.map(r => ({ ...r, count: 0 }));
    const state: StoredState = { schema: 1, revision: 0, current, past: [], future: [] };
    const version = await saveCloud(membership.company_id, state, data.version);
    return { company_id: membership.company_id, version, state };
  }
  return data as { company_id: string; version: number; state: StoredState };
}
export async function saveCloud(companyId: string, state: StoredState, version: number): Promise<number> {
  const { data, error } = await database().rpc("save_workspace", { p_company: companyId, p_state: state, p_expected_version: version });
  if (error) {
    if (error.message.includes("VERSION_CONFLICT")) throw new Error("Drugi menadžer je sačuvao noviju izmenu. Osvežite stranicu pre nastavka. Vaša izmena ostaje sačuvana lokalno.");
    throw new Error("Čuvanje u bazi nije uspelo: " + error.message);
  }
  return data as number;
}
export async function createShare(companyId: string, week: string) {
  const { data, error } = await database().rpc("rotate_schedule_link", { p_company: companyId, p_week: week });
  if (error) throw error;
  return `${location.origin}/?share=${data}`;
}
export async function loadShared(token: string) {
  const { data, error } = await database().rpc("read_shared_schedule", { p_token: token });
  if (error || !data) throw new Error("Ovaj link je opozvan, istekao ili raspored još nije objavljen.");
  return data;
}
