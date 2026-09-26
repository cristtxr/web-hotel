import { chromium } from 'playwright-chromium';

const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4322';
const browser = await chromium.launch({ headless: true });
const errors = [];

const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await desktop.newPage();
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
await page.screenshot({ path: 'home-desktop.png', fullPage: true });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.locator('.portals').scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.screenshot({ path: 'home-portals-desktop.png', fullPage: false });
const portalState = await page.locator('.portal').evaluateAll((portals) => portals.map((portal) => ({
  opacity: getComputedStyle(portal).opacity,
  top: portal.getBoundingClientRect().top,
  width: portal.getBoundingClientRect().width,
  height: portal.getBoundingClientRect().height,
})));
await page.evaluate(() => document.querySelector('[data-book-open]')?.click());
await page.waitForTimeout(850);
await page.screenshot({ path: 'booking-desktop.png', fullPage: false });
await page.keyboard.press('Escape');
await page.waitForTimeout(650);

for (const route of ['stay', 'experience', 'place']) {
  await page.goto(`${base}/${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, Math.min(document.body.scrollHeight * 0.35, 5000)));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${route}-desktop.png`, fullPage: false });
}

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mobilePage = await mobile.newPage();
mobilePage.on('pageerror', (error) => errors.push(`mobile page: ${error.message}`));
mobilePage.on('console', (message) => {
  if (message.type() === 'error') errors.push(`mobile console: ${message.text()}`);
});
await mobilePage.goto(`${base}/`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(2500);
await mobilePage.screenshot({ path: 'home-mobile.png', fullPage: true });
await mobilePage.locator('.portals').scrollIntoViewIfNeeded();
await mobilePage.waitForTimeout(1000);
await mobilePage.screenshot({ path: 'home-portals-mobile.png', fullPage: false });

console.log(JSON.stringify({
  errors,
  portalState,
  homeTitle: await mobilePage.title(),
  desktopHeight: await page.evaluate(() => document.body.scrollHeight),
  mobileHeight: await mobilePage.evaluate(() => document.body.scrollHeight),
}, null, 2));

await browser.close();
