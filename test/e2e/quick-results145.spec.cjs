const {test, expect} = require('playwright/test');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const fs = require('node:fs');

async function finish(page, winner) {
  await page.waitForFunction(() => window._r3d?.mirrorRT);
  const starts = await page.evaluate(winner => {
    const e = window._r3d;
    cancelAnimationFrame(e._raf);
    const humans = [e.player, ...(e.player2 ? [e.player2] : [])];
    const order = e.cars.filter(c => !c.isPlayer);
    for (const [i, car] of humans.entries()) order.splice(i === winner ? 0 : 3, 0, car);
    order.forEach((car,i) => {car.z=e.raceLength+order.length-i;car.finished=false;});
    e.finishOrder=[];
    e._checkFinish();
    return {...e._newsGrid};
  }, winner);
  await page.locator('#r3d-finish button').click();
  await expect(page.locator('#screen-quick-results')).toBeVisible();
  return starts;
}

for (const [name, players, width, height, file] of [
  ['single',1,1440,900,'index.html'],
  ['desktop',2,1440,900,'index.html'],
  ['user-1024',2,1024,600,'index.html'],
  ['mobile',2,390,844,'releases/Stock-Car-Empire.html'],
]) {
  test(`Quick Race finish, replay, settings and session reset ${name}`, async ({page}) => {
    test.setTimeout(120000);
    const errors=[];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({width,height});
    await page.route('**/three.min.js', route => route.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));
    await page.goto(pathToFileURL(path.resolve(file)).href);
    await page.evaluate(players => {
      newGame('Untouched Career','Driver','Car');
      window.career145=JSON.stringify(game);
      quickRacePlayers=players;
      quickRaceDifficulty='allout';
      quickRaceRules.damage=false;
      quickRaceCars[0].number=17;
      quickRaceCars[1].number=42;
      handleStartQuickRace(26);
    }, players);
    const starts=await finish(page, players===2 ? 1 : 0);
    const data=await page.evaluate(() => ({
      players:quickRaceLastResult.players, race:quickRaceCompleted,
      photo:!!quickRaceLastResult.photo?.canvas, stopped:window._r3d===null,
      career:JSON.stringify(game)===window.career145,
    }));
    expect(data.photo).toBe(true);
    expect(data.stopped).toBe(true);
    expect(data.career).toBe(true);
    expect(data.players).toHaveLength(players);
    expect(data.players.map(p=>p.start)).toEqual(data.players.map(p=>starts[p.entrantId]));
    expect(data.players.at(-1).wins).toBe(1);
    await expect(page.locator('.quick-result-winner')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width>700) expect(await page.evaluate(() => document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    fs.mkdirSync('.impeccable/review',{recursive:true});
    await page.screenshot({path:`.impeccable/review/quick-results145-${name}.png`,fullPage:true});
    await page.getByRole('button',{name:'Change Settings',exact:true}).click();
    await expect(page.locator('[data-field-size="26"]')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('[data-diff="allout"]')).toHaveAttribute('aria-pressed','true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#quick-race-modal')).toHaveCount(0);
    await page.getByRole('button',{name:'Race Again',exact:true}).click();
    await finish(page,0);
    expect(await page.evaluate(() => quickRaceCompleted)).toBe(2);
    expect(await page.evaluate(() => quickRaceWins.slice())).toEqual(players===2 ? [1,1] : [2,0]);
    await page.evaluate(() => {quickRaceLastResult.photo=null;showQuickRaceResults();});
    await expect(page.locator('#quick-finish-photo')).toContainText('Finish photo unavailable');
    if (players===2) {
      await page.evaluate(() => {quickRaceCars[1].number=quickRaceCars[0].number;});
      await page.getByRole('button',{name:'Race Again',exact:true}).click();
      await expect(page.locator('#quick-number-warning')).toBeVisible();
      expect(await page.evaluate(() => window._r3d)).toBe(null);
      await page.evaluate(() => {quickRaceCars[1].number=42;});
      await page.keyboard.press('Escape');
    }
    await page.getByRole('button',{name:'Main Menu',exact:true}).click();
    expect(await page.evaluate(() => [quickRaceCompleted,...quickRaceWins])).toEqual([0,0,0]);
    await expect(page.locator('#btn-quick-race')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
