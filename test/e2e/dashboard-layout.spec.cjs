const path = require('node:path');
const { test, expect } = require('playwright/test');

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 375, height: 812 }],
]) {
  test(`dashboard stays aligned with disclosures, a full garage, and season end (${name})`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route('**/three.min.js', route => route.fulfill({
      path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'),
      contentType: 'application/javascript',
    }));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.locator('#btn-start-new').click();
    await page.locator('#inp-team-name').fill('Super Racing');
    await page.locator('#inp-driver-name').fill('Bob Smith');
    await page.locator('#inp-car-name').fill('The One');
    await page.locator('#btn-create-team').click();
    await page.locator('#btn-begin-career').click();
    await page.locator('[data-tutorial-action="skip"]').click();
    const before = await page.evaluate(() => JSON.stringify(game));

    for (const label of ['Recent results', 'Budget details', 'Driver profile and history']) {
      const summary = page.getByText(label, { exact: true });
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(summary.locator('..')).toHaveAttribute('open', '');
      await expect(summary).toBeFocused();
    }
    await expect(page.locator('.dashboard-grid .card:nth-child(3) .card-header')).toHaveText('Finances');
    expect(await page.evaluate(() => JSON.stringify(game))).toBe(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.evaluate(() => {
      document.getElementById('toast-container').replaceChildren();
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: testInfo.outputPath(`dashboard-expanded-${name}.png`), fullPage: true, animations: 'disabled' });

    await page.evaluate(() => {
      game.teamName = 'W'.repeat(40);
      game.driverName = 'W'.repeat(30);
      game.cars = [100, 60, 25, 0].map((condition, index) => ({
        ...game.cars[0], id: 'test-car-' + index, name: 'W'.repeat(30), condition,
      }));
      showTab('dashboard');
      document.getElementById('toast-container').replaceChildren();
    });
    await expect(page.locator('.dashboard-car-list .car-mini-row')).toHaveCount(4);
    const layout = await page.locator('.dashboard-grid').evaluate(grid => {
      const panels = [...grid.children].map(panel => {
        const r = panel.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      });
      const carRowsFit = [...grid.querySelectorAll('.car-mini-row')].every(row => {
        const r = row.getBoundingClientRect();
        return [...row.children].every(child => {
          const c = child.getBoundingClientRect();
          return c.left >= r.left && c.right <= r.right + 1;
        });
      });
      const namesFit = [...grid.querySelectorAll('.entry-name')].every(el => el.scrollWidth <= el.clientWidth + 1);
      return { panels, carRowsFit, namesFit };
    });
    expect(layout.carRowsFit).toBe(true);
    expect(layout.namesFit).toBe(true);
    if (viewport.width > 640) {
      for (const [a, b] of [[0, 1], [2, 3]]) {
        expect(Math.abs(layout.panels[a].bottom - layout.panels[b].bottom)).toBeLessThan(1);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`dashboard-long-${name}.png`), fullPage: true, animations: 'disabled' });

    await page.evaluate(() => {
      game.season.raceIndex = game.season.calendar.length;
      showTab('dashboard');
    });
    await expect(page.locator('.dashboard-race .card-header')).toHaveText('Season Complete');
    await expect(page.getByRole('button', { name: 'Begin Off-Season', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    expect(errors).toEqual([]);
  });
}
