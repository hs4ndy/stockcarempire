const {test,expect}=require('playwright/test');const path=require('path'),{pathToFileURL}=require('url');
for(const [width,file]of [[1440,'index.html'],[375,'releases/Stock-Car-Empire.html']])test(`menu closes career and preserves five slots ${width}`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.goto(pathToFileURL(path.resolve(file)).href);await expect(page.locator('#btn-continue-career')).toHaveCount(0);
 await page.evaluate(()=>{for(let i=0;i<5;i++){currentSlot=null;newGame('Career '+i,'Driver','Car');game.tutorial.status='skipped';saveToSlot(i);}handleLoadFromSlot(2);game.money+=123;window.expectedMoney=game.money;window.otherSlots=[0,1,3,4].map(i=>localStorage.getItem('sce_slot_'+i));});
 await page.locator('#btn-hdr-menu').click();expect(await page.evaluate(()=>[game,currentSlot])).toEqual([null,null]);
 expect(await page.evaluate(()=>[0,1,3,4].map(i=>localStorage.getItem('sce_slot_'+i)))).toEqual(await page.evaluate(()=>window.otherSlots));
 await page.keyboard.press('Control+s');await expect(page.locator('#save-slot-modal')).toHaveCount(0);
 await page.evaluate(()=>handleSaveToSlot(0));expect(await page.evaluate(()=>[0,1,3,4].map(i=>localStorage.getItem('sce_slot_'+i)))).toEqual(await page.evaluate(()=>window.otherSlots));
 await page.locator('#btn-start-new').click();expect(await page.evaluate(()=>[0,1,3,4].map(i=>localStorage.getItem('sce_slot_'+i)))).toEqual(await page.evaluate(()=>window.otherSlots));await page.evaluate(()=>showScreen('intro'));
 await page.evaluate(()=>showLoadModal());await page.locator('#save-slot-modal .save-slot').nth(2).getByRole('button',{name:'Load',exact:true}).click();expect(await page.evaluate(()=>[currentSlot,game.money])).toEqual([2,await page.evaluate(()=>window.expectedMoney)]);
 await page.evaluate(()=>{window.originalSave=saveToSlot;saveToSlot=()=>false;});await page.locator('#btn-hdr-menu').click();expect(await page.evaluate(()=>!!game&&currentSlot===2)).toBe(true);await expect(page.locator('#toast-container')).toContainText('Could not save');await page.evaluate(()=>saveToSlot=window.originalSave);
});
for(const [width,file]of [[1440,'index.html'],[375,'releases/Stock-Car-Empire.html']])test(`unsaved career needs a slot before menu ${width}`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.goto(pathToFileURL(path.resolve(file)).href);
 await page.evaluate(()=>{newGame('Existing','Driver','Car');saveToSlot(0);window.savedZero=localStorage.getItem('sce_slot_0');currentSlot=null;newGame('Unsaved','Driver','Car');game.tutorial.status='skipped';enterGame();});
 await page.locator('#btn-hdr-menu').click();await expect(page.locator('#save-slot-modal')).toBeVisible();expect(await page.evaluate(()=>game.teamName)).toBe('Unsaved');expect(await page.evaluate(()=>localStorage.getItem('sce_slot_0'))).toBe(await page.evaluate(()=>window.savedZero));
 await page.evaluate(()=>handleSaveToSlot(4));await page.locator('#btn-hdr-menu').click();expect(await page.evaluate(()=>[game,currentSlot])).toEqual([null,null]);expect(await page.evaluate(()=>localStorage.getItem('sce_slot_0'))).toBe(await page.evaluate(()=>window.savedZero));
 await page.evaluate(()=>showLoadModal());await page.locator('#save-slot-modal .save-slot').nth(4).getByRole('button',{name:'Load',exact:true}).click();expect(await page.evaluate(()=>game.teamName)).toBe('Unsaved');
});
