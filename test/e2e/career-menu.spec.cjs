const {test,expect}=require('playwright/test');const path=require('path');const {pathToFileURL}=require('url');
for(const width of [1440,375])test(`career menu preserves bound and unsaved careers ${width}`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.goto(pathToFileURL(path.resolve('releases/Stock-Car-Empire.html')).href);await expect(page.locator('#btn-continue-career')).toBeHidden();
 for(const bound of [false,true]){
 await page.evaluate(bound=>{newGame('Menu Test','Driver','Car');game.tutorial.status='skipped';if(bound)saveToSlot(2);else localStorage.setItem('sce_slot_0','preserve');enterGame();window.beforeMenu=JSON.stringify(game);},bound);
 await expect(page.locator('#btn-hdr-menu')).toBeInViewport();await page.locator('#btn-hdr-menu').click();await expect(page.locator('#btn-continue-career')).toBeVisible();expect(await page.evaluate(()=>JSON.stringify(game)===window.beforeMenu)).toBe(true);
 if(!bound)expect(await page.evaluate(()=>localStorage.getItem('sce_slot_0'))).toBe('preserve');
 await page.locator('#btn-continue-career').click();await expect(page.locator('#btn-hdr-menu')).toBeVisible();expect(await page.evaluate(()=>JSON.stringify(game)===window.beforeMenu)).toBe(true);
 }
 await page.evaluate(()=>{window.originalSave=saveToSlot;saveToSlot=()=>false;});await page.locator('#btn-hdr-menu').click();await expect(page.locator('#btn-hdr-menu')).toBeVisible();await expect(page.locator('#toast-container')).toContainText('Could not save');await page.evaluate(()=>saveToSlot=window.originalSave);
});
