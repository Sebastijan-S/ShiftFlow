import assert from 'node:assert/strict';
import { uiFixture,base } from './ui-fixture.mjs';

const f=await uiFixture(), {page,state,tables}=f;
try {
  // Only UI state fixtures replace the worker. Real generator is exercised by test:schedule.
  await page.addInitScript(()=>{
    window.__fixtureGenerator='hang';
    window.Worker=class {
      terminate(){clearTimeout(this.timer);}
      postMessage(input){
        this.timer=setTimeout(()=>{
          this.onmessage?.({data:{type:'progress',nodes:1000}});
          const mode=window.__fixtureGenerator;
          if(mode==='hang') return;
          const slots=input.existing.map((s,i)=>({...s,employeeId:i===1?null:s.employeeId}));
          const issues=[{slotId:slots.at(-1).id,reason:'Fixture: nema kompatibilne dodele'}];
          this.onmessage?.({data:{type:'result',result:{status:mode,slots,issues,nodes:1000,elapsedMs:20,coverage:.5,targetDeviation:4}}});
        },50);
      }
    };
  });
  await f.login();await page.getByRole('button',{name:'Generiši',exact:true}).click();await page.getByText('Generisanje… (1000 koraka)').waitFor();await page.getByRole('button',{name:'Otkaži',exact:true}).click();await page.getByText('Generisanje otkazano. Prethodni nacrt je sačuvan.').waitFor();assert.equal(state.operations.length,0);
  for(const mode of ['incomplete','limit','invalid']) {
    await page.evaluate((value)=>window.__fixtureGenerator=value,mode);
    await page.getByRole('button',{name:'Generiši',exact:true}).click();
    await page.locator('.notice.error').filter({hasText:mode==='limit'?'Pretraga je dostigla granicu':mode==='invalid'?'Proverite zaključane smene':'Nepotpuna pokrivenost.'}).waitFor();
    await page.screenshot({path:`test-results/ui-ux-state-${mode}.png`,fullPage:true});
    if(mode!=='invalid') {await page.getByText(new RegExp(`Sačuvana revizija ${state.revision}`)).waitFor();assert.equal(await page.getByRole('button',{name:'Objavi ažuriranje'}).isDisabled(),true);}
  }
  // Missing setup and no-results are distinct from a loading/server error.
  tables.employees=[];await page.reload({waitUntil:'networkidle'});await page.getByText('Pripremite podatke za generisanje.').waitFor();await page.screenshot({path:'test-results/ui-ux-state-empty.png',fullPage:true});
  state.workspaceless=true;await page.reload({waitUntil:'networkidle'});await page.getByRole('heading',{name:'Kako se zove vaš posao?'}).waitFor();
  for(const dark of [true,false]) for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});if(await page.locator('html').evaluate((el)=>el.classList.contains('dark'))!==dark) await page.getByRole('button',{name:dark?'Uključi tamni režim':'Uključi svetli režim'}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`create ${width}`);
    await page.screenshot({path:`test-results/ui-ux-create-${dark?'dark':'light'}-${width}.png`,fullPage:true});
  }
  // Anonymous published calendar and Auth use the same two semantic themes at all review sizes.
  state.link='fixture-token';state.published=[{date:'2026-11-09',start:'2026-11-09T08:00:00Z',end:'2026-11-09T12:00:00Z',employee:'Cal',role:'Service'}];
  for(const surface of ['shared','auth']) {
    if(surface==='auth') await f.context.clearCookies();
    for(const dark of [true,false]) for(const width of [320,390,768,1440]) {
      if(surface==='auth') {await page.goto(`${base}/team/fixture-token`,{waitUntil:'networkidle'});await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.startsWith('sb-'))localStorage.removeItem(key);});}
      await page.goto(surface==='shared'?`${base}/team/fixture-token`:base,{waitUntil:'networkidle'});
      if(surface==='shared') await page.getByText('Cal',{exact:true}).waitFor();else await page.getByLabel('Email adresa').waitFor();
      await page.setViewportSize({width,height:900});if(await page.locator('html').evaluate((el)=>el.classList.contains('dark'))!==dark) await page.getByRole('button',{name:dark?'Uključi tamni režim':'Uključi svetli režim'}).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${surface} ${width}`);
      await page.screenshot({path:`test-results/ui-ux-${surface}-${dark?'dark':'light'}-${width}.png`,fullPage:true});
    }
  }
  assert.deepEqual(f.errors,[]);console.log('PASS: Chrome UI fixtures for generation/progress/cancel/incomplete/limit/invalid/empty, plus create/Auth/shared at 320/390/768/1440 in both themes');
} catch(error){await page.screenshot({path:'test-results/ui-ux-states-failure.png',fullPage:true});throw error;}finally {await f.browser.close();}
