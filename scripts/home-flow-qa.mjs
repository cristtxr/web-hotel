import { chromium } from 'playwright-chromium';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(process.env.QA_BASE_URL ?? 'http://127.0.0.1:4322/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(300);
const doorCoversViewport = await page.locator('.preloader').evaluate((element) => {
  const rect = element.getBoundingClientRect();
  return rect.width === innerWidth && rect.height === innerHeight;
});
await page.screenshot({ path: 'door-entry-desktop.png' });
await page.waitForTimeout(2800);
const trackBefore = await page.locator('[data-home-track]').evaluate((element) => getComputedStyle(element).transform);
for (let index = 0; index < 4; index += 1) {
  await page.mouse.wheel(0, 340);
  await page.waitForTimeout(180);
}
await page.waitForTimeout(800);
const trackAfter = await page.locator('[data-home-track]').evaluate((element) => getComputedStyle(element).transform);
const state = await page.locator('.portal').evaluateAll((portals) => portals.map((portal) => ({
  opacity: getComputedStyle(portal).opacity,
  top: Math.round(portal.getBoundingClientRect().top),
  inlineStyle: portal.getAttribute('style'),
})));
await page.screenshot({ path: 'home-flow-desktop.png' });
const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobileContext.newPage();
mobilePage.on('pageerror', (error) => errors.push(error.message));
await mobilePage.goto(process.env.QA_BASE_URL ?? 'http://127.0.0.1:4322/', { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(3500);
await mobilePage.locator('.portals').scrollIntoViewIfNeeded();
await mobilePage.waitForTimeout(700);
const mobileState = await mobilePage.locator('.portal').evaluateAll((portals) => portals.map((portal) => ({
  opacity: getComputedStyle(portal).opacity,
  width: Math.round(portal.getBoundingClientRect().width),
})));
const mobileActionDisplays = await mobilePage.locator('.portal-action').evaluateAll((items) => items.map((item) => getComputedStyle(item).display));
await mobilePage.screenshot({ path: 'home-flow-mobile.png' });
console.log(JSON.stringify({ errors, doorCoversViewport, trackBefore, trackAfter, scrollY: await page.evaluate(() => Math.round(scrollY)), state, mobileState, mobileActionDisplays }, null, 2));
await browser.close();
