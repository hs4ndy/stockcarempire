const {test,expect}=require('playwright/test');
test('retirement cancels safely, archives recap, frees only own slot and persists',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{newGame('Other','Other','Car');saveToSlot(1);newGame('Retired Team','Hall Driver','Car');game.tutorial.status='skipped';game.history=[{year:1,series:'Grassroots Cup',finalPos:1,wins:4,champion:true}];game.titles=1;saveToSlot(0);enterGame();showTab('carstats');});
 await page.getByRole('button',{name:'Retire',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(await page.evaluate(()=>!!localStorage.getItem('sce_slot_0'))).toBe(true);
 await page.getByRole('button',{name:'Retire',exact:true}).click();await page.getByRole('button',{name:'Confirm Retirement'}).click();await expect(page.locator('#hall-of-fame-modal')).toContainText('Hall Driver');expect(await page.evaluate(()=>game===null&&currentSlot===null&&!localStorage.getItem('sce_slot_0')&&!!localStorage.getItem('sce_slot_1'))).toBe(true);
 await page.getByRole('button',{name:'View Recap'}).click();await expect(page.locator('#hall-of-fame-modal')).toContainText('Career Wins');await expect(page.locator('#hall-of-fame-modal')).toContainText('4');
 await page.reload();await page.evaluate(()=>showLoadModal());await page.getByRole('button',{name:'Hall of Fame',exact:true}).click();await expect(page.locator('#hall-of-fame-modal')).toContainText('Hall Driver');
});
test('archive write failure preserves active career and save',async({page})=>{
 await page.goto('/');expect(await page.evaluate(()=>{newGame('Safe','Driver','Car');saveToSlot(0);const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===HALL_OF_FAME_KEY)throw new Error('quota');return original.call(this,k,v);};const result=retireCareer();Storage.prototype.setItem=original;return !result.ok&&!!game&&currentSlot===0&&!!localStorage.getItem('sce_slot_0');})).toBe(true);
});

test('offline phone Hall of Fame recap fits',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(require('url').pathToFileURL(require('path').resolve('releases/Stock-Car-Empire.html')).href);await page.evaluate(()=>{newGame('Phone Team','Phone Driver','Car');game.tutorial.status='skipped';saveToSlot(0);enterGame();showTab('carstats');});await page.getByRole('button',{name:'Retire',exact:true}).click();await page.getByRole('button',{name:'Confirm Retirement'}).click();await page.getByRole('button',{name:'View Recap'}).click();await expect(page.locator('#hall-of-fame-modal')).toContainText('Phone Driver');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
