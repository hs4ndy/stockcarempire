const path = require('node:path');
const fs = require('node:fs');
const { test, expect } = require('playwright/test');
const evidence = path.resolve(__dirname, '../../.impeccable/review');

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['user', { width: 728, height: 920 }],
  ['mobile', { width: 375, height: 812 }],
]) {
  test(`Team views preserve the career and hiring/release works (${name})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/three.min.js', r => r.fulfill({ path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'), contentType: 'application/javascript' }));
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.evaluate(() => {
      newGame('Thunder Valley Racing', 'James Carter', 'SC-01');
      game.tutorial.status = 'skipped';
      game.money = 250000;
      buyCar('Blue Ridge');
      buyCar('Night Runner');
      hireDriver(HIREABLE_DRIVERS[0].id, game.cars[1].id);
      hireStaff(STAFF_TYPES[0].id);
      game.history = [{ year: 1, series: SERIES[0].name, finalPos: 1, wins: 5, champion: true, payout: 50000 }];
      game.season.year = 2;
      game.titles = 1;
      game.cars[0].races = 18;
      game.cars[0].wins = 5;
      updateHeader(); showScreen('game'); showTab('team');
    });
    await page.evaluate(() => document.fonts.ready);
    const original = await page.evaluate(() => JSON.stringify(game));
    await expect(page.locator('.team-roster')).toContainText('James Carter');
    await expect(page.locator('.team-roster')).toContainText('Blue Ridge');
    const shot = async state => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      fs.mkdirSync(evidence, { recursive: true });
      await page.screenshot({ path: path.join(evidence, `team-refinement-${state}-${name}.png`), fullPage: true, animations: 'disabled' });
    };
    await shot('drivers');
    if (name === 'desktop') {
      const recruitment = await page.locator('.team-recruitment').boundingBox();
      expect(recruitment.y + recruitment.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    await page.locator('[data-team-view="staff"]').click();
    await expect(page.locator('[data-team-view="staff"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-team-view="staff"]')).toBeFocused();
    await expect(page.locator('.team-roster')).toContainText('Crew Chief');
    await shot('staff');
    await page.locator('[data-team-view="drivers"]').click();
    expect(await page.evaluate(() => JSON.stringify(game))).toBe(original);

    const target = await page.evaluate(() => HIREABLE_DRIVERS[1].name);
    await page.getByRole('button', { name: `Hire ${target}`, exact: true }).click();
    await page.getByRole('button', { name: 'Hire Driver', exact: true }).click();
    await expect(page.locator('.team-roster')).toContainText(target);
    expect(await page.evaluate(() => game.hiredDrivers.length)).toBe(2);
    await expect(page.locator('.team-recruitment').getByRole('button', { name: 'No Free Car' }).first()).toBeDisabled();
    await page.getByRole('button', { name: 'Buy another car', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Buy Car \(/ })).toBeVisible();
    await page.locator('.nav-btn[data-tab="team"]').click();
    page.once('dialog', d => d.accept());
    await page.locator('.team-roster .staff-row').filter({ hasText: target }).getByRole('button', { name: 'Release', exact: true }).click();
    expect(await page.evaluate(() => game.hiredDrivers.length)).toBe(1);

    await page.locator('[data-team-view="staff"]').click();
    await page.getByRole('button', { name: 'Hire Race Engineer', exact: true }).click();
    await expect(page.locator('.team-roster')).toContainText('Race Engineer');
    expect(await page.evaluate(() => game.staff.length)).toBe(2);
    page.once('dialog', d => d.accept());
    await page.locator('.team-roster .staff-row').filter({ hasText: 'Race Engineer' }).getByRole('button', { name: 'Release Staff', exact: true }).click();
    expect(await page.evaluate(() => game.staff.length)).toBe(1);

    await page.evaluate(() => { game.money = 0; renderTab('team'); });
    await expect(page.locator('.team-recruitment').getByRole('button', { name: 'Not Enough Cash' }).first()).toBeDisabled();
    await page.evaluate(() => { document.getElementById('toast-container').replaceChildren(); showTab('carstats'); window.scrollTo(0, 0); });
    await expect(page.locator('.champ-stats')).toContainText('Championship Finish');
    await expect(page.locator('.champ-stats')).toContainText('Cash Earned');
    await expect(page.locator('.champ-stats > div')).toHaveCount(3);
    await expect(page.locator('#main-content')).toContainText('Total Cash Earned');
    await shot('career');
    expect(errors).toEqual([]);
  });
}
