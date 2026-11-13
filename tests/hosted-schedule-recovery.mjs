// Opt-in authenticated integration test. Uses only newly provisioned fixture accounts.
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
import engine from '../src/lib/scheduling/engine.ts';
import warningEngine from '../src/lib/scheduling/warnings.ts';
const {generate}=engine;
const {scheduleWarnings}=warningEngine;

const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter((s)=>s&&!s.startsWith('#')).map((s)=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1).replace(/^"|"$/g,'')];}));
const url=env.NEXT_PUBLIC_SUPABASE_URL,key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.equal(new URL(url).hostname,'srpvabzbekenbuxxrbvr.supabase.co','test project allowlist');
const fixturePath='test-results/hosted-schedule-fixtures.json';
const fixture=JSON.parse(readFileSync(fixturePath,'utf8'));
assert.equal(fixture.accounts?.length,2,'Provision two fresh isolated fixture accounts first; credentials from completed runs are deliberately removed.');
const checked=(r)=>{if(r.error)throw new Error(`${r.error.code}: ${r.error.message}`);return r.data;};
const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)})}});
const [a,second,b,anon]=[client(),client(),client(),client()];
const clients=[a,second,b];
const week='2026-11-09';
let browser;
try {
  for(const [i,db] of clients.entries()) checked(await db.auth.signInWithPassword(fixture.accounts[i===2?1:0]));
  const workspace=async(db,index)=>{
    assert.equal(fixture.accounts[index].workspace,undefined,'fresh fixtures only; do not reuse previous data');
    const row=checked(await db.from('workspaces').insert({owner_user_id:fixture.accounts[index].id,name:`Schedule recovery fixture ${index+1}`}).select().single());
    fixture.accounts[index].workspace=row.id;writeFileSync(fixturePath,JSON.stringify(fixture));return row;
  };
  const wa=await workspace(a,0),wb=await workspace(b,1);
  console.log('Hosted: independent password sessions and isolated workspace bootstrap');
  assert.deepEqual(checked(await a.from('workspaces').select('id')).map((r)=>r.id),[wa.id]);
  assert.deepEqual(checked(await b.from('workspaces').select('id')).map((r)=>r.id),[wb.id]);
  const role=checked(await a.from('roles').insert({workspace_id:wa.id,name:'Service'}).select().single());
  const otherRole=checked(await a.from('roles').insert({workspace_id:wa.id,name:'Other'}).select().single());
  const employees=checked(await a.from('employees').insert(['Ana','Bojan'].map((display_name)=>({workspace_id:wa.id,display_name,target_hours:8}))).select());
  const shifts=checked(await a.from('shift_templates').insert({workspace_id:wa.id,name:'Day',start_time:'09:00',end_time:'13:00'}).select());
  const requirements=checked(await a.from('staffing_requirements').insert([1,2].map((weekday)=>({workspace_id:wa.id,role_id:role.id,shift_template_id:shifts[0].id,weekday,required_count:weekday===1?2:1}))).select());
  const windows=checked(await a.from('availability_windows').insert(employees.flatMap((e)=>Array.from({length:7},(_,weekday)=>({workspace_id:wa.id,employee_id:e.id,weekday,start_time:'00:00',end_time:'24:00'})))).select());
  const rules=checked(await a.from('scheduling_rules').select('*').eq('workspace_id',wa.id).single());
  const model={weekStart:week,timezone:wa.timezone,setup:{roles:[role,otherRole],employees,shifts,requirements,windows,exceptions:[],employeeRoles:[],rules},existing:[],adjacent:[]};
  let slots=generate(model,{maxNodes:500}).slots;
  const payload=(items)=>items.map((s)=>({id:s.id,local_date:s.localDate,role_id:s.roleId,shift_id:s.shiftId,position:Number(s.id.split(':').at(-1)),employee_id:s.employeeId,locked:s.locked,cancelled:!!s.cancelled}));
  const revision=async()=>checked(await a.from('schedule_weeks').select('revision,published_revision').eq('workspace_id',wa.id).eq('week_start',week).single());
  const setupRevision=async()=>checked(await a.from('workspaces').select('setup_revision').eq('id',wa.id).single()).setup_revision;
  let rev=0;
  const save=async(db,next,name='generate',expected=rev,id=crypto.randomUUID())=>db.rpc('save_schedule',{p_workspace:wa.id,p_week_start:week,p_expected_revision:expected,p_expected_setup_revision:await setupRevision(),p_operation_id:id,p_operation:name,p_slots:payload(next)});
  const commit=async(next,name='generate')=>{rev=checked(await save(a,next,name));slots=next;return rev;};
  const rows=async()=>checked(await a.from('assignments').select('id,slot_key,local_date,role_id,shift_template_id,employee_id,starts_at,ends_at,locked,cancelled').eq('workspace_id',wa.id).order('slot_key'));
  await commit(slots);
  const original=await rows();
  await commit(slots.map((s,i)=>({...s,locked:i===0})),'lock');
  assert.equal((await rows())[0].locked,true);
  const bad=await save(a,slots.map((s,i)=>({...s,locked:false,employeeId:i===0?employees.find((e)=>e.id!==s.employeeId).id:s.employeeId})),'unlock');
  assert.match(bad.error?.message??'',/Unlock/);
  const unlock=slots.map((s)=>({...s,locked:false}));const id=crypto.randomUUID(),oldRev=rev;
  rev=checked(await save(a,unlock,'unlock',rev,id));slots=unlock;
  assert.equal(checked(await save(second,unlock,'unlock',oldRev,id)),rev);
  assert.deepEqual(await rows(),original,'real unlock preserves stored assignment identity and interval');
  await commit(slots.map((s,i)=>i===0?{...s,employeeId:employees.find((e)=>e.id!==s.employeeId).id}:s),'replace');
  await commit(generate(model,{maxNodes:500}).slots,'undo');
  checked(await a.rpc('publish_schedule',{p_workspace:wa.id,p_week_start:week,p_expected_revision:rev}));
  const beforeInvalid=await rows(),pointer=await revision();
  const forged=slots.map((s,i)=>i===0?{...s,roleId:otherRole.id,id:`${s.localDate}:${crypto.randomUUID()}:0`}:s);
  for(const mode of ['generate','generate_availability_override','replace']) {
    assert.match((await save(a,forged,mode)).error?.message??'',/demand/);
    assert.deepEqual(await rows(),beforeInvalid);assert.deepEqual(await revision(),pointer);
  }
  const stale=rev;
  const contenders=await Promise.all([save(a,slots,'replace',stale),save(second,slots,'replace',stale)]);
  assert.equal(contenders.filter((r)=>!r.error).length,1);assert.equal(contenders.filter((r)=>r.error?.code==='PT409' && r.status===409).length,1,JSON.stringify(contenders.map((r)=>r.error)));
  console.log('Hosted: lock/unlock/undo, exact demand rollback, receipt retry and real concurrent HTTP 409 passed');
  rev=(await revision()).revision;
  assert.match((await b.rpc('save_schedule',{p_workspace:wa.id,p_week_start:week,p_expected_revision:rev,p_expected_setup_revision:await setupRevision(),p_operation_id:crypto.randomUUID(),p_operation:'generate_availability_override',p_slots:payload(slots)})).error?.message??'',/Forbidden/);
  assert.deepEqual(checked(await b.from('assignments').select('*').eq('workspace_id',wa.id)),[]);
  assert.ok((await a.from('assignments').update({locked:true}).eq('workspace_id',wa.id)).error,'direct assignment writes denied');
  assert.ok((await a.rpc('assert_schedule_valid',{p_workspace:wa.id,p_week:crypto.randomUUID()})).error,'internal validator not an authenticated API');
  model.setup.exceptions=checked(await a.from('availability_exceptions').insert(employees.map((e)=>({workspace_id:wa.id,employee_id:e.id,local_date:week,start_time:null,end_time:null,reason:'PRIVATE TEST REASON'}))).select());
  const generated=generate(model,{maxNodes:500});assert.equal(generated.status,'complete');assert.equal(generated.deviations,2);
  assert.ok(scheduleWarnings(model,generated.slots).length>=2);
  assert.match((await save(a,generated.slots)).error?.message??'',/absent/);
  await commit(generated.slots,'generate_availability_override');
  checked(await a.rpc('publish_schedule',{p_workspace:wa.id,p_week_start:week,p_expected_revision:rev}));
  const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
  checked(await a.rpc('rotate_team_link',{p_workspace:wa.id,p_token:token}));
  const shared=checked(await anon.rpc('read_team_week',{p_token:token,p_week_start:week}));
  assert.equal(shared.assignments.length,3);assert.deepEqual(Object.keys(shared.assignments[0]).sort(),['date','employee','end','role','start']);
  assert.ok(!JSON.stringify(shared).includes('PRIVATE'));
  const privateRead=await anon.from('availability_exceptions').select('*');
  if(!privateRead.error) assert.deepEqual(privateRead.data,[],'anonymous reads expose no absences');
  console.log('Hosted: availability fallback persisted/published; tenant boundaries and anonymous privacy passed');
  // Real Chrome + real Auth/REST/RPC. Only a deliberately failed save is intercepted.
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',(e)=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00Z'));
  const base=process.env.SHIFTFLOW_TEST_URL??'http://localhost:3001';
  await page.goto(base);await page.getByLabel('Email adresa').fill(fixture.accounts[0].email);await page.getByLabel('Lozinka').fill(fixture.accounts[0].password);await page.getByRole('button',{name:'Prijavi se',exact:true}).click();
  await page.getByRole('button',{name:'Generiši',exact:true}).click();
  await page.getByText(/Sačuvano uz upozorenja · Sačuvana revizija/).waitFor();
  assert.equal((await rows()).filter((s)=>s.employee_id).length,3);
  await page.getByText('Raspored je popunjen uz upozorenja.',{exact:true}).waitFor();
  // Lock, reload, unlock, replace, reload and undo, all confirmed by PostgreSQL.
  const card=page.locator(`[id="slot-${slots[0].id}"]`);
  await card.getByRole('button',{name:'Opcije',exact:true}).click();await page.getByRole('button',{name:'Zaključaj',exact:true}).click();
  await page.getByText(new RegExp(`Sačuvana revizija ${rev+2}`)).waitFor();await page.keyboard.press('Escape');
  await page.reload();await card.getByRole('button',{name:'Opcije',exact:true}).click();await page.getByRole('button',{name:'Otključaj',exact:true}).click();
  await page.getByText(new RegExp(`Sačuvana revizija ${rev+3}`)).waitFor();assert.equal((await rows())[0].locked,false);
  const firstAssignee=(await rows())[0].employee_id,alternative=employees.find((e)=>e.id!==firstAssignee).id;
  await page.getByLabel('Zameni',{exact:true}).selectOption(alternative);await page.getByText(new RegExp(`Sačuvana revizija ${rev+4}`)).waitFor();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Poništi poslednju izmenu'}).click();await page.getByText(new RegExp(`Sačuvana revizija ${rev+5}`)).waitFor();
  assert.equal((await rows())[0].employee_id,firstAssignee);
  // Actual stale revision triggers a SQL conflict, followed by safe discard.
  rev=(await revision()).revision;checked(await save(second,slots,'replace'));
  await card.getByRole('button',{name:'Opcije',exact:true}).click();await page.getByLabel('Zameni',{exact:true}).selectOption(alternative);await page.keyboard.press('Escape');
  await page.getByText('Nije sačuvano. Predlog je zadržan na ekranu.').waitFor();
  const nav=async(name)=>page.getByRole('navigation',{name:'Glavna navigacija'}).getByRole('button',{name,exact:true}).click();
  await nav('Tim');await page.getByLabel('Ime zaposlenog',{exact:true}).fill('PRIVATE UNSAVED');await nav('Raspored');
  await page.getByRole('button',{name:'Pokušaj ponovo',exact:true}).waitFor();
  page.once('dialog',(dialog)=>dialog.accept());await page.getByRole('button',{name:'Odbaci nesačuvani predlog'}).click();await page.getByText(new RegExp(`Sačuvana revizija ${rev+1}`)).waitFor();
  // Simulate one network failure, then retry against real SQL after navigating away.
  let failed=false;
  await page.route('**/rest/v1/rpc/save_schedule',async(route)=>{if(!failed){failed=true;await route.abort('failed');}else await route.continue();});
  await card.getByRole('button',{name:'Opcije',exact:true}).click();await page.getByLabel('Zameni',{exact:true}).selectOption(alternative);await page.keyboard.press('Escape');await nav('Tim');await nav('Raspored');
  await page.getByText('Nije sačuvano. Predlog je zadržan na ekranu.').waitFor();await page.getByRole('button',{name:'Pokušaj ponovo',exact:true}).click();await page.getByText(new RegExp(`Sačuvana revizija ${rev+2}`)).waitFor();
  assert.equal((await rows())[0].employee_id,alternative);await page.reload();assert.equal(await page.locator('.shift-card .employee-name').first().textContent(),employees.find((e)=>e.id===alternative).display_name);
  await page.screenshot({path:'test-results/hosted-schedule-recovery.png',fullPage:true});
  const publicPage=await browser.newPage();await publicPage.clock.setFixedTime(new Date('2026-11-12T12:00:00Z'));await publicPage.goto(`${base}/team/${token}`);await publicPage.getByText('Ana',{exact:true}).first().waitFor();
  assert.ok(!(await publicPage.locator('body').innerText()).includes('PRIVATE'));assert.equal(await publicPage.locator('.shift-warning').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: hosted real password sessions, two-owner RLS, atomic saves, stable lock/unlock UUIDs, undo, exact demand rejection, independent-session revision conflict, receipt retry, explicit automatic fallback, publication/privacy, and Google Chrome real manager recovery flows');
} finally {
  await browser?.close();
  for(const db of clients) await db.auth.signOut();
  // Fixture removal is performed separately by exact account IDs, never by a broad filter.
}
