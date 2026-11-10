import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const base=process.env.SHIFTFLOW_TEST_URL ?? 'http://localhost:3001';
const browser=await chromium.launch({executablePath:chrome,headless:true});
await mkdir('test-results',{recursive:true});
try {
  for (const width of [390,768,1440]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.goto(`${base}/team/${'0'.repeat(64)}`,{waitUntil:'networkidle'});
    await page.getByRole('heading',{name:/Nedelja od/}).waitFor();
    await page.getByText('Za ovu nedelju nema objavljenog rasporeda.').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width}`);
    await page.screenshot({path:`test-results/team-empty-${width}.png`,fullPage:true});
    await page.getByRole('button',{name:'Sledeća nedelja'}).click();
    await page.getByText('Za ovu nedelju nema objavljenog rasporeda.').waitFor();
    await page.close();
  }
  console.log('PASS: Google Chrome anonymous shared calendar at 390/768/1440, week navigation and no overflow');
} finally { await browser.close(); }
