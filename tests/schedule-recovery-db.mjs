import { readFileSync,readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

const db=new PGlite();
const sql=(q,p)=>db.query(q,p);
const owner='11111111-1111-4111-8111-111111111111';
try {
  await db.exec(`create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create role authenticated; create role anon;`);
  const directory=new URL('../supabase/migrations/',import.meta.url);
  for(const file of readdirSync(directory).filter((s)=>s.endsWith('.sql')).sort()) {
    if(file.includes('schedule_rpc_privileges')) await db.exec('grant all on public.assignments,public.schedule_weeks,public.published_revisions,public.change_events,public.operation_receipts,public.team_links to anon,authenticated');
    await db.exec(readFileSync(new URL(file,directory),'utf8'));
  }
  assert.equal((await sql("select has_table_privilege('anon','public.assignments','TRUNCATE') allowed")).rows[0].allowed,false);
  assert.equal((await sql("select has_table_privilege('authenticated','public.assignments','UPDATE') allowed")).rows[0].allowed,false);
  assert.equal((await sql("select has_table_privilege('authenticated','public.assignments','SELECT') allowed")).rows[0].allowed,true);
  await sql('insert into auth.users values ($1)',[owner]);
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}'`);
  const w=(await sql("insert into public.workspaces(owner_user_id,name) values ($1,'Recovery fixtures') returning id",[owner])).rows[0].id;
  const role=(await sql("insert into public.roles(workspace_id,name) values ($1,'Service') returning id",[w])).rows[0].id;
  const otherRole=(await sql("insert into public.roles(workspace_id,name) values ($1,'Other') returning id",[w])).rows[0].id;
  const shift=(await sql("insert into public.shift_templates(workspace_id,name,start_time,end_time) values ($1,'Day','09:00','13:00') returning id",[w])).rows[0].id;
  const people=(await sql("insert into public.employees(workspace_id,display_name) values ($1,'Ana'),($1,'Bojan') returning id",[w])).rows.map((r)=>r.id);
  const recurring=(await sql('insert into public.staffing_requirements(workspace_id,role_id,shift_template_id,weekday,required_count) values ($1,$2,$3,1,2) returning id',[w,role,shift])).rows[0].id;
  const need=(await sql("insert into public.staffing_requirements(workspace_id,role_id,shift_template_id,local_date,required_count) values ($1,$2,$3,'2026-11-09',1),($1,$2,$3,'2026-11-10',1) returning id",[w,role,shift])).rows.map((r)=>r.id);
  await sql("insert into public.availability_windows(workspace_id,employee_id,weekday,start_time,end_time) values ($1,$2,1,'08:00','18:00'),($1,$2,2,'08:00','18:00')",[w,people[0]]);
  const setup=async()=>(await sql('select setup_revision from public.workspaces where id=$1',[w])).rows[0].setup_revision;
  const slots=need.map((id,i)=>({id:`2026-11-${9+i<10?'0':''}${9+i}:${id}:0`,local_date:`2026-11-${i===0?'09':'10'}`,role_id:role,shift_id:shift,position:0,employee_id:people[0],locked:false,cancelled:false}));
  let revision=0;
  const save=async(next,name='generate',id=crypto.randomUUID(),expected=revision)=>sql('select public.save_schedule($1,$2,$3,$4,$5,$6,$7::jsonb) rev',[w,'2026-11-09',expected,await setup(),id,name,JSON.stringify(next)]);
  const commit=async(next,name='generate')=>{revision=(await save(next,name)).rows[0].rev;return revision;};
  const rows=async()=>(await sql('select id,slot_key,employee_id,locked,starts_at,ends_at,role_id,local_date,cancelled from public.assignments where workspace_id=$1 order by slot_key',[w])).rows;
  await commit(slots);
  const original=await rows();
  const locked=slots.map((s,i)=>({...s,locked:i===0}));await commit(locked,'lock');
  assert.equal((await rows())[0].locked,true);
  for(const changed of [locked.map((s,i)=>i===0?{...s,employee_id:people[1],locked:false}:s),locked.map((s,i)=>({...s,locked:false,employee_id:i===1?people[1]:s.employee_id})),locked.slice(1)]) {
    const before=await rows();await assert.rejects(()=>save(changed,'unlock'),/Unlock|Lock operation|demand/);assert.deepEqual(await rows(),before);
  }
  await assert.rejects(()=>save(slots,'replace'),/Unlock/);
  const op=crypto.randomUUID(),beforeUnlock=revision;
  revision=(await save(slots,'unlock',op)).rows[0].rev;
  assert.equal((await save(slots,'unlock',op,beforeUnlock)).rows[0].rev,revision,'same operation receipt');
  const unlocked=await rows();assert.equal(unlocked[0].locked,false);
  assert.deepEqual(unlocked.map((s)=>({...s,locked:false})),original,'unlock preserves database identity, assignee, role, date and instants');
  await commit(locked,'undo');assert.equal((await rows())[0].locked,true,'undo unlock');
  await commit(slots,'undo');assert.equal((await rows())[0].locked,false,'undo lock');
  const replaced=slots.map((s,i)=>i===0?{...s,employee_id:people[1]}:s);await commit(replaced,'replace');
  assert.equal((await rows())[0].employee_id,people[1]);await commit(slots,'undo');
  await sql('select public.publish_schedule($1,$2,$3)',[w,'2026-11-09',revision]);
  const stableRevision=revision;
  const invalids=[slots.map((s,i)=>i===0?{...s,role_id:otherRole,id:`2026-11-09:${crypto.randomUUID()}:0`}:s),slots.map((s,i)=>i===0?{...s,id:null}:s),slots.map((s,i)=>i===0?{...s,position:1,id:`2026-11-09:${need[0]}:1`}:s),[slots[0],slots[0]],slots.slice(1),[...slots,slots[0]],slots.map((s,i)=>i===0?{...s,id:`2026-11-09:${recurring}:0`}:s)];
  for(const invalid of invalids) for(const name of ['generate','generate_availability_override','replace']) {
    await assert.rejects(()=>save(invalid,name),/demand/);
    assert.deepEqual(await rows(),original);
    assert.deepEqual((await sql('select revision,published_revision from public.schedule_weeks where workspace_id=$1',[w])).rows[0],{revision:stableRevision,published_revision:stableRevision});
  }
  await assert.rejects(()=>save(slots,'generate_fake_override'),/Invalid schedule operation/);
  for(const [start,end] of [[null,null],['10:00','11:00']]) {
    await sql("insert into public.availability_exceptions(workspace_id,employee_id,local_date,start_time,end_time,reason) values ($1,$2,'2026-11-09',$3,$4,'PRIVATE NOTE')",[w,people[0],start,end]);
    await assert.rejects(()=>save(slots),/absent/);
    await commit(slots,'generate_availability_override');
    assert.deepEqual(await rows(),original,'saved override reloads identically');
    await sql('select public.publish_schedule($1,$2,$3)',[w,'2026-11-09',revision]);
    await sql('delete from public.availability_exceptions where workspace_id=$1',[w]);
  }
  await sql('delete from public.availability_windows where workspace_id=$1',[w]);
  await assert.rejects(()=>save(slots),/unavailable/);await commit(slots,'generate_availability_override');
  await sql('select public.rotate_team_link($1,$2)',[w,'a'.repeat(64)]);
  await sql('select public.publish_schedule($1,$2,$3)',[w,'2026-11-09',revision]);
  await db.exec('set role anon');
  const shared=(await sql('select public.read_team_week($1,$2) result',['a'.repeat(64),'2026-11-09'])).rows[0].result;
  assert.deepEqual(Object.keys(shared.assignments[0]).sort(),['date','employee','end','role','start']);
  assert.ok(!JSON.stringify(shared).includes('PRIVATE'));
  await assert.rejects(()=>save(slots,'generate_availability_override'),/permission denied/);
  await db.exec('set role authenticated');
  for(const [field,value,pattern] of [['max_daily_hours',3,/Daily hour/],['max_weekly_hours',4,/Weekly hour/],['min_rest_hours',24,/Minimum rest/]]) {
    await sql(`update public.scheduling_rules set ${field}=$2 where workspace_id=$1`,[w,value]);
    await assert.rejects(()=>save(slots,'generate_availability_override'),pattern);
    assert.equal((await sql('select revision from public.schedule_weeks where workspace_id=$1',[w])).rows[0].revision,revision);
    await sql('update public.scheduling_rules set max_daily_hours=12,max_weekly_hours=48,min_rest_hours=11 where workspace_id=$1',[w]);
  }
  await sql('update public.employees set active=false where id=$1',[people[0]]);
  await assert.rejects(()=>save(slots,'generate_availability_override'),/Inactive/);
  await sql('update public.employees set active=true where id=$1',[people[0]]);
  await commit(locked,'lock');
  await sql("update public.shift_templates set start_time='10:00' where id=$1",[shift]);
  await assert.rejects(()=>save(locked,'generate_availability_override'),/Unlock/);
  await sql("update public.shift_templates set start_time='09:00' where id=$1",[shift]);
  const extraNeed=(await sql("insert into public.staffing_requirements(workspace_id,role_id,shift_template_id,local_date,required_count) values ($1,$2,$3,'2026-11-09',1) returning id",[w,otherRole,shift])).rows[0].id;
  const overlapping=[...locked,{...slots[0],id:`2026-11-09:${extraNeed}:0`,role_id:otherRole}];
  await assert.rejects(()=>save(overlapping,'generate_availability_override'),/Overlap/);
  console.log('PASS: isolated SQL lock/unlock/reload/replace/undo, stable UUIDs, disguised unlock denial, exact demand including NULL/duplicates/date overrides, rollback, fallback absence modes, publication privacy and retained automatic limits');
} finally {await db.close();}
