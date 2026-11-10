import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const baseUrl = process.env.SHIFTFLOW_TEST_URL ?? 'http://localhost:3001';
const browser = await chromium.launch({ executablePath: chrome, headless: true });
await mkdir('test-results', { recursive: true });
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Dobro došli nazad' }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error(`Horizontal overflow at ${width}px`);
    await page.screenshot({ path: `test-results/auth-${width}.png`, fullPage: true });
    if (width === 390) {
      await page.getByRole('button', { name: 'Telefon' }).click();
      await page.getByLabel('Broj telefona').fill('123');
      await page.getByLabel('Lozinka').fill('password123');
      await page.getByRole('button', { name: 'Prijavi se' }).click();
      await page.getByRole('alert').getByText('Unesite ispravan broj telefona').waitFor();
      await page.getByRole('button', { name: 'Email' }).click();
      await page.getByLabel('Email adresa').fill('missing-shiftflow-test@example.invalid');
      await page.getByRole('button', { name: 'Prijavi se' }).click();
      await page.getByRole('alert').getByText('Prijava nije uspela').waitFor();
    }
    await page.close();
  }
  console.log('PASS: Google Chrome auth UI at 390/768/1440; no horizontal overflow; invalid phone and unknown login handled');
} finally { await browser.close(); }
