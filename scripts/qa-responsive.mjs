import { chromium } from 'playwright-chromium';

const base = process.env.QA_BASE_URL ?? 'http://localhost:4322';
const browser = await chromium.launch({ headless: true });
const report = {};

const viewports = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 1000 },
};

const clipAudit = (page) => page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('h1, h2, h3, p, .portal-title, .eyebrow, .map-point, .hotspot, dt, dd').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const dx = el.scrollWidth - el.clientWidth;
    const dy = el.scrollHeight - el.clientHeight;
    let clippedParent = null;
    let p = el.parentElement;
    while (p) {
      const pcs = getComputedStyle(p);
      if (pcs.overflow === 'hidden' || pcs.overflowX === 'hidden' || pcs.overflowY === 'hidden') {
        const pr = p.getBoundingClientRect();
        if (r.right > pr.right + 3 || r.bottom > pr.bottom + 3) clippedParent = p.className.toString().split(' ')[0] || p.tagName;
      }
      p = p.parentElement;
    }
    if (dx > 3 || dy > 3 || clippedParent) {
      bad.push({ sel: el.tagName.toLowerCase() + '.' + el.className.toString().split(' ')[0], text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 36), dx, dy, clippedBy: clippedParent });
    }
  });
  return bad;
});

async function scrollToPinProgress(page, sel, p) {
  await page.evaluate(([s, prog]) => {
    const section = document.querySelector(s);
    const spacer = section.parentElement.classList.contains('pin-spacer') ? section.parentElement : section;
    const range = Math.max(1, spacer.offsetHeight - window.innerHeight);
    window.scrollTo(0, spacer.offsetTop + range * prog);
  }, [sel, p]);
  await page.waitForTimeout(1000);
}

async function horizontalCoverage(page, sectionSel, trackSel) {
  return page.evaluate(([s, t]) => {
    const track = document.querySelector(t);
    const expected = Math.max(0, track.scrollWidth - window.innerWidth);
    const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(track).transform);
    const x = m ? Math.abs(parseFloat(m[1].split(',')[4])) : 0;
    return { expected: Math.round(expected), actual: Math.round(x), reachable: x >= expected - 6 };
  }, [sectionSel, trackSel]);
}

for (const [name, vp] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // HOME
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3400);
  const shots = name === 'desktop' ? [0.45, 0.8] : [0.12, 0.35, 0.6, 0.8, 1];
  for (const p of shots) {
    await scrollToPinProgress(page, '[data-home-horizontal]', p);
    await page.screenshot({ path: `audit-${name}-home-${Math.round(p * 100)}.png` });
  }
  const homeCover = await horizontalCoverage(page, '[data-home-horizontal]', '[data-home-track]');
  await scrollToPinProgress(page, '[data-home-horizontal]', 1);
  const homeClips = await clipAudit(page);

  // STAY
  await page.goto(`${base}/stay`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await scrollToPinProgress(page, '[data-horizontal-rooms]', 0.5);
  await page.screenshot({ path: `audit-${name}-rooms-mid.png` });
  await scrollToPinProgress(page, '[data-horizontal-rooms]', 1);
  await page.waitForTimeout(400);
  const roomsCover = await horizontalCoverage(page, '[data-horizontal-rooms]', '[data-rooms-track]');
  const stayClips = await clipAudit(page);

  // PLACE (map + construction)
  await page.goto(`${base}/place`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.querySelector('.territory-map').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `audit-${name}-map.png` });
  const placeClips = await clipAudit(page);

  report[name] = { homeCover, homeClips, roomsCover, stayClips, placeClips, errors };
  await ctx.close();
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
