import { chromium } from 'playwright-chromium';

const base = process.env.QA_BASE_URL ?? 'http://localhost:4322';
const browser = await chromium.launch({ headless: true });
const out = {};

function trackX(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(el).transform);
    return m ? Math.round(parseFloat(m[1].split(',')[4])) : 0;
  }, sel);
}

for (const [name, vp] of Object.entries({
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
})) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3400);

  const home0 = await trackX(page, '[data-home-track]');
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.4));
  await page.waitForTimeout(1400);
  const home1 = await trackX(page, '[data-home-track]');
  const pinSpacerH = await page.evaluate(() => document.querySelector('.pin-spacer')?.offsetHeight ?? 0);
  // scroll to the very end of the pinned area
  await page.evaluate(() => {
    const spacer = document.querySelector('.pin-spacer');
    window.scrollTo(0, spacer ? spacer.offsetTop + spacer.offsetHeight : document.body.scrollHeight);
  });
  await page.waitForTimeout(1400);
  const home2 = await trackX(page, '[data-home-track]');
  const closingVisible = await page.evaluate(() => {
    const r = document.querySelector('.home-closing-copy')?.getBoundingClientRect();
    return r ? r.top < window.innerHeight && r.bottom > 0 : false;
  });
  if (name === 'mobile') await page.screenshot({ path: 'qa-home-end-mobile.png' });
  out[name] = { home: { start: home0, mid: home1, end: home2, pinSpacerH, closingVisible, errors } };
  await ctx.close();
}

// Stay rooms horizontal (mobile + desktop)
for (const [name, vp] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } })) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.goto(`${base}/stay`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const r0 = await trackX(page, '[data-rooms-track]');
  await page.evaluate(() => {
    const section = document.querySelector('[data-horizontal-rooms]');
    const spacer = section.parentElement.classList.contains('pin-spacer') ? section.parentElement : section;
    const start = spacer.offsetTop;
    const range = Math.max(0, spacer.offsetHeight - window.innerHeight);
    window.scrollTo(0, start + range * 0.5);
  });
  await page.waitForTimeout(1400);
  const r1 = await trackX(page, '[data-rooms-track]');
  await page.evaluate(() => {
    const section = document.querySelector('[data-horizontal-rooms]');
    const spacer = section.parentElement.classList.contains('pin-spacer') ? section.parentElement : section;
    window.scrollTo(0, spacer.offsetTop + spacer.offsetHeight);
  });
  await page.waitForTimeout(1200);
  const r2 = await trackX(page, '[data-rooms-track]');
  if (name === 'mobile') await page.screenshot({ path: 'qa-rooms-mobile.png' });
  out[`stay-${name}`] = { roomsStart: r0, roomsMid: r1, roomsEnd: r2 };
  await ctx.close();
}

// Place construction sequence (mobile + desktop)
for (const [name, vp] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } })) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.goto(`${base}/place`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const probe = async () => page.evaluate(() => {
    const section = document.querySelector('[data-construction]');
    const top = section.getBoundingClientRect().top + window.scrollY;
    const visible = Array.from(document.querySelectorAll('[data-build-frame]')).filter((f) => parseFloat(getComputedStyle(f).opacity) > 0.9).length;
    return { top, h: section.offsetHeight, visible, label: document.querySelector('[data-build-label]')?.textContent };
  });
  const a = await probe();
  await page.evaluate((t) => window.scrollTo(0, t + window.innerHeight * 0.5), a.top);
  await page.waitForTimeout(1200);
  const b = await probe();
  await page.evaluate(({ t, h }) => window.scrollTo(0, t + h * 0.55), { t: b.top, h: b.h });
  await page.waitForTimeout(1200);
  const c = await probe();
  if (name === 'mobile') await page.screenshot({ path: 'qa-construction-mobile.png' });
  out[`place-${name}`] = { start: { visible: a.visible, label: a.label }, mid: { visible: b.visible, label: b.label }, later: { visible: c.visible, label: c.label } };
  await ctx.close();
}

// Doors color (fresh session -> preloader visible)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'qa-doors.png' });
  out.doors = 'screenshot qa-doors.png';
  await ctx.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
