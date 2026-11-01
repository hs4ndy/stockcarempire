const {test,expect}=require('playwright/test'),path=require('path'),{pathToFileURL}=require('url');
for(const [width,file]of [[1440,'index.html'],[390,'releases/Stock-Car-Empire.html']])test(`post-race repair reminder clears after garage service ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto(pathToFileURL(path.resolve(file)).href);
 await page.evaluate(()=>{newGame('Repair Racing','Driver','Car');game.tutorial.status='skipped';game.difficulty='pro';game.money=1000000;enterGame();showTab('dashboard');});
 await expect(page.locator('#dashboard-repair-reminder')).toHaveCount(0);
 await page.evaluate(()=>{const c=game.cars[0];postRaceUpdate({carId:c.id,position:8,raceHealth:80,prize:0},0,[]);saveToSlot(0);game=null;loadFromSlot(0);enterGame();showTab('dashboard');});
 await expect(page.locator('#dashboard-repair-reminder')).toContainText('Your car needs repairs');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/repair-reminder-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Repair cars',exact:true}).click();await expect(page.locator('#main-content')).toContainText('Garage');await page.getByRole('button',{name:/^Repair \(/}).click();
 await page.evaluate(()=>showTab('dashboard'));await expect(page.locator('#dashboard-repair-reminder')).toHaveCount(0);
});
