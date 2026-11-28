const {chooseHomeAction} = require('../helpers/home-menu.cjs');
const {test,expect}=require('playwright/test');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
async function open(page,file='index.html') {
  await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));
  await page.goto(pathToFileURL(path.resolve(file)).href);
}
for(const [width,height,file,selected] of [[1440,900,'index.html',2],[1024,600,'index.html',0],[390,844,'releases/Stock-Car-Empire.html',1],[844,390,'index.html',2]]) {
  test(`Quick length choices, layout and actual distance ${width}`,async({page})=>{
    await page.setViewportSize({width,height});await open(page,file);
    await chooseHomeAction(page,'#btn-quick-race');await page.locator('.quick-series-btn').first().click();
    const distance=page.locator('#quick-race-length');
    await expect(distance).toHaveValue('standard');
    await expect(distance.locator('option')).toHaveText(['Short','Normal','Long']);
    await distance.selectOption({index:selected});
    fs.mkdirSync('.impeccable/review',{recursive:true});await page.screenshot({path:`.impeccable/review/length153-quick-${width}.png`});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('#quick-next').click();await page.locator('#btn-quick-race-confirm').click();
    await page.waitForFunction(()=>window._r3d?.mirrorRT);
    expect(await page.evaluate(()=>window._r3d.raceLength)).toBe(17250*[.75,1,1.5][selected]);
    await page.evaluate(()=>{cancelAnimationFrame(window._r3d._raf);window._r3d.player.z=window._r3d.raceLength+1;window._r3d._checkFinish();});
    await page.locator('#r3d-finish button').click();await page.getByRole('button',{name:'Race Again',exact:true}).click();
    await page.waitForFunction(()=>window._r3d?.mirrorRT);
    expect(await page.evaluate(()=>window._r3d.config.raceLength)).toBe(['short','standard','long'][selected]);
  });
}
test('Dual Quick Race shares selected distance and retains it after both players finish',async({page})=>{
  await open(page);await chooseHomeAction(page,'#btn-dual-race');await page.locator('.quick-series-btn').last().click();
  await page.locator('#quick-race-length').selectOption('short');
  await page.locator('#quick-next').click();await page.locator('#btn-quick-race-confirm').click();
  await page.waitForFunction(()=>window._r3d?.player2&&window._r3d?.mirrorRT);
  expect(await page.evaluate(()=>window._r3d.raceLength)).toBe(14062.5);
  await page.evaluate(()=>{const e=window._r3d;cancelAnimationFrame(e._raf);e.player.z=e.raceLength+2;e.player2.z=e.raceLength+1;e._checkFinish();});
  await page.locator('#r3d-finish button').click();await expect(page.locator('.quick-result-player')).toHaveCount(2);
  await page.getByRole('button',{name:'Race Again',exact:true}).click();await page.waitForFunction(()=>window._r3d?.player2&&window._r3d?.mirrorRT);
  expect(await page.evaluate(()=>window._r3d.raceLength)).toBe(14062.5);
});

test('Career length persists, old saves default Normal, failed writes revert and actual Premier length follows selection',async({page})=>{
  await open(page);
  await page.evaluate(()=>{newGame('Team','Driver','Car');game.currentSeries=2;game.cars[0].classId=SERIES[2].carClass;game.season.aiTeams=generateAITeams(2);game.season.calendar=generateCalendar(2);game.tutorial.status='skipped';rebuildStandings();saveToSlot(0);enterGame();showTab('settings');});
  await page.locator('#career-race-length').selectOption('long');
  expect(await page.evaluate(()=>{loadFromSlot(0);return game.raceLength;})).toBe('long');
  await page.evaluate(()=>showTab('settings'));
  await page.locator('#career-race-length').scrollIntoViewIfNeeded();await page.screenshot({path:'.impeccable/review/length153-career.png'});
  await page.evaluate(()=>{const original=Storage.prototype.setItem;try{Storage.prototype.setItem=()=>{throw new Error('quota');};setRaceLength('career','short');}finally{Storage.prototype.setItem=original;}});
  expect(await page.evaluate(()=>game.raceLength)).toBe('long');
  await page.evaluate(()=>handleStartRace());await page.waitForFunction(()=>window._r3d?.mirrorRT);
  expect(await page.evaluate(()=>window._r3d.raceLength)).toBe(18750*1.5);
  expect(await page.evaluate(()=>{const save=JSON.parse(localStorage.getItem('sce_slot_0'));delete save.raceLength;localStorage.setItem('sce_slot_0',JSON.stringify(save));loadFromSlot(0);return game.raceLength;})).toBe('standard');
});
