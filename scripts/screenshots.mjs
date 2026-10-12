/**
 * Full-page screenshot capture for visual review.
 * Requires the dev server (default http://localhost:5173 — override via BASE_URL).
 *
 *   npm run screenshots
 *   BASE_URL=http://localhost:4173 npm run screenshots
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = path.join(ROOT, 'artifacts', 'screenshots');

// HashRouter — routes live in the fragment.
const SCREENS = [
  { name: 'home', path: '#/' },
  { name: 'markets', path: '#/markets' },
  { name: 'markets-detail', path: '#/markets?market=columbus-oh' },
  { name: 'properties', path: '#/properties' },
  {
    name: 'properties-compare',
    path: '#/properties/compare?ids=st-finalist,st-consent-cbus,st-former-fw',
  },
  { name: 'property-finalist', path: '#/property/st-finalist' },
  { name: 'property-underwriting', path: '#/property/st-finalist/underwriting' },
  { name: 'property-compliance', path: '#/property/st-finalist/compliance' },
  { name: 'property-evidence', path: '#/property/st-finalist/evidence' },
  { name: 'property-decision', path: '#/property/st-finalist/decision' },
  { name: 'property-blocked-decision', path: '#/property/st-blocked/decision' },
  { name: 'crm', path: '#/crm' },
  { name: 'crm-drawer', path: '#/crm?property=st-finalist' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch();
try {
  await mkdir(OUT_DIR, { recursive: true });
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    for (const screen of SCREENS) {
      const url = `${BASE_URL}/${screen.path}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      // give lazy chunks + store hydration a beat
      await page.waitForTimeout(400);
      const file = path.join(OUT_DIR, `${screen.name}-${viewport.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`✓ ${screen.name}-${viewport.name}.png`);
    }
    await context.close();
  }
  console.log(`\nScreenshots written to ${OUT_DIR}`);
} finally {
  await browser.close();
}
