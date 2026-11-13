import assert from 'node:assert/strict';
import { uiFixture } from './ui-fixture.mjs';

const f=await uiFixture(),{page,state}=f;
const nav=async(name)=>page.getByRole('navigation',{name:'Glavna navigacija'}).getByRole('button',{name,exact:true}).click();
const authEvent=async(event,user=f.user)=>page.evaluate(({event,user,token})=>{
  const channel=new BroadcastChannel('sb-srpvabzbekenbuxxrbvr-auth-token');
  channel.postMessage({event,session:{user,access_token:token,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer'}});
  setTimeout(()=>channel.close(),200);
},{event,user,token:f.token});
try {
  await f.login();
  state.saveMode='fail';
  await page.getByRole('button',{name:'Opcije',exact:true}).first().click();
  await page.getByLabel('Zameni',{exact:true}).selectOption('e2');await page.keyboard.press('Escape');
  await nav('Tim'); // Navigate while the actual pending request is still running.
  await page.getByLabel('Ime zaposlenog',{exact:true}).fill('Unfinished private entry');
  await authEvent('TOKEN_REFRESHED');await authEvent('SIGNED_IN');
  await page.waitForTimeout(300);
  assert.equal(await page.getByLabel('Ime zaposlenog',{exact:true}).inputValue(),'Unfinished private entry','same-user auth preserves form');
  const other=await f.context.newPage();await other.goto('about:blank');await other.bringToFront();await page.bringToFront();await other.close();
  assert.equal(await page.getByLabel('Ime zaposlenog',{exact:true}).inputValue(),'Unfinished private entry','tab refocus preserves entry');
  await nav('Raspored');
  await page.getByText('Nije sačuvano. Predlog je zadržan na ekranu.').waitFor();
  assert.equal(await page.locator('.shift-card .employee-name').first().textContent(),'Cal');
  assert.equal(state.slots[0].employee_id,'e0','failed write did not change server fixture');
  const firstId=state.operations[0].p_operation_id;
  await page.getByRole('button',{name:'Učitaj sa servera',exact:true}).click();
  await page.getByText(/Nastavite čuvanje ili izričito odbacite/).waitFor();
  assert.equal(await page.locator('.shift-card .employee-name').first().textContent(),'Cal','reload cannot erase proposal');
  await authEvent('TOKEN_REFRESHED');await page.waitForTimeout(200);
  state.saveMode='success';await page.getByRole('button',{name:'Pokušaj ponovo',exact:true}).click();
  await page.getByText(/Sačuvana revizija 2/).waitFor();
  assert.equal(state.operations.at(-1).p_operation_id,firstId);
  assert.equal(state.slots[0].employee_id,'e2');
  await nav('Tim');await page.getByLabel('Ime zaposlenog',{exact:true}).fill('Private new entry');await nav('Raspored');
  // A failed proposal requires an explicit discard; cancelling discard keeps it.
  state.saveMode='fail';await page.getByRole('button',{name:'Opcije',exact:true}).first().click();await page.getByLabel('Zameni',{exact:true}).selectOption('e1');await page.keyboard.press('Escape');
  await page.getByText('Nije sačuvano. Predlog je zadržan na ekranu.').waitFor();
  page.once('dialog',(dialog)=>dialog.dismiss());await page.getByRole('button',{name:'Odbaci nesačuvani predlog'}).click();
  assert.equal(await page.locator('.shift-card .employee-name').first().textContent(),'Bea');
  page.once('dialog',(dialog)=>dialog.accept());await page.getByRole('button',{name:'Odbaci nesačuvani predlog'}).click();
  await page.getByText('Sačuvana revizija 2',{exact:true}).waitFor();assert.equal(await page.locator('.shift-card .employee-name').first().textContent(),'Cal');
  // A different identity never renders the prior workspace or local entries.
  state.workspaceless=true;
  await authEvent('SIGNED_IN',{...f.user,id:'33333333-3333-4333-8333-333333333333',email:'other@example.invalid'});
  await page.getByRole('heading',{name:'Kako se zove vaš posao?'}).waitFor();
  assert.equal(await page.getByText('Fixture Team',{exact:true}).count(),0);
  assert.ok(!(await page.locator('body').innerText()).includes('Unfinished private entry'));
  await page.screenshot({path:'test-results/schedule-recovery-account-switch.png',fullPage:true});
  await authEvent('SIGNED_OUT',null);await page.getByRole('button',{name:'Prijavi se',exact:true}).waitFor();
  state.workspaceless=false;await page.getByLabel('Email adresa').fill('fixture@example.invalid');await page.getByLabel('Lozinka').fill('fixture-password');await page.getByRole('button',{name:'Prijavi se',exact:true}).click();await nav('Tim');
  assert.equal(await page.getByLabel('Ime zaposlenog',{exact:true}).inputValue(),'','logout clears private forms');
  assert.deepEqual(f.errors,[]);
  console.log('PASS: Chrome simulated save failure/in-flight navigation/retry with stable operation ID, guarded reload/explicit discard, actual Supabase same-user auth notifications, tab focus, identity change and logout isolation');
} finally {await f.browser.close();}
