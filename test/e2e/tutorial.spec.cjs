const path = require('node:path');
const { test, expect } = require('playwright/test');

const THREE_BUILD = path.resolve(__dirname, '../../node_modules/three/build/three.min.js');

test.beforeEach(async ({ page }) => {
  await page.route('**/three.min.js', route => route.fulfill({
    path: THREE_BUILD,
    contentType: 'application/javascript',
  }));
});

async function createCareer(page) {
  await page.goto('/');
  await page.locator('#btn-start-new').click();
  await page.locator('#inp-team-name').fill('Tutorial Test Racing');
  await page.locator('#inp-driver-name').fill('Taylor Test');
  await page.locator('#inp-car-name').fill('First Car');
  await page.locator('#btn-create-team').click();
  await page.locator('#btn-begin-career').click();
  await expect(page.locator('#career-tutorial')).toBeVisible();
}

test('a new career offers the tutorial, and skipping stays with that save', async ({ page }, testInfo) => {
  await createCareer(page);
  await expect(page.locator('#career-tutorial-title')).toHaveText('Learn the ropes');
  await page.screenshot({ path: testInfo.outputPath('tutorial-offer-desktop.png') });
  await page.locator('[data-tutorial-action="skip"]').click();
  await expect(page.locator('#career-tutorial')).toHaveCount(0);
  expect(await page.evaluate(() => game.tutorial.status)).toBe('skipped');

  await page.locator('#btn-hdr-save').click();
  await page.locator('#save-slot-modal [onclick="handleSaveToSlot(0)"]').click();
  await page.reload();
  await page.locator('#btn-load-game').click();
  await page.locator('#save-slot-modal [onclick="handleLoadFromSlot(0)"]').click();
  await expect(page.locator('#career-tutorial')).toHaveCount(0);

  // A pre-tutorial career has no tutorial field and should load as before.
  await page.evaluate(() => {
    const old = JSON.parse(localStorage.getItem('sce_slot_0'));
    delete old.tutorial;
    localStorage.setItem('sce_slot_0', JSON.stringify(old));
  });
  await page.reload();
  await page.locator('#btn-load-game').click();
  await page.locator('#save-slot-modal [onclick="handleLoadFromSlot(0)"]').click();
  await expect(page.locator('#career-tutorial')).toHaveCount(0);
});

test('guided screens, back navigation, save, and restart work on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 812 });
  await createCareer(page);
  await page.locator('[data-tutorial-action="start"]').click();
  await expect(page.locator('#career-tutorial-title')).toHaveText('Your command center');
  await expect(page.locator('[data-tutorial-action="skip"]')).toHaveCount(0);
  await page.locator('[data-tutorial-action="next"]').click();
  await expect(page.locator('#career-tutorial-title')).toHaveText('Watch your budget');
  await page.locator('[data-tutorial-action="back"]').click();
  await expect(page.locator('#career-tutorial-title')).toHaveText('Your command center');
  await page.locator('[data-tutorial-action="next"]').click();
  await page.locator('[data-tutorial-action="next"]').click();
  await expect(page.locator('.nav-btn[data-tab="garage"]')).toHaveClass(/active/);
  await page.screenshot({ path: testInfo.outputPath('tutorial-garage-mobile.png') });

  const bounds = await page.locator('.career-tutorial-panel').evaluate(el => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom,
      width: innerWidth, height: innerHeight };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width);
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);

  await page.locator('[data-tutorial-action="save"]').click();
  await page.locator('#save-slot-modal [onclick="handleSaveToSlot(0)"]').click();
  await page.reload();
  await page.locator('#btn-load-game').click();
  await page.locator('#save-slot-modal [onclick="handleLoadFromSlot(0)"]').click();
  await expect(page.locator('#career-tutorial-title')).toHaveText('Your command center');
  await expect(page.locator('[data-tutorial-action="skip"]')).toHaveCount(0);
});

test('practice has its own short finish and never changes career progress', async ({ page }) => {
  test.setTimeout(90_000);
  await createCareer(page);
  await page.locator('[data-tutorial-action="start"]').click();
  for (let i = 0; i < 10; i++) await page.locator('[data-tutorial-action="next"]').click();
  await expect(page.locator('#career-tutorial-title')).toHaveText('Practice behind the wheel');
  const before = await page.evaluate(() => JSON.stringify(game));
  await page.locator('[data-tutorial-action="next"]').click();
  await page.waitForFunction(() => window._r3d?.racing);
  const engineState = await page.evaluate(() => ({
    length: window._r3d.raceLength,
    normalLength: R3D.TRACK_LEN,
    finishZ: window._r3d.finishGroup.position.z,
    tip: document.getElementById('r3d-practice-tip')?.textContent,
  }));
  expect(engineState).toMatchObject({ length: 3500, normalLength: 15000, finishZ: 3500 });
  expect(engineState.tip).toContain('steer');

  const finished = await page.evaluate(() => {
    const engine = window._r3d;
    cancelAnimationFrame(engine._raf);
    for (let i = 0; i < 120 * 55 && !engine.done; i++) engine._update(1 / 120);
    return engine.done;
  });
  expect(finished).toBe(true);
  await expect(page.locator('#r3d-finish')).toContainText('Practice Complete');
  await page.locator('#r3d-finish button').click();
  await expect(page.locator('#career-tutorial-title')).toHaveText('You are ready');
  expect(await page.evaluate(() => JSON.stringify(game))).toBe(before);
  await page.locator('[data-tutorial-action="next"]').click();
  await expect(page.locator('#career-tutorial')).toHaveCount(0);
  expect(await page.evaluate(() => ({
    status: game.tutorial.status,
    firstRace: game.season.calendar[0].status,
    raceIndex: game.season.raceIndex,
  }))).toEqual({ status: 'completed', firstRace: 'upcoming', raceIndex: 0 });

  await page.locator('#btn-hdr-save').click();
  await page.locator('#save-slot-modal [onclick="handleSaveToSlot(0)"]').click();
  await page.goto('/');
  await page.locator('#btn-load-game').click();
  await page.locator('#save-slot-modal [onclick="handleLoadFromSlot(0)"]').click();
  await expect(page.locator('#career-tutorial')).toHaveCount(0);

  await page.goto('/');
  await page.locator('#btn-quick-race').click();
  await page.locator('.quick-series-btn').first().click();
  await page.locator("#btn-quick-race-confirm").click();
  await page.waitForFunction(() => Boolean(window._r3d));
  expect(await page.evaluate(() => ({
    length: window._r3d.raceLength,
    finishZ: window._r3d.finishGroup.position.z,
  }))).toEqual({ length: 15000, finishZ: 15000 });
});
