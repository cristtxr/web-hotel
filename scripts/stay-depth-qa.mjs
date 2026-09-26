import { chromium } from 'playwright-chromium';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

await page.goto(`${process.env.QA_BASE_URL ?? 'http://127.0.0.1:4322/'}stay`, { waitUntil: 'networkidle' });
await page.locator('.journey-pair').scrollIntoViewIfNeeded();
await page.waitForFunction(() => document.querySelector('.journey-image--tall img')?.complete);
await page.waitForTimeout(900);

const inspectImage = (selector) => page.locator(selector).evaluate((image) => {
  const rect = image.getBoundingClientRect();
  return {
    currentSrc: image.currentSrc.split('/').at(-1),
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    clientWidth: Math.round(rect.width),
    clientHeight: Math.round(rect.height),
    transform: getComputedStyle(image).transform,
  };
});

const before = await inspectImage('.journey-image--tall img');
await page.mouse.wheel(0, 650);
await page.waitForTimeout(900);
const after = await inspectImage('.journey-image--tall img');
await page.screenshot({ path: 'stay-depth-desktop.png' });

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mobilePage = await mobileContext.newPage();
mobilePage.on('pageerror', (error) => errors.push(error.message));
await mobilePage.goto(`${process.env.QA_BASE_URL ?? 'http://127.0.0.1:4322/'}stay`, { waitUntil: 'networkidle' });
await mobilePage.locator('.journey-image--tall').scrollIntoViewIfNeeded();
await mobilePage.waitForFunction(() => document.querySelector('.journey-image--tall img')?.complete);
await mobilePage.waitForTimeout(800);
const mobile = await mobilePage.locator('.journey-image--tall img').evaluate((image) => {
  const rect = image.getBoundingClientRect();
  return {
    currentSrc: image.currentSrc.split('/').at(-1),
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    clientWidth: Math.round(rect.width),
    clientHeight: Math.round(rect.height),
  };
});
await mobilePage.screenshot({ path: 'stay-depth-mobile.png' });

console.log(JSON.stringify({ errors, before, after, mobile }, null, 2));
await browser.close();
