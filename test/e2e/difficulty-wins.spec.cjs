const {test,expect}=require('playwright/test');const path=require('path'),{pathToFileURL}=require('url');
for(const [width,file] of [[1440,'index.html'],[390,'releases/Stock-Car-Empire.html']]) test(`Career difficulty wins persist separately ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto(pathToFileURL(path.resolve(file)).href);
 const result=await page.evaluate(()=>{
  newGame('Team','Driver','Car');game.tutorial.status='skipped';game.difficulty='pro';delete game.winsByDifficulty;
  const c=game.cars[0];const finish=position=>postRaceUpdate({carId:c.id,position,prize:0},0,[]);
  finish(1);finish(4);game.difficulty='semipro';finish(1);game.difficulty='pro';finish(1);
  saveToSlot(0);game=null;loadFromSlot(0);enterGame();showTab('settings');return game.winsByDifficulty;
 });expect(result).toEqual({pro:2,semipro:1});
 await expect(page.locator('[data-diff="pro"] .difficulty-wins')).toHaveText('2 wins');await expect(page.locator('[data-diff="semipro"] .difficulty-wins')).toHaveText('1 win');await expect(page.locator('[data-diff="beginner"] .difficulty-wins')).toHaveText('0 wins');
 expect(await page.locator('.difficulty-wins').first().evaluate(el=>getComputedStyle(el).fontWeight)).toBe('400');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`.impeccable/review/difficulty-wins-${width}.png`,fullPage:true});
 await page.evaluate(()=>showScreen('intro'));await page.locator('#btn-quick-race').click();await expect(page.locator('#quick-race-modal .difficulty-wins')).toHaveCount(0);
});

