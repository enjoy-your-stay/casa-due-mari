// Screenshot del sito locale in tutte le lingue (o quelle passate come argomenti).
// Uso:  node tools/shot.mjs            -> tutte le lingue, mobile + desktop
//       node tools/shot.mjs it de      -> solo it e de
// Richiede un server statico attivo su http://localhost:8000 (npm run serve nella root).
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8000';
const OUT = new URL('./shots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const langs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : JSON.parse(readFileSync(new URL('../i18n/languages.json', import.meta.url))).map(l => l.code);

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
];

const browser = await chromium.launch({ channel: 'chrome' });
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  for (const lang of langs) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`${BASE}/?lang=${lang}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('main:not([hidden])', { timeout: 5000 });
    const file = `${OUT}${lang}-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`${file}${errors.length ? '  ⚠ ' + errors.join(' | ') : ''}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
