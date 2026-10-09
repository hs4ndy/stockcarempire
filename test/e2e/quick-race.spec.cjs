const { test, expect } = require('playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

test('quick race confirmation starts the playable race', async ({ page }) => {
  await page.route('**/three.min.js', route => route.fulfill({ path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'), contentType: 'application/javascript' }));
  await page.goto(process.env.STOCKCAR_TEST_FILE ? pathToFileURL(path.resolve(process.env.STOCKCAR_TEST_FILE)).href : '/');
  await page.locator('#btn-quick-race').click();
  await page.locator('[data-diff="beginner"]').click();
  await page.locator('.quick-series-btn').first().click();
  expect(await page.evaluate(() => Boolean(window._r3d?.racing))).toBe(false);
  await page.locator('#btn-quick-race-confirm').click();
  await page.waitForFunction(() => window._r3d?.racing);
  await expect(page.locator('#quick-race-modal')).toHaveCount(0);
  await expect(page.locator('#race-3d-container canvas').first()).toBeVisible();
});

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 375, height: 812 }],
  ['landscape', { width: 844, height: 390 }],
]) {
  test(`quick race confirms readable selections with a full-width action (${name})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/three.min.js', route => route.fulfill({ path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'), contentType: 'application/javascript' }));
    await page.goto(process.env.STOCKCAR_TEST_FILE ? pathToFileURL(path.resolve(process.env.STOCKCAR_TEST_FILE)).href : '/');
    await page.evaluate(() => {
      window.quickRaceLaunches = [];
      window.launch3DRace = config => window.quickRaceLaunches.push(config);
    });
    await page.locator('#btn-quick-race').click();
    const confirm = page.locator('#btn-quick-race-confirm');
    await expect(confirm).toBeDisabled();
    await page.locator('[data-diff="pro"]').click();
    await expect(page.locator('.difficulty-card[aria-pressed="true"]')).toHaveCount(1);
    await expect(page.locator('[data-diff="pro"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(confirm).toBeDisabled();
    await page.locator('.quick-series-btn').first().click();
    await page.locator('.quick-series-btn').last().click();
    await expect(page.locator('.quick-series-btn[aria-pressed="true"]')).toHaveCount(1);
    await expect(page.locator('.quick-series-btn').last()).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.quickRaceLaunches.length)).toBe(0);
    await expect(confirm).toBeEnabled();
    await expect(confirm).toBeVisible();
    await expect(confirm).toHaveClass(/\bbtn-primary\b/);
    // Move off the selected tile so its resting state, rather than hover, is checked.
    await confirm.focus();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(220);
    const layout = await page.evaluate(() => {
      const button = document.getElementById('btn-quick-race-confirm');
      const footer = button.parentElement;
      const bounds = button.getBoundingClientRect();
      const footerStyle = getComputedStyle(footer);
      const selected = document.querySelector('.quick-series-btn.selected');
      return {
        width: bounds.width,
        available: footer.clientWidth - parseFloat(footerStyle.paddingLeft) - parseFloat(footerStyle.paddingRight),
        height: bounds.height,
        visible: bounds.top >= 0 && bounds.bottom <= innerHeight,
        background: getComputedStyle(button).backgroundColor,
        selectionBackground: getComputedStyle(selected).backgroundColor,
        selectionText: getComputedStyle(selected.querySelector('.quick-series-name')).color,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(layout.width).toBeCloseTo(layout.available, 0);
    expect(layout.height).toBeGreaterThanOrEqual(52);
    expect(layout.visible).toBe(true);
    expect(layout.background).toBe('rgb(201, 31, 57)');
    expect(layout.selectionBackground).toBe('rgb(245, 245, 242)');
    expect(layout.selectionText).toBe('rgb(19, 21, 23)');
    expect(layout.overflow).toBe(false);
    await page.screenshot({ path: path.resolve(__dirname, `../../.impeccable/review/quick-race-${name}.png`) });
    await confirm.press('Enter');
    await expect(page.locator('#quick-race-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.quickRaceLaunches.map(c => ({ difficulty: c.difficulty, seriesId: c.seriesId, fieldSize: c.fieldSize })))).toEqual([
      { difficulty: 'pro', seriesId: 'premier', fieldSize: 36 },
    ]);
    await page.evaluate(() => { showScreen('intro'); showQuickRaceScreen(); });
    await expect(page.locator('#btn-quick-race-confirm')).toBeDisabled();
    await expect(page.locator('.quick-series-btn[aria-pressed="true"]')).toHaveCount(0);
  });
}
