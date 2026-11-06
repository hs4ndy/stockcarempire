const {test, expect} = require('playwright/test');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

for (const [level, position, file] of [
  [0, 4, 'index.html'],
  [1, 4, 'index.html'],
  [2, 4, 'index.html'],
  [2, 20, 'releases/Stock-Car-Empire.html'],
]) {
  test(`Career ${level} preserves actual ${position}th place through Continue (${file})`, async ({page}) => {
    test.setTimeout(120000);
    await page.route('**/three.min.js', route => route.fulfill({
      path: path.resolve('node_modules/three/build/three.min.js'),
    }));
    await page.goto(pathToFileURL(path.resolve(file)).href);
    await page.evaluate(level => {
      const apply = applyRaceResults;
      applyRaceResults = results => {
        window.classification142 = results.map(r => ({...r}));
        return apply(results);
      };
      newGame('Team', 'Test Driver', 'Car');
      game.currentSeries = level;
      game.cars[0].classId = SERIES[level].carClass;
      game.season.aiTeams = generateAITeams(level);
      game.season.calendar = generateCalendar(level);
      game.tutorial.status = 'skipped';
      game.money = 1e8;
      game.reputation = 100;
      for (const driver of HIREABLE_DRIVERS.slice(0, 3)) {
        buyCar('Mate');
        hireDriver(driver.id, game.cars.at(-1).id);
      }
      rebuildStandings();
      saveToSlot(0);
      enterGame();
      handleStartRace();
    }, level);
    await page.waitForFunction(() => window._r3d?.mirrorRT);
    const expected = await page.evaluate(position => {
      const engine = window._r3d;
      cancelAnimationFrame(engine._raf);
      engine._finishPhotoAttempted = true;
      const backing = new Set(buildEntryList(game.cars[0].id, currentRace().trackId).map(e => e.id));
      const omitted = engine.cars.filter(c => !backing.has(c.entrantId));
      const rivals = engine.cars.filter(c => !c.isPlayer && backing.has(c.entrantId));
      const order = [...omitted, ...rivals];
      order.splice(position - 1, 0, engine.player);
      engine.finishOrder = [];
      order.forEach((car, i) => {
        car.finished = false;
        car.dnf = false;
        car.z = engine.raceLength + order.length - i;
      });
      engine._checkFinish();
      return engine.finalOrder().map(c => c.entrantId);
    }, position);
    await expect(page.locator('#r3d-finish')).toContainText(`${position}th`);
    await page.locator('#r3d-finish button').click();
    await expect(page.locator('#results-modal')).toBeVisible();
    const actual = await page.evaluate(() => {
      const result = game.season.calendar[0].playerResult;
      const saved = JSON.parse(localStorage.getItem('sce_slot_0'));
      return {position:result.position, saved:saved.season.calendar[0].playerResult.position,
        standings:game.season.standings.length, points:result.points,
        expectedPoints:SERIES[game.currentSeries].points[result.position - 1] || 0};
    });
    expect(actual.position).toBe(position);
    expect(actual.saved).toBe(position);
    expect(actual.standings).toBe(expected.length);
    expect(actual.points).toBe(actual.expectedPoints);
    expect(await page.evaluate(() => window.classification142.map(r => r.entrantId))).toEqual(expected);
    await expect(page.locator('.player-result-hero')).toContainText(String(position));
  });
}

for (const file of ['index.html', 'releases/Stock-Car-Empire.html']) {
  test(`legacy duplicate teammates repair in standings and survive saving (${file})`, async ({page}) => {
    await page.route('**/three.min.js', route => route.fulfill({
      path: path.resolve('node_modules/three/build/three.min.js'),
    }));
    await page.goto(pathToFileURL(path.resolve(file)).href);
    const result = await page.evaluate(() => {
      newGame('Team', 'Test Driver', 'Car');
      game.currentSeries = 2;
      game.season.aiTeams = generateAITeams(2);
      game.money = 1e8;
      game.reputation = 100;
      game.tutorial.status = 'skipped';
      for (const driver of HIREABLE_DRIVERS.slice(0, 3)) {
        buyCar('Mate');
        hireDriver(driver.id, game.cars.at(-1).id);
      }
      rebuildStandings();
      for (const row of game.season.standings.filter(e => e.isTeamCar)) {
        delete row.driverId;
        row.points = 40;
        row.races = 2;
        game.season.standings.push({...row, id:'retired-'+row.id, points:20, races:1});
      }
      saveToSlot(0);
      if (!loadFromSlot(0)) throw new Error('Legacy save did not load');
      saveToSlot(0);
      if (!loadFromSlot(0)) throw new Error('Repaired save did not load');
      enterGame();
      showTab('standings');
      return {count:getStandings().length, mates:getStandings().filter(e=>e.isTeamCar)
        .map(e=>({name:standingIdentity(e).driver, points:e.points, races:e.races}))};
    });
    expect(result.count).toBe(43);
    expect(result.mates).toHaveLength(3);
    expect(new Set(result.mates.map(e=>e.name)).size).toBe(3);
    expect(result.mates.every(e=>e.points===60&&e.races===3)).toBe(true);
    await expect(page.locator('.standings-row.team-standing')).toHaveCount(3);
  });
}
