const path = require('node:path');
const { test, expect } = require('playwright/test');

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 375, height: 812 }],
]) {
  test(`career menus keep decisions visible and reveal details on demand (${name})`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route('**/three.min.js', route => route.fulfill({
      path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'),
      contentType: 'application/javascript',
    }));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.locator('#btn-start-new').click();
    await page.locator('#inp-team-name').fill('Clarity Racing');
    await page.locator('#inp-driver-name').fill('Alex Driver');
    await page.locator('#inp-car-name').fill('First Car');
    await page.locator('#btn-create-team').click();
    await page.locator('#btn-begin-career').click();
    await page.locator('[data-tutorial-action="skip"]').click();
    const initialGame = await page.evaluate(() => JSON.stringify(game));

    await expect(page.getByRole('button', { name: 'Enter Race Weekend', exact: true })).toBeVisible();
    await page.getByText('Recent results', { exact: true }).click();
    await expect(page.getByText('Your results will appear here after your first race.', { exact: true })).toBeVisible();
    await page.getByText('Recent results', { exact: true }).click();
    await page.getByText('Driver profile and history', { exact: true }).click();
    await expect(page.getByText('Driver Skill', { exact: true })).toBeVisible();
    await page.getByText('Driver profile and history', { exact: true }).click();
    const budget = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Budget details' }) });
    await expect(budget).not.toHaveAttribute('open');
    await budget.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(budget).toHaveAttribute('open', '');
    await expect(budget).toContainText('Entry fees and repairs are paid separately.');
    await page.evaluate(() => {
      document.getElementById('toast-container').replaceChildren();
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: testInfo.outputPath(`dashboard-${name}.png`), fullPage: true, animations: 'disabled' });

    for (const tab of ['garage', 'team', 'market', 'settings']) {
      await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    }
    await page.locator('.nav-btn[data-tab="market"]').click();
    const specs = page.locator('details').filter({ hasText: 'Car specifications and resale' });
    await expect(specs).not.toHaveAttribute('open');
    await specs.locator('summary').click();
    await expect(specs.getByText('Base Handling', { exact: true })).toBeVisible();
    await page.getByText('Explore loan options', { exact: true }).click();
    await expect(page.getByText('Repay on time', { exact: false })).toBeVisible();
    await page.getByText('Choose a cause', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Donate', exact: true }).first()).toBeVisible();

    await page.locator('.nav-btn[data-tab="garage"]').click();
    await expect(page.getByRole('button', { name: 'Upgrade Car', exact: true })).toBeVisible();
    await page.evaluate(() => document.getElementById('toast-container').replaceChildren());
    await page.screenshot({ path: testInfo.outputPath(`garage-collapsed-${name}.png`), fullPage: true, animations: 'disabled' });
    await page.getByText('Performance and race record', { exact: true }).click();
    await expect(page.getByText('Reliability', { exact: true })).toBeVisible();
    await page.getByText('Customize and manage car', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Change Number', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`garage-${name}.png`), fullPage: true, animations: 'disabled' });
    expect(await page.evaluate(() => JSON.stringify(game))).toBe(initialGame);
    await page.getByRole('button', { name: 'Paint #3498db', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Paint #3498db', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Paint #3498db', exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Rename', exact: true })).toBeVisible();

    await page.locator('.nav-btn[data-tab="dashboard"]').click();
    await page.getByRole('button', { name: 'Enter Race Weekend', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Drive Race', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Simulate Race', exact: true })).toBeVisible();
    await page.getByText('Simulation track details', { exact: true }).click();
    await expect(page.getByText('Speed Emphasis', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.getByRole('button', { name: 'Back to Dashboard', exact: true }).click();
    await expect(page.locator('.cmd-strip')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
