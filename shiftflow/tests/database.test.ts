import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createDemo } from "../src/lib/demo";

test("PostgreSQL: migration, tenant isolation, role checks, atomic versions and private links", async () => {
  const db = await PGlite.create();
  try {
    // Supabase Auth contract, isolated inside this ephemeral test database.
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`);
    await db.exec(await readFile("supabase/migrations/202611030001_shiftflow.sql", "utf8"));
    const ownerA = "00000000-0000-0000-0000-000000000001";
    const ownerB = "00000000-0000-0000-0000-000000000002";
    const manager = "00000000-0000-0000-0000-000000000003";
    await db.query(`insert into auth.users(id,raw_user_meta_data) values($1,'{"company_name":"Kafe A"}'),($2,'{"company_name":"Kafe B"}')`, [ownerA, ownerB]);
    const companies = await db.query<{ user_id: string; company_id: string }>("select user_id,company_id from public.memberships");
    const companyA = companies.rows.find(r => r.user_id === ownerA)!.company_id;
    const companyB = companies.rows.find(r => r.user_id === ownerB)!.company_id;
    // Add the manager fixture without the production signup trigger assigning a company.
    await db.exec("alter table auth.users disable trigger on_shiftflow_signup");
    await db.query("insert into auth.users(id) values($1)", [manager]);
    await db.exec("alter table auth.users enable trigger on_shiftflow_signup");
    await db.query("insert into public.memberships(user_id,company_id,role) values($1,$2,'manager')", [manager, companyA]);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [ownerA]);
    assert.equal((await db.query("select * from companies")).rows.length, 1);
    assert.equal((await db.query("select * from workspace_documents where company_id=$1", [companyB])).rows.length, 0);
    const current = createDemo(); current.name = "Kafe A";
    const week = Object.keys(current.schedules)[0]; current.schedules[week].status = "published";
    current.schedules[week].assignments[0].note = "PRIVATNA NAPOMENA";
    const state = { schema: 1, revision: 1, current, past: [], future: [] };
    assert.equal((await db.query<{ v: number }>("select save_workspace($1,$2::jsonb,0) as v", [companyA, JSON.stringify(state)])).rows[0].v, 1);
    assert.equal((await db.query("select * from employees")).rows.length, 10);
    assert.equal((await db.query("select * from assignments")).rows.length, 42);
    assert.equal((await db.query("select * from change_history")).rows.length, 1);
    await assert.rejects(db.query("select save_workspace($1,$2::jsonb,0)", [companyA, JSON.stringify(state)]), /VERSION_CONFLICT/);
    await assert.rejects(db.query("select save_workspace($1,$2::jsonb,0)", [companyB, JSON.stringify(state)]), /ACCESS_DENIED/);
    const invalid = structuredClone(state); invalid.current.schedules[week].assignments.pop();
    await assert.rejects(db.query("select save_workspace($1,$2::jsonb,1)", [companyA, JSON.stringify(invalid)]), /UNFILLED_REQUIREMENTS/);
    assert.equal((await db.query("select * from assignments")).rows.length, 42, "failed write rolls back atomically");
    await assert.rejects(db.query("update companies set name='Other' where id=$1", [companyA]), /permission denied/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [manager]);
    const changed = structuredClone(state); changed.current.rules.minRestHours = 8;
    await assert.rejects(db.query("select save_workspace($1,$2::jsonb,1)", [companyA, JSON.stringify(changed)]), /OWNER_REQUIRED/);
    await db.query("select save_workspace($1,$2::jsonb,1)", [companyA, JSON.stringify(state)]);
    const token = (await db.query<{ token: string }>("select rotate_schedule_link($1,$2) as token", [companyA, week])).rows[0].token;
    assert.equal(token.length, 64);
    await db.exec("set role anon");
    const shared = (await db.query<{ data: unknown }>("select read_shared_schedule($1) as data", [token])).rows[0].data;
    assert.ok(shared);
    assert.ok(!JSON.stringify(shared).includes("PRIVATNA NAPOMENA"));
    assert.ok(!JSON.stringify(shared).includes("targetHours"));
    await assert.rejects(db.query("select * from employees"), /permission denied/);
    await assert.rejects(db.query("select save_workspace($1,$2::jsonb,2)", [companyA, JSON.stringify(state)]), /permission denied/);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [ownerA]);
    const rotated = (await db.query<{ token: string }>("select rotate_schedule_link($1,$2) as token", [companyA, week])).rows[0].token;
    assert.notEqual(rotated, token);
    assert.equal((await db.query<{ data: unknown }>("select read_shared_schedule($1) as data", [token])).rows[0].data, null);
    await db.query("select revoke_schedule_link($1,$2)", [companyA, week]);
    assert.equal((await db.query<{ data: unknown }>("select read_shared_schedule($1) as data", [rotated])).rows[0].data, null);
  } finally { await db.close(); }
});
