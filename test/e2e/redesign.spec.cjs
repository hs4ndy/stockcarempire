const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('playwright/test');
const review = path.resolve(__dirname, '../../.impeccable/review');

async function capture(page, name) {
  fs.mkdirSync(review, { recursive: true });
  await page.evaluate(() => {
    document.getElementById('toast-container').replaceChildren();
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: path.join(review, name + '.png'), fullPage: true, animations: 'disabled' });
}

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['laptop', { width: 1024, height: 768 }],
  ['tablet', { width: 768, height: 900 }],
  ['user', { width: 728, height: 920 }],
  ['mobile', { width: 375, height: 812 }],
]) {
  test(`all career screens preserve state, local typography, and viewport bounds (${name})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/three.min.js', route => route.fulfill({ path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'), contentType: 'application/javascript' }));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.locator('.intro-showcase img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await capture(page, 'intro-' + name);
    await page.locator('#btn-start-new').click();
    await page.locator('#inp-team-name').fill('Thunder Valley Racing');
    await page.locator('#inp-driver-name').fill('James Carter');
    await page.locator('#inp-car-name').fill('SC-01');
    await capture(page, 'setup-' + name);
    await page.locator('#btn-create-team').click();
    await capture(page, 'difficulty-' + name);
    await page.locator('#btn-begin-career').click();
    await capture(page, 'tutorial-' + name);
    await page.locator('[data-tutorial-action="skip"]').click();
    const original = await page.evaluate(() => JSON.stringify(game));
    for (const tab of ['dashboard', 'garage', 'team', 'schedule', 'market', 'standings', 'carstats', 'settings']) {
      await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
      await expect(page.locator(`.nav-btn[data-tab="${tab}"]`)).toHaveAttribute('aria-current', 'page');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      await expect(page.locator('#hdr-team')).toBeVisible();
      await capture(page, `${tab}-${name}`);
      if (tab === 'dashboard') {
        const action = await page.getByRole('button', {name:'Enter Race Weekend',exact:true}).boundingBox();
        expect(action.y + action.height).toBeLessThanOrEqual(viewport.height);
      }
      const activeBounds = await page.locator('.nav-btn.active').boundingBox();
      expect(activeBounds.x).toBeGreaterThanOrEqual(-1);
      expect(activeBounds.x + activeBounds.width).toBeLessThanOrEqual(viewport.width + 1);
    }
    expect(await page.evaluate(() => JSON.stringify(game))).toBe(original);
    await page.locator('#btn-hdr-save').click();
    await capture(page, 'save-' + name);
    await page.locator('.modal-close').click();
    await page.locator('.nav-btn[data-tab="dashboard"]').click();
    await page.getByRole('button', { name: 'Enter Race Weekend', exact: true }).click();
    await capture(page, 'weekend-' + name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.getByRole('button', { name: 'Back to Dashboard' }).click();
    await page.evaluate(() => {
      const results = simulateRace({ playerCarId: game.cars[0].id, trackId: currentRace().trackId, isHiredMode: false });
      document.body.insertAdjacentHTML('beforeend', renderRaceResultsModal(results.results, results.events, results.playerResult));
    });
    await capture(page, 'results-' + name);
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 375, height: 812 }],
  ['landscape', { width: 844, height: 390 }],
]) {
  test(`race HUD keeps mirror and controls usable without changing the renderer (${name})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/three.min.js', route => route.fulfill({ path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'), contentType: 'application/javascript' }));
    await page.goto('/');
    await page.locator('#btn-quick-race').click();
    await page.locator('.quick-series-btn').last().click();
    await page.waitForFunction(() => window._r3d?.racing);
    await page.evaluate(() => {
      cancelAnimationFrame(window._r3d._raf);
      document.getElementById('r3d-countdown').style.display = 'none';
    });
    const bounds = await page.evaluate(() => {
      const mirror = document.getElementById('r3d-mirror-wrap').getBoundingClientRect();
      const pause = document.getElementById('r3d-pause-btn').getBoundingClientRect();
      const tele = document.querySelector('.r3d-telemetry').getBoundingClientRect();
      const label = document.querySelector('.r3d-mirror-label').getBoundingClientRect();
      return { clear: mirror.right < pause.left, visible: mirror.width > 100 && mirror.height > 50, fits: tele.right <= innerWidth && tele.bottom <= innerHeight, labelOutside: label.top >= mirror.bottom && label.height < 30 };
    });
    expect(bounds).toEqual({ clear: true, visible: true, fits: true, labelOutside: true });
    await capture(page, 'race-' + name);
    await page.locator('#r3d-pause-btn').click();
    await expect(page.locator('#r3d-pause-overlay')).toHaveClass(/active/);
    await capture(page, 'pause-' + name);
    await page.locator('#r3d-pause-resume').click();
    await expect(page.locator('#r3d-pause-overlay')).not.toHaveClass(/active/);
    await page.evaluate(() => window._r3d.destroy());
  });
}
