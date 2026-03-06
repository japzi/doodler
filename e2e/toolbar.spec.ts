import { test, expect, Page } from '@playwright/test';

const CANVAS = 'svg.canvas';

async function clearStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

async function drawShape(page: Page, key: string, x = 400, y = 360, w = 120, h = 80) {
  await page.keyboard.press(key);
  const canvas = page.locator(CANVAS);
  await canvas.dispatchEvent('pointerdown', { clientX: x, clientY: y, button: 0, pointerId: 1 });
  await canvas.dispatchEvent('pointermove', { clientX: x + w, clientY: y + h, button: 0, pointerId: 1 });
  await canvas.dispatchEvent('pointerup', { clientX: x + w, clientY: y + h, button: 0, pointerId: 1 });
}

async function getObjectCount(page: Page): Promise<number> {
  return page.locator(`${CANVAS} [data-object-id]`).count();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { (window as any).__E2E_BYPASS_AUTH__ = true; });
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await page.waitForSelector(CANVAS);
});

test.describe('Stroke width', () => {
  test('changing stroke width and drawing still produces a shape', async ({ page }) => {
    const select = page.locator('.toolbar__stroke-width-select');
    await select.selectOption('4');

    const before = await getObjectCount(page);
    await drawShape(page, 'r');
    await expect.poll(() => getObjectCount(page)).toBeGreaterThan(before);
  });
});

test.describe('Grid toggle', () => {
  test('pressing G toggles grid pattern', async ({ page }) => {
    // Initially grid may or may not be visible; toggle twice to verify
    await page.keyboard.press('g');
    // Check for grid pattern element
    const gridVisible = await page.locator(`${CANVAS} pattern`).count();

    await page.keyboard.press('g');
    const gridAfterToggle = await page.locator(`${CANVAS} pattern`).count();

    // One state should have the pattern and the other should not
    expect(gridVisible !== gridAfterToggle).toBeTruthy();
  });
});

test.describe('Zoom controls', () => {
  test('zoom in updates zoom label', async ({ page }) => {
    const label = page.locator('.zoom-controls__label');
    const initialText = await label.textContent();

    await page.click('.zoom-controls__button >> text=+');
    await expect(label).not.toHaveText(initialText!);
  });

  test('zoom out updates zoom label', async ({ page }) => {
    const label = page.locator('.zoom-controls__label');
    const initialText = await label.textContent();

    await page.click('.zoom-controls__button >> text=\u2212');
    await expect(label).not.toHaveText(initialText!);
  });
});
