import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { uiFixture,base } from './ui-fixture.mjs';

await mkdir('test-results',{recursive:true});
const f=await uiFixture();
const {page,state,tables,workspace}=f;
const evidence=[];
const nav=async(name)=>{const mobile=(await page.viewportSize()).width<=650;await page.getByRole('navigation',{name:mobile?'Mobilna navigacija':'Glavna navigacija'}).getByRole('button',{name,exact:true}).click();await page.getByRole('heading',{level:1,name,exact:true}).waitFor();await page.waitForTimeout(170);};
const noOverflow=async(label)=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label);
const contrastCheck=async()=>assert.deepEqual(await page.evaluate(()=>{
  const rgb=(value)=>value.match(/[\d.]+/g)?.slice(0,3).map(Number)??[0,0,0];
  const luminance=(color)=>rgb(color).map((v)=>{const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const background=(element)=>{for(let el=element;el;el=el.parentElement){const color=getComputedStyle(el).backgroundColor;if(color!=='rgba(0, 0, 0, 0)'&&color!=='transparent')return color;}return getComputedStyle(document.body).backgroundColor;};
  const failures=[];
  for(const element of document.querySelectorAll('.sf-button,label,.subtle,.panel h2,.employee-name,.shift-card-head strong,.notice')) {
    if(!element.getClientRects().length)continue;
    const style=getComputedStyle(element),ratio=contrast(style.color,background(element));if(ratio<4.5)failures.push({text:element.textContent.slice(0,50),ratio});
  }
  for(const element of document.querySelectorAll('input:not([type=checkbox]),select')) {
    if(!element.getClientRects().length||element.disabled)continue;
    const style=getComputedStyle(element),ratio=contrast(style.borderTopColor,background(element));if(ratio<3)failures.push({input:element.type,ratio});
  }
  return failures;
}),[],'computed text >=4.5 and field boundary >=3');
const screenshot=async(name)=>{const path=`test-results/ui-ux-${name}.png`;await page.screenshot({path,fullPage:!name.includes("options")});evidence.push(path);};
const theme=async(dark)=>{if(await page.locator('html').evaluate((el)=>el.classList.contains('dark'))!==dark) await page.getByRole('button',{name:dark?'Uključi tamni režim':'Uključi svetli režim'}).click();await page.waitForTimeout(170);};
try {
  await f.login();
  await page.getByRole('button',{name:'Opcije',exact:true}).first().focus();
  await page.keyboard.press('Enter');await page.getByRole('dialog',{name:'Opcije smene'}).waitFor();
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Opcije',exact:true}).first().evaluate((el)=>el===document.activeElement),true,'Escape returns focus');assert.equal(await page.getByRole('button',{name:'Opcije',exact:true}).first().evaluate((el)=>getComputedStyle(el).outlineWidth),'3px','visible keyboard focus');
  // Manual override: duplicate, rest and whole-day absence, save failure then retry and undo.
  tables.availability_exceptions.push({id:'absence',workspace_id:workspace.id,employee_id:'e0',local_date:'2026-11-09',start_time:null,end_time:null,reason:'PRIVATE note'});
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Opcije',exact:true}).nth(1).click();
  state.saveMode='fail';await page.getByLabel('Zameni',{exact:true}).selectOption('e0');
  await page.getByText('Nije sačuvano. Predlog je zadržan na ekranu.').waitFor();
  assert.equal(await page.getByText(/Sačuvano uz upozorenja/).count(),0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.shift-warning').count(),2);
  assert.equal(await page.getByText(/PRIVATE note/).count(),0,'warnings exclude absence notes');
  state.saveMode='success';await page.getByRole('button',{name:'Pokušaj ponovo',exact:true}).click();
  await page.getByText(/Sačuvano uz upozorenja/).waitFor();
  assert.equal(state.operations.at(-1).p_operation_id,state.operations.at(-2).p_operation_id,'save retry reuses operation');
  await page.getByRole('button',{name:'Objavi ažuriranje'}).click();await page.getByText(/Objavljena revizija 2/).waitFor();
  assert.equal(state.publishedRevision,2,'warnings do not block publication');
  await page.getByLabel('Filter uloga').selectOption('r2');assert.equal(await page.locator('.shift-card').count(),0);assert.equal(await page.locator('.notice.warning').isVisible(),true,'whole-week summary survives filter');
  await page.locator('.notice.warning summary').click();await page.getByRole('button',{name:'Prikaži smenu'}).first().click();assert.equal(await page.getByLabel('Filter uloga').inputValue(),'');
  await page.getByRole('button',{name:'Poništi poslednju izmenu'}).click();await page.getByText(/Sačuvana revizija 3/).waitFor();
  assert.equal(state.slots[1].employee_id,'e1');
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.shift-warning').count(),1,'warnings recomputed on reload');
  await page.getByRole('button',{name:'Opcije',exact:true}).first().click();await page.getByLabel('Zameni mesta').selectOption(state.slots[1].id);await page.getByText(/Sačuvana revizija 4/).waitFor();await page.keyboard.press('Escape');
  assert.deepEqual(state.slots.map((s)=>s.employee_id),['e1','e0']);assert.equal(state.operations.at(-1).p_operation,'swap');
  assert.equal(await page.locator('.shift-card').nth(1).locator('.shift-warning').count(),1,'swap warnings follow employee');
  await page.getByRole('button',{name:'Opcije',exact:true}).first().click();await page.getByRole('button',{name:'Zaključaj',exact:true}).click();await page.getByText(/Sačuvana revizija 5/).waitFor();assert.equal(await page.getByLabel('Zameni',{exact:true}).isDisabled(),true);await page.keyboard.press('Escape');

  // Single link action, double activation, unknown outcome, reload, retry and clipboard fallback.
  await page.locator('.share-panel summary').click();
  const create=page.getByRole('button',{name:'Napravi link za tim',exact:true});
  const linkButtonWidth=(await create.boundingBox()).width;
  await create.evaluate((button)=>{button.click();button.click();});
  assert.equal(Math.abs((await page.getByRole('button',{name:'Pravljenje…',exact:true}).boundingBox()).width-linkButtonWidth)<1,true,'busy label retains button width');
  await page.getByText('Novi link je spreman. Prethodni više ne važi.').waitFor();assert.equal(state.linkCalls.length,1,'double click sends one request');
  const first=state.link;assert.equal(await page.getByRole('button',{name:/Rotiraj|Zameni postojeći/}).count(),0);
  await create.click();await page.getByText('Novi link je spreman. Prethodni više ne važi.').waitFor();assert.notEqual(state.link,first);
  state.linkMode='lost';await create.click();await page.getByText('Status linka nije potvrđen. Pokušajte ponovo.').waitFor();const lost=state.link;
  assert.equal(await page.getByLabel('Link za tim',{exact:true}).count(),0,'unconfirmed token is not offered as active');
  await page.reload({waitUntil:'networkidle'});await page.locator('.share-panel summary').click();await page.getByText('Status linka nije potvrđen. Pokušajte ponovo.').waitFor();
  state.linkMode='success';await page.getByRole('button',{name:'Pokušaj ponovo',exact:true}).click();await page.getByText('Novi link je spreman. Prethodni više ne važi.').waitFor();assert.equal(state.link,lost,'reload retry uses same candidate');
  assert.equal(state.linkCalls.at(-1).p_token,state.linkCalls.at(-2).p_token);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('fixture denied');}}}));
  await page.getByRole('button',{name:'Kopiraj',exact:true}).click();await page.getByText(/Kopiranje nije uspelo/).waitFor();assert.equal(await page.getByLabel('Link za tim',{exact:true}).isVisible(),true);
  state.linkMode='reject';await create.click();await page.getByText(/Link nije napravljen/).waitFor();assert.equal(await page.getByLabel('Link za tim',{exact:true}).inputValue(),`${base}/team/${lost}`,'confirmed failure preserves confirmed token');
  state.linkMode='success';await page.getByRole('button',{name:'Pokušaj ponovo',exact:true}).click();await page.getByText('Novi link je spreman. Prethodni više ne važi.').waitFor();
  const beforeWeek=state.link;await page.getByRole('button',{name:'Sledeća nedelja'}).click();await page.getByRole('button',{name:'Generiši'}).waitFor();assert.equal(state.link,beforeWeek);
  await page.getByRole('button',{name:'Prethodna nedelja'}).click();await page.getByRole('button',{name:'Objavi ažuriranje'}).click();await page.getByText(/Objavljena revizija 5/).waitFor();assert.equal(state.link,beforeWeek);
  const otherContext=await f.browser.newContext({viewport:{width:1440,height:900}});await otherContext.route('https://*.supabase.co/**',f.handleRoute);
  const second=await otherContext.newPage();await second.goto(base,{waitUntil:'networkidle'});await second.getByLabel('Email adresa').fill('fixture@example.invalid');await second.getByLabel('Lozinka').fill('fixture-password');await second.getByRole('button',{name:'Prijavi se',exact:true}).click();await second.locator('.share-panel summary').click();await second.getByRole('button',{name:'Napravi link za tim',exact:true}).click();await second.getByText('Novi link je spreman. Prethodni više ne važi.').waitFor();assert.notEqual(state.link,beforeWeek,'works in another context without remembered token');await otherContext.close();

  if(!await page.locator('.share-panel').evaluate((el)=>el.open)) await page.locator('.share-panel summary').click();
  await page.getByRole('button',{name:'Opozovi link',exact:true}).click();await page.getByText('Link za tim je opozvan.').waitFor();assert.equal(state.link,null);

  // Tabs retain unsaved values and support arrow/home/end keyboard navigation.
  await nav('Dostupnost');assert.equal(await page.locator('.availability-roster button').count(),3);
  await page.getByRole('button',{name:'Prikaži još 297',exact:true}).click();assert.equal(await page.locator('.availability-roster button').count(),300);await page.getByRole('button',{name:'Prikaži manje',exact:true}).click();
  await page.getByRole('button',{name:/Cal.*prozora/}).click();
  await page.getByRole('tabpanel').getByLabel('Od',{exact:true}).fill('10:30');await page.getByRole('checkbox',{name:'Utorak'}).check();
  await page.getByRole('tab',{name:'Nedeljno',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Odsustva i izuzeci',exact:true}).getAttribute('aria-selected'),'true');
  await page.getByLabel('Privatna napomena').fill('draft note');await page.getByRole('tab',{name:'Odsustva i izuzeci',exact:true}).focus();await page.keyboard.press('Home');assert.equal(await page.getByRole('tabpanel').getByLabel('Od',{exact:true}).inputValue(),'10:30');assert.equal(await page.getByRole('checkbox',{name:'Utorak'}).isChecked(),true);
  await page.getByRole('tabpanel').getByLabel('Do',{exact:true}).fill('09:00');await page.getByRole('button',{name:'Dodaj za označene dane'}).click();await page.getByText(/Označite bar jedan dan/).waitFor();assert.equal(await page.getByRole('tabpanel').getByLabel('Do',{exact:true}).getAttribute('aria-invalid'),'true');
  await page.getByRole('tab',{name:'Odsustva i izuzeci',exact:true}).click();assert.equal(await page.getByLabel('Privatna napomena').inputValue(),'draft note');assert.equal(await page.getByLabel('Zaposleni',{exact:true}).inputValue(),'e2');
  await page.getByLabel('Datum',{exact:true}).fill('2026-11-13');await page.getByRole('checkbox',{name:'Ceo dan',exact:true}).uncheck();await page.getByRole('tabpanel').getByLabel('Od',{exact:true}).fill('16:00');await page.getByRole('tabpanel').getByLabel('Do',{exact:true}).fill('15:00');await page.getByRole('button',{name:'Dodaj izuzetak'}).click();await page.getByText('Vreme Do mora biti posle vremena Od za izabrani datum.').waitFor();

  // Stable staffing list: N=0/1/3/8, add/delete collapsed and expanded, errors and focus.
  for(const count of [0,1,3,8]) {
    tables.staffing_requirements=Array.from({length:count},(_,i)=>({...tables.staffing_requirements[0]??{workspace_id:workspace.id,role_id:'r',shift_template_id:'morning',local_date:null},id:`list-${i}`,weekday:(i%7),required_count:1}));
    await page.reload({waitUntil:'networkidle'});await nav('Podešavanja');await page.getByRole('heading',{name:`Potrebni ljudi · ${count} ukupno`,exact:true}).waitFor();assert.equal(await page.locator('#staffing-needs .list-row').count(),Math.min(3,count));assert.equal(await page.getByRole('button',{name:'Prikaži još 5',exact:true}).count(),count===8?1:0);
  }
  const needForm=page.getByRole('button',{name:'Dodaj potrebu',exact:true}).locator('..');await needForm.getByLabel('Uloga',{exact:true}).selectOption('r');await needForm.getByLabel('Smena',{exact:true}).selectOption('evening');await needForm.getByLabel('Dan',{exact:true}).selectOption('0');
  await page.getByRole('button',{name:'Dodaj potrebu',exact:true}).click();await page.getByRole('heading',{name:'Potrebni ljudi · 9 ukupno',exact:true}).waitFor();assert.equal(await page.locator('#staffing-needs .list-row').count(),3,'adding does not expand');await page.getByText('Potreba je dodata.').waitFor();
  await page.getByRole('button',{name:'Prikaži dodatu stavku'}).click();assert.equal(await page.locator('#staffing-needs .list-row').count(),9);
  await page.getByRole('button',{name:'Prikaži manje',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Prikaži još 6',exact:true}).evaluate((el)=>el===document.activeElement),true);
  const firstRemove=page.locator('#staffing-needs button').first();state.deleteMode='fail';await firstRemove.click();await page.getByText('Fixture brisanje nije uspelo').waitFor();assert.equal(await page.locator('#staffing-needs .list-row').count(),3);assert.equal(await firstRemove.evaluate((el)=>el===document.activeElement),true);
  state.deleteMode='success';await firstRemove.click();await page.getByRole('heading',{name:'Potrebni ljudi · 8 ukupno',exact:true}).waitFor();assert.equal(await page.locator('#staffing-needs .list-row').count(),3);assert.equal(await page.locator('#staffing-needs button').first().evaluate((el)=>el===document.activeElement),true);
  await page.getByRole('button',{name:'Prikaži još 5',exact:true}).click();await page.getByRole('button',{name:'Dodaj potrebu',exact:true}).click();await page.getByRole('heading',{name:'Potrebni ljudi · 9 ukupno',exact:true}).waitFor();assert.equal(await page.locator('#staffing-needs .list-row').count(),9);await page.locator('#staffing-needs button').last().click();await page.getByRole('heading',{name:'Potrebni ljudi · 8 ukupno',exact:true}).waitFor();assert.equal(await page.locator('#staffing-needs .list-row').count(),8);

  // Matrix: both themes, all manager screens, real computed controls and text magnification.
  for(const dark of [true,false]) for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});await theme(dark);
    for(const screen of ['Raspored','Dostupnost','Tim','Podešavanja']) {
      await nav(screen);if(screen==='Dostupnost')await page.getByRole('button',{name:/Cal.*prozora/}).click();await noOverflow(`${screen} ${width} ${dark?'dark':'light'}`);
      const targets=await page.locator('button:visible').evaluateAll((elements)=>elements.filter((el)=>!el.closest('nextjs-portal')).map((el)=>({text:el.textContent,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})).filter((r)=>r.width<43.9||r.height<43.9));assert.deepEqual(targets,[],`44px targets: ${screen} ${width}`);
      await contrastCheck();
      await screenshot(`${screen.toLowerCase()}-${dark?'dark':'light'}-${width}`);
      const zoomStyle=await page.addStyleTag({content:'html { font-size: 200% !important; }'});await noOverflow(`200% text: ${screen} ${width}`);await zoomStyle.evaluate((node)=>node.remove());
      assert.equal(await page.locator('html').evaluate((el)=>getComputedStyle(el).fontSize),'16px','reset text zoom before next screenshot');
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('button').first().evaluate((el)=>getComputedStyle(el).transitionDuration),'0s');
  await page.setViewportSize({width:390,height:844});await nav('Raspored');await theme(true);await page.getByRole('button',{name:'Opcije',exact:true}).first().click();await screenshot('options-dark-390');
  assert.equal(await page.getByRole('dialog').evaluate((el)=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}),true);
  await page.keyboard.press('Escape');await page.emulateMedia({media:'print'});assert.equal(await page.locator('html').evaluate((el)=>getComputedStyle(el).colorScheme),'light','print overrides remembered inline dark scheme');assert.equal(await page.locator('.day-column:visible').count(),7);assert.equal(await page.locator('.notice:visible').count(),0);assert.equal(await page.locator('.slot-options-trigger:visible').count(),0);await page.pdf({path:'test-results/ui-ux-week.pdf',printBackground:true});await page.emulateMedia({media:'screen'});
  assert.deepEqual(f.errors,[],'browser runtime errors');
  await writeFile('test-results/ui-ux-evidence.json',JSON.stringify({browser:'installed Google Chrome',sizes:[320,390,768,1440],themes:['dark','light'],screenshots:evidence},null,2));
  console.log('PASS: Chrome UI/UX warnings/save/retry/swap/undo, links/lost-response/retry, tabs, list CRUD/focus, 32 screen/theme/size combinations, 200% text, reduced motion and real PDF');
} catch(error) { await page.screenshot({path:'test-results/ui-ux-failure.png',fullPage:true}); console.error((await page.locator('body').innerText()).slice(-2000)); throw error; } finally { await f.browser.close(); }
