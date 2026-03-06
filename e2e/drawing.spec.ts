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

test.describe('Tool selection', () => {
  test('clicking toolbar button changes canvas cursor class', async ({ page }) => {
    await page.click('[data-tooltip="Rectangle (R)"]');
    await expect(page.locator(CANVAS)).toHaveClass(/canvas--shape/);
  });

  const shortcuts: [string, string, RegExp][] = [
    ['r', 'Rectangle (R)', /canvas--shape/],
    ['e', 'Ellipse (E)', /canvas--shape/],
    ['l', 'Line (L)', /canvas--shape/],
    ['a', 'Arrow (A)', /canvas--shape/],
    ['p', 'Pen (P)', /canvas--pen/],
    ['v', 'Pointer (V)', /canvas--pointer/],
    ['t', 'Text (T)', /canvas--text/],
  ];

  for (const [key, tooltip, cursorClass] of shortcuts) {
    test(`pressing ${key.toUpperCase()} activates tool and highlights button`, async ({ page }) => {
      await page.keyboard.press(key);
      await expect(page.locator(CANVAS)).toHaveClass(cursorClass);
      await expect(page.locator(`[data-tooltip="${tooltip}"]`)).toHaveClass(/toolbar__button--active/);
    });
  }
});

test.describe('Drawing shapes', () => {
  test('draw a rectangle', async ({ page }) => {
    const before = await getObjectCount(page);
    await drawShape(page, 'r');
    await expect.poll(() => getObjectCount(page)).toBeGreaterThan(before);
  });

  test('draw an ellipse', async ({ page }) => {
    const before = await getObjectCount(page);
    await drawShape(page, 'e', 500, 300, 100, 100);
    await expect.poll(() => getObjectCount(page)).toBeGreaterThan(before);
  });

  test('draw a line', async ({ page }) => {
    const before = await getObjectCount(page);
    await drawShape(page, 'l', 200, 200, 150, 100);
    await expect.poll(() => getObjectCount(page)).toBeGreaterThan(before);
  });

  test('draw with pen', async ({ page }) => {
    const before = await getObjectCount(page);
    await page.keyboard.press('p');
    const canvas = page.locator(CANVAS);
    await canvas.dispatchEvent('pointerdown', { clientX: 300, clientY: 300, button: 0, pointerId: 1 });
    for (let i = 1; i <= 5; i++) {
      await canvas.dispatchEvent('pointermove', { clientX: 300 + i * 20, clientY: 300 + i * 10, button: 0, pointerId: 1 });
    }
    await canvas.dispatchEvent('pointerup', { clientX: 400, clientY: 350, button: 0, pointerId: 1 });
    await expect.poll(() => getObjectCount(page)).toBeGreaterThan(before);
  });
});

test.describe('Undo / Redo', () => {
  test('undo removes shape, redo restores it', async ({ page }) => {
    await drawShape(page, 'r');
    const afterDraw = await getObjectCount(page);
    expect(afterDraw).toBeGreaterThan(0);

    await page.keyboard.press('Meta+z');
    await expect.poll(() => getObjectCount(page)).toBe(afterDraw - 1);

    await page.keyboard.press('Meta+Shift+z');
    await expect.poll(() => getObjectCount(page)).toBe(afterDraw);
  });
});

test.describe('Delete', () => {
  test('draw shape, select it, delete it', async ({ page }) => {
    await drawShape(page, 'r');
    const afterDraw = await getObjectCount(page);

    // Select all then delete
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Delete');
    await expect.poll(() => getObjectCount(page)).toBe(afterDraw - 1);
  });
});
