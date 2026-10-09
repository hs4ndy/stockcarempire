const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('playwright/test');

for (const [name, url] of [
  ['source', '/'],
  ['offline', pathToFileURL(path.resolve(__dirname, '../../releases/Stock-Car-Empire.html')).href],
]) {
  test(`only driver-owner careers can load, progress, simulate and drive (${name})`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/three.min.js', route => route.fulfill({ path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'), contentType: 'application/javascript' }));
    await page.goto(url);
    await page.locator('#btn-start-new').click();
    await page.locator('#inp-team-name').fill('Owner Driver Racing');
    await page.locator('#inp-driver-name').fill('Owner Driver');
    await page.locator('#inp-car-name').fill('Player Car');
    await page.locator('#btn-create-team').click();
    await page.locator('#btn-begin-career').click();
    await page.locator('[data-tutorial-action="skip"]').click();
    expect(await page.evaluate(() => ['driverMode', 'hiredTeamId', 'hiredSalary', 'premierChoicePending'].some(key => key in game))).toBe(false);
    expect(await page.evaluate(() => [typeof chooseCareerPath, typeof renderPremierChoiceModal, typeof showPremierChoiceModal, typeof selectCareerChoice, typeof confirmCareerChoice])).toEqual(Array(5).fill('undefined'));

    // Promotion reaches Premier without a role choice or role metadata.
    await page.evaluate(() => {
      game.currentSeries = 1;
      game.season.calendar = generateCalendar(1);
      game.season.aiTeams = generateAITeams(1);
      rebuildStandings();
      game.season.standings[0].points = 10000;
      game.season.raceIndex = game.season.calendar.length;
      handleEndSeason();
    });
    await expect(page.locator('#end-season-modal')).toBeVisible();
    expect(await page.evaluate(() => game.currentSeries)).toBe(2);
    await page.evaluate(() => handleDismissEndSeason());
    await expect(page.locator('#premier-choice-modal')).toHaveCount(0);

    // Actual load handlers migrate both removed roles and ordinary older saves.
    for (const role of ['driver', 'manager', 'hired']) {
      const original = await page.evaluate(role => {
        currentSlot = null;
        newGame('Legacy Racing', 'Legacy Driver', 'Legacy Car');
        game.tutorial.status = 'skipped';
        game.money = 900000;
        buyCar('Teammate');
        hireDriver(HIREABLE_DRIVERS[0].id, game.cars[1].id);
        game.driverMode = role;
        game.hiredTeamId = game.season.aiTeams[0].id;
        game.hiredSalary = 8000;
        game.premierChoicePending = true;
        game.cars[0].assignedDriverId = null;
        const original = JSON.parse(JSON.stringify(game));
        localStorage.setItem('sce_slot_0', JSON.stringify(game));
        handleLoadFromSlot(0);
        return original;
      }, role);
      const expected = structuredClone(original);
      for (const key of ['driverMode', 'hiredTeamId', 'hiredSalary', 'premierChoicePending']) delete expected[key];
      expected.cars[0].assignedDriverId = 'player';
      expect(await page.evaluate(() => game)).toEqual(expected);
      await page.evaluate(() => showTab('carstats'));
      await expect(page.locator('#main-content')).toContainText('Driver / Owner');
      await expect(page.locator('#main-content')).not.toContainText('Team Manager');
      await page.evaluate(() => showTab('team'));
      await expect(page.locator('.team-roster')).toContainText('Legacy Driver');
      await expect(page.locator('.team-roster')).toContainText('Teammate');
      await page.evaluate(() => handleOpenRaceWeekend());
      await expect(page.locator('input[name="drive-car"]')).toHaveCount(1);
      await page.getByRole('button', { name: 'Simulate Race', exact: true }).click();
      await expect(page.locator('#results-modal')).toBeVisible();
      const result = await page.evaluate(() => game.season.calendar[0].playerResult);
      expect(result.carId).toBe(expected.cars[0].id);
      expect(result.teamName).toBe('Legacy Racing');
      expect(result.isPlayer).toBe(true);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sce_slot_0')).driverMode)).toBeUndefined();
      await page.locator('#btn-close-results').click();
    }

    // A fully occupied legacy garage cannot race as an owner-only career,
    // silently commandeer a hired driver's seat, or charge an entry fee.
    const blockedMoney = await page.evaluate(() => {
      currentSlot = null;
      newGame('Occupied Racing', 'Player Driver', 'Occupied Car');
      game.tutorial.status = 'skipped';
      game.money = 500000;
      hireDriver(HIREABLE_DRIVERS[0].id, game.cars[0].id);
      game.driverMode = 'manager';
      localStorage.setItem('sce_slot_1', JSON.stringify(game));
      handleLoadFromSlot(1);
      handleOpenRaceWeekend();
      return game.money;
    });
    for (const action of ['Simulate Race', 'Drive Race']) {
      await page.getByRole('button', { name: action, exact: true }).click();
      await expect(page.locator('#toast-container')).toContainText('You need an available car to drive');
      expect(await page.evaluate(() => game.money)).toBe(blockedMoney);
      expect(await page.evaluate(() => game.season.raceIndex)).toBe(0);
      await expect(page.locator('#results-modal')).toHaveCount(0);
      expect(await page.evaluate(() => !!window._r3d?.renderer)).toBe(false);
    }
    await page.evaluate(() => { fireDriver(HIREABLE_DRIVERS[0].id); handleOpenRaceWeekend(); });
    await page.getByRole('button', { name: 'Drive Race', exact: true }).click();
    await page.waitForFunction(() => window._r3d?.mirrorRT);
    await expect(page.locator('.r3d-order-head')).toHaveText('Leaderboard');
    expect(await page.evaluate(() => window._r3d.config.playerCarId)).toBe(await page.evaluate(() => game.cars[0].id));
    await page.evaluate(() => { window._r3d.done = true; cancelAnimationFrame(window._r3d._raf); window._r3d._showFinish(1); });
    await page.locator('#r3d-finish').getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.locator('#results-modal')).toBeVisible();
    expect(await page.evaluate(() => game.season.calendar[0].playerResult.isPlayer)).toBe(true);
    expect(errors).toEqual([]);
  });
}
