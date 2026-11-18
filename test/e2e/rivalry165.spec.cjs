const {test,expect}=require('playwright/test');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

for (const [width,file] of [[1440,'index.html'],[390,'releases/Stock-Car-Empire.html']]) {
  test(`A Career contender declares a rivalry after player contact at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:844});
    await page.route('**/three.min.js', route => route.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));
    await page.goto(pathToFileURL(path.resolve(file)).href);
    await page.evaluate(() => {
      newGame('Team','Driver','Car');
      game.tutorial.status='skipped';
      game.difficulty='pro';
      game.raceRules={crashes:false,damage:false};
      saveToSlot(0);
      enterGame();
      handleStartRace();
    });
    await page.waitForFunction(() => window._r3d?.mirrorRT);
    const {id,name,contact} = await page.evaluate(() => {
      const engine=window._r3d;
      cancelAnimationFrame(engine._raf);
      const contender=engine.cars.find(car=>car.isContender);
      const ordinary=engine.cars.find(car=>!car.isContender&&!car.isPlayer);

      engine.player.lv=0;
      engine._sideContact(engine.player,contender,6,1,.3,1);
      engine.player.lv=2.25;
      engine._sideContact(engine.player,contender,2.25,1,.1,1);
      const graze=contender.playerRivalContact;
      engine.player.lv=6;
      engine._sideContact(engine.player,ordinary,6,1,.3,1);
      engine._sideContact(engine.player,contender,6,1,.3,1);

      const opponents=engine.cars.filter(car=>!car.isPlayer);
      engine.finishOrder=[...opponents.slice(0,3),engine.player,...opponents.slice(3)];
      engine.cars.forEach(car=>car.finished=true);
      window._r3dFinish(4);
      return {id:contender.entrantId,name:contender.label,contact:[graze,ordinary.playerRivalContact,contender.playerRivalContact]};
    });
    expect(contact[0]).toBeLessThan(.85);
    expect(contact[1]).toBeUndefined();
    expect(contact[2]).toBeGreaterThan(.85);
    expect(await page.evaluate(id=>JSON.parse(localStorage.getItem('sce_slot_0')).rivalries.includes(id),id)).toBe(true);
    await page.locator('#btn-close-results').click();
    await page.locator('#btn-close-news').click();
    const notice=page.getByRole('dialog',{name:'Rivalry Declared'});
    await expect(notice).toContainText(name);
    await expect(notice.getByRole('button',{name:'Continue'})).toBeFocused();
    await notice.getByRole('button',{name:'Continue'}).click();
    await expect(notice).toHaveCount(0);
    expect(await page.evaluate(id=>{
      declareContactRivalry([{entrantId:id,playerRivalContact:5}]);
      return game.rivalries.includes(id) && !game.pendingRivalry;
    },id)).toBe(true);
  });
}
