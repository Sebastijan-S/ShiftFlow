import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const sql = async (statement, params) => db.query(statement, params);
const expectError = async (action, label) => { try { await action(); throw new Error(`${label}: unexpectedly succeeded`); } catch (error) { if (error.message.includes('unexpectedly succeeded')) throw error; } };
try {
  await db.exec(`create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$; create role authenticated; create role anon;`);
  const migrations = new URL('../supabase/migrations/', import.meta.url);
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(file, migrations), 'utf8'));
  }
  await sql('insert into auth.users(id) values ($1),($2)', [ownerA, ownerB]);
  await db.exec('set role authenticated');
  await db.exec(`set request.jwt.claim.sub = '${ownerA}'`);
  const a = (await sql('insert into public.workspaces(owner_user_id,name) values ($1,$2) returning id', [ownerA, 'Business A'])).rows[0].id;
  const ownerMembership = await sql('select * from public.memberships where workspace_id=$1', [a]);
  if (ownerMembership.rows.length !== 1) throw new Error('owner bootstrap failed');
  await expectError(() => sql('insert into public.workspaces(owner_user_id,name) values ($1,$2)', [ownerA, 'Duplicate']), 'duplicate workspace');
  if ((await sql('select * from public.workspaces')).rows.length !== 1) throw new Error('duplicate bootstrap left a workspace');
  await db.exec(`set request.jwt.claim.sub = '${ownerB}'`);
  const b = (await sql('insert into public.workspaces(owner_user_id,name) values ($1,$2) returning id', [ownerB, 'Business B'])).rows[0].id;
  const roleA = (await sql('insert into public.roles(workspace_id,name) values ($1,$2) returning id', [b, 'Seller'])).rows[0].id;
  await db.exec(`set request.jwt.claim.sub = '${ownerA}'`);
  const employeeA = (await sql('insert into public.employees(workspace_id,display_name) values ($1,$2) returning id', [a, 'Employee A'])).rows[0].id;
  const ownRole = (await sql('insert into public.roles(workspace_id,name) values ($1,$2) returning id', [a, 'Manager'])).rows[0].id;
  const ownShift = (await sql("insert into public.shift_templates(workspace_id,name,start_time,end_time) values ($1,'Day','09:00','17:00') returning id", [a])).rows[0].id;
  if ((await sql('select * from public.workspaces')).rows.length !== 1) throw new Error('cross-tenant read');
  await expectError(() => sql('insert into public.employees(workspace_id,display_name) values ($1,$2)', [b, 'Intruder']), 'cross-tenant insert');
  await expectError(() => sql('insert into public.employee_roles(workspace_id,employee_id,role_id) values ($1,$2,$3)', [a, employeeA, roleA]), 'cross-tenant FK');
  await expectError(() => sql('insert into public.staffing_requirements(workspace_id,role_id,shift_template_id,weekday,required_count) values ($1,$2,$3,1,-1)', [a, ownRole, ownShift]), 'negative staffing');
  await sql('insert into public.staffing_requirements(workspace_id,role_id,shift_template_id,weekday,required_count) values ($1,$2,$3,1,1)', [a, ownRole, ownShift]);
  await expectError(() => sql('delete from public.shift_templates where id=$1', [ownShift]), 'shift with requirements must remain');
  await expectError(() => sql('delete from public.roles where id=$1', [ownRole]), 'role with requirements must remain');
  await expectError(() => sql("insert into public.availability_exceptions(workspace_id,employee_id,local_date,start_time,end_time) values ($1,$2,'2026-11-10','12:00','09:00')", [a, employeeA]), 'reversed absence');
  await db.exec('set role anon');
  await expectError(() => sql('select * from public.employees'), 'anonymous read');
  await expectError(() => sql('insert into public.workspaces(owner_user_id,name) values ($1,$2)', [ownerA, 'Intruder']), 'anonymous insert');
  console.log('PASS: schema replay; atomic owner bootstrap; duplicate owner; cross-tenant read/write/FK; invalid input; anonymous denial');
} finally { await db.close(); }
