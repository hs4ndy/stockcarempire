const {chooseHomeAction} = require('../helpers/home-menu.cjs');
const { test, expect } = require('playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

test('solo paint and number update in place and carry into the race', async ({ page }, info) => {
  await page.setViewportSize({width:390,height:740});
  await page.goto('/');
  await chooseHomeAction(page,'#btn-quick-race');
  await page.locator('.quick-series-btn').last().click();
  await page.locator('[data-diff="pro"]').click();
  await page.locator('.quick-wizard').screenshot({path:info.outputPath('race-setup.png')});
  await page.locator('#quick-next').click();
  const car = page.locator('#quick-player-1');
  await expect(page.locator('#quick-car-summary')).toContainText(/Premier.*Pro/);
  await car.getByRole('button',{name:'Blue',exact:true}).click();
  await expect(car.getByRole('button',{name:'Blue',exact:true})).toBeFocused();
  await expect(car.getByRole('button',{name:'Blue',exact:true})).toHaveAttribute('aria-pressed','true');
  await car.getByLabel('Custom color').fill('#256749');
  await car.getByLabel('Car number').fill('42');
  await car.getByLabel('Car number').press('Tab');
  await expect(car.locator('.quick-car-preview')).toHaveText('42');
  await page.locator('.quick-wizard').screenshot({path:info.outputPath('car-setup.png')});
  await page.locator('#quick-back').click();
  await page.locator('#quick-next').click();
  await expect(car.getByLabel('Custom color')).toHaveValue('#256749');
  await page.evaluate(() => { window.launch3DRace = config => { window.startConfig = config; }; });
  await page.locator('#btn-quick-race-confirm').click();
  expect(await page.evaluate(() => window.startConfig)).toMatchObject({
    playerNumber:42, playerColor:'#256749', dualPlayer:false, difficulty:'pro', seriesId:'premier',
  });
});

test('quick race confirmation starts the playable race', async ({ page }) => {
  await page.route('**/three.min.js', route => route.fulfill({ path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'), contentType: 'application/javascript' }));
  await page.goto(process.env.STOCKCAR_TEST_FILE ? pathToFileURL(path.resolve(process.env.STOCKCAR_TEST_FILE)).href : '/');
  await chooseHomeAction(page,'#btn-quick-race');
  await page.locator('[data-diff="beginner"]').click();
  await page.locator('.quick-series-btn').first().click();
  expect(await page.evaluate(() => Boolean(window._r3d?.racing))).toBe(false);
  if(await page.locator('#quick-next').isVisible()) await page.locator('#quick-next').click();await page.locator('#btn-quick-race-confirm').click();
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
    await chooseHomeAction(page,'#btn-quick-race');
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
    await page.locator('#quick-next').click();
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
    expect(layout.width).toBeCloseTo(layout.available - 132, 0);
    expect(layout.height).toBeGreaterThanOrEqual(44);
    expect(layout.visible).toBe(true);
    expect(layout.background).toBe('rgb(201, 31, 57)');
    expect(layout.selectionBackground).toBe('rgb(245, 245, 242)');
    expect(layout.selectionText).toBe('rgb(19, 21, 23)');
    expect(layout.overflow).toBe(false);
    await page.screenshot({ path: path.resolve(__dirname, `../../.impeccable/review/quick-race-${name}.png`) });
    await confirm.press('Enter');
    await expect(page.locator('#quick-race-modal')).toHaveCount(0);
    expect(await page.evaluate(() => window.quickRaceLaunches.map(c => ({ difficulty: c.difficulty, seriesId: c.seriesId, fieldSize: c.fieldSize })))).toEqual([
      { difficulty: 'pro', seriesId: 'premier', fieldSize: 40 },
    ]);
    await page.evaluate(() => { showScreen('intro'); showQuickRaceScreen(); });
    await expect(page.locator('#quick-next')).toBeEnabled();
    await expect(page.locator('.quick-series-btn[aria-pressed="true"]')).toHaveAttribute('data-field-size','40');
  });
}
