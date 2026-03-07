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

/** Lock via the selection action bar (requires object(s) to be selected). */
async function lockViaActionBar(page: Page) {
  const lockBtn = page.locator('.selection-action-bar__button[title="Lock"]');
  await lockBtn.click();
}

/** Unlock via the selection action bar (requires locked object(s) to be selected). */
async function unlockViaActionBar(page: Page) {
  const unlockBtn = page.locator('.selection-action-bar__button[title="Unlock"]');
  await unlockBtn.click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { (window as any).__E2E_BYPASS_AUTH__ = true; });
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await page.waitForSelector(CANVAS);
});

test.describe('Lock objects via action bar', () => {
  test('action bar shows lock button for selected objects', async ({ page }) => {
    await drawShape(page, 'r');
    await expect.poll(() => getObjectCount(page)).toBe(1);

    await page.keyboard.press('Meta+a');
    await expect(page.locator('.selection-action-bar')).toBeVisible();
    await expect(page.locator('.selection-action-bar__button[title="Lock"]')).toBeVisible();
  });

  test('locking hides resize handles and shows unlock button', async ({ page }) => {
    await drawShape(page, 'r');
    await expect.poll(() => getObjectCount(page)).toBe(1);

    await page.keyboard.press('Meta+a');
    await expect(page.locator('[data-resize-handle]').first()).toBeVisible();

    await lockViaActionBar(page);

    // Re-select to refresh UI
    await page.keyboard.press('Escape');
    await page.keyboard.press('Meta+a');

    // Resize handles gone, unlock button visible
    await expect(page.locator('[data-resize-handle]')).toHaveCount(0);
    await expect(page.locator('.selection-action-bar__button[title="Unlock"]')).toBeVisible();
  });

  test('locked object cannot be deleted with Delete key', async ({ page }) => {
    await drawShape(page, 'r');
    await expect.poll(() => getObjectCount(page)).toBe(1);

    await page.keyboard.press('Meta+a');
    await lockViaActionBar(page);

    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Delete');

    // Object should still exist
    await expect.poll(() => getObjectCount(page)).toBe(1);
  });

  test('unlocking restores resize handles', async ({ page }) => {
    await drawShape(page, 'r');
    await expect.poll(() => getObjectCount(page)).toBe(1);

    // Lock
    await page.keyboard.press('Meta+a');
    await lockViaActionBar(page);

    // Re-select and unlock
    await page.keyboard.press('Escape');
    await page.keyboard.press('Meta+a');
    await unlockViaActionBar(page);

    // Re-select — handles should be back
    await page.keyboard.press('Escape');
    await page.keyboard.press('Meta+a');
    await expect(page.locator('[data-resize-handle]').first()).toBeVisible();
  });

  test('delete button is disabled when all selected are locked', async ({ page }) => {
    await drawShape(page, 'r');
    await expect.poll(() => getObjectCount(page)).toBe(1);

    await page.keyboard.press('Meta+a');
    await lockViaActionBar(page);

    await page.keyboard.press('Escape');
    await page.keyboard.press('Meta+a');

    const deleteBtn = page.locator('.selection-action-bar__button[title="Delete (⌫)"]');
    await expect(deleteBtn).toBeVisible();
    await expect(deleteBtn).toBeDisabled();
  });
});

