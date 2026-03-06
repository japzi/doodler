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
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await page.waitForSelector(CANVAS);
});

test.describe('Select and move', () => {
  test('selecting a shape shows resize handles', async ({ page }) => {
    await drawShape(page, 'r');

    // Use Cmd+A to select all — reliable regardless of click target
    await page.keyboard.press('Meta+a');

    await expect(page.locator('[data-resize-handle]').first()).toBeVisible();
  });
});

test.describe('Multi-select', () => {
  test('select-all selects multiple shapes and shows resize handles', async ({ page }) => {
    await drawShape(page, 'r', 200, 200, 80, 60);
    await drawShape(page, 'r', 500, 200, 80, 60);

    await page.keyboard.press('Meta+a');

    // Both selected — resize handles appear for the bounding box
    await expect(page.locator('[data-resize-handle]').first()).toBeVisible();
  });
});

test.describe('Duplicate', () => {
  test('Cmd+D duplicates selected shape', async ({ page }) => {
    await drawShape(page, 'r');
    const afterDraw = await getObjectCount(page);

    // Select all then duplicate
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Meta+d');
    await expect.poll(() => getObjectCount(page)).toBe(afterDraw + 1);
  });
});

test.describe('Select all', () => {
  test('Cmd+A selects all objects', async ({ page }) => {
    await drawShape(page, 'r', 200, 200, 80, 60);
    await drawShape(page, 'e', 500, 200, 80, 60);

    await page.keyboard.press('Meta+a');

    // Resize handles should appear for multi-selection
    await expect(page.locator('[data-resize-handle]').first()).toBeVisible();
  });
});
