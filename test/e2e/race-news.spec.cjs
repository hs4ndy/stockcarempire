const {test,expect}=require('playwright/test');
const path=require('path'),fs=require('fs'),{pathToFileURL}=require('url');
async function open(page,file='index.html'){
 await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));
 await page.goto(pathToFileURL(path.resolve(file)).href);
}
async function finishFixture(page){return page.evaluate(()=>{
 const e=window._r3d;cancelAnimationFrame(e._raf);e.paused=true;e.paceMode=false;e.racing=true;
 const line=e.raceLength,leader=e.cars.find(c=>!c.isPlayer && c!==e.player2);
 e.cars.forEach((c,i)=>{c.z=line-5-i*3;c.x=[-6,-2,2,6][i%4];c.mesh.position.set(c.x,0,c.z);});
 e.player.z=line-7000;leader.z=line+.5;leader.x=-2;
 const oldRatio=e.renderer.getPixelRatio(),oldAuto=e.renderer.autoClear;
 const before=e.cars.map(c=>[c.x,c.z,c.speed,c.mesh.visible]);
 const began=performance.now();e._checkFinish();const ms=performance.now()-began;
 const photo=e.finishPhoto?.dataUrl;
 const preserved=JSON.stringify(before)===JSON.stringify(e.cars.map(c=>[c.x,c.z,c.speed,c.mesh.visible]));
 e.cars.filter(c=>c!==leader).forEach((c,i)=>c.z=line+1+i);
 e._checkFinish();
 return {leader:leader.label,photo,ms,preserved,samePhoto:photo===e.finishPhoto?.dataUrl,
   targetReset:e.renderer.getRenderTarget()===null,ratio:e.renderer.getPixelRatio()===oldRatio,
   auto:e.renderer.autoClear===oldAuto,done:e.done};
});}

for(const [series,size] of [['grassroots',20],['challenger',26],['premier',40]])test(`Quick ${series}: winner photo survives teardown and Next opens its own report`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});await open(page);
 await page.evaluate(size=>handleStartQuickRace(size),size);await page.waitForFunction(()=>window._r3d?.mirrorRT);
 const r=await finishFixture(page);expect(r.done).toBe(true);expect(r.photo).toMatch(/^data:image\/jpeg;base64,/);expect(r.preserved&&r.samePhoto&&r.targetReset&&r.ratio&&r.auto).toBe(true);
 fs.mkdirSync('.impeccable/review',{recursive:true});fs.writeFileSync(`.impeccable/review/news-finish-${series}.jpg`,Buffer.from(r.photo.split(',')[1],'base64'));
 console.log(`finish capture ${series}: ${r.ms.toFixed(1)} ms (software browser)`);
 await page.locator('#r3d-finish').getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.locator('#news-headline')).toBeFocused();await expect(page.locator('.race-news-byline')).toHaveText(/By (Sophia Calabrese|Gavin Turnage|Michael Williams|Kenzie Wright)/);
 await expect(page.locator('.race-news-photo img')).toBeVisible();await expect(page.locator('figcaption')).toContainText(r.leader);await expect(page.locator('.race-news-copy')).toContainText('exhibition');
 expect(await page.evaluate(()=>window._r3d)).toBe(null);expect(await page.locator('img').last().evaluate(img=>[img.naturalWidth,img.naturalHeight])).toEqual([1024,576]);
 if(series==='premier'){
   await page.screenshot({path:'.impeccable/review/news-desktop.png',fullPage:true});
   await page.setViewportSize({width:390,height:844});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:'.impeccable/review/news-mobile-photo.png',fullPage:true});
 }
 await page.locator('#btn-close-news').click();await expect(page.locator('#btn-quick-race')).toBeVisible();expect(await page.evaluate(()=>pendingRaceNews)).toBe(null);expect(errors).toEqual([]);
});

test('Career played results > Next > news has real points and preserves completed save',async({page})=>{
 await open(page);await page.evaluate(()=>{newGame('News Racing','Harrison Santos','News Car');game.tutorial.status='skipped';game.money=100000;saveToSlot(2);enterGame();handleStartRace();});
 await page.waitForFunction(()=>window._r3d?.mirrorRT);const photo=await finishFixture(page);
 await page.locator('#r3d-finish').getByRole('button',{name:'Next',exact:true}).click();await expect(page.locator('#results-modal')).toBeVisible();
 const data=await page.evaluate(()=>({saved:localStorage.getItem('sce_slot_2'),pos:getPlayerStandingPos(),points:getStandings().find(s=>s.id==='player').points,race:game.season.calendar[0]}));
 await page.locator('#btn-close-results').click();await expect(page.locator('.race-news-copy')).toContainText(`${data.points} points`);await expect(page.locator('figcaption')).toContainText(photo.leader);
 await expect(page.locator('#news-headline')).toContainText('Harrison Santos');expect(await page.evaluate(()=>localStorage.getItem('sce_slot_2'))).toBe(data.saved);
 await page.locator('#btn-close-news').click();expect(await page.evaluate(()=>game.season.raceIndex)).toBe(1);expect(await page.evaluate(()=>localStorage.getItem('sce_slot_2'))).toBe(data.saved);
});

test('offline phone simulated final event: no fake photo or next race, long names fit',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page,'releases/Stock-Car-Empire.html');
 await page.evaluate(()=>{newGame('Long News Team','Alexandertheverylongdrivername Santos','Test');game.tutorial.status='skipped';game.money=100000;game.season.raceIndex=game.season.calendar.length-1;saveToSlot(4);enterGame();handleSimulateRace();});
 await page.locator('#btn-close-results').click();await expect(page.locator('.race-news-no-photo')).toContainText('simulated');await expect(page.locator('.race-news-copy')).toContainText('season are complete');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.impeccable/review/news-mobile.png',fullPage:true});
 await page.locator('#btn-close-news').click();await expect(page.locator('#screen-game')).toBeVisible();
});

test('dual Quick Race shares one finish photo with separate player reports; failed photo does not break a race',async({page})=>{
 await open(page);await page.evaluate(()=>{quickRacePlayers=2;handleStartQuickRace(26);});await page.waitForFunction(()=>window._r3d?.player2 && window._r3d?.mirrorRT);
 const result=await finishFixture(page);expect(result.photo).toBeTruthy();await page.locator('#r3d-finish').getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.locator('#news-headline')).toContainText('Player 1');const src=await page.locator('.race-news-photo img').getAttribute('src');
 await page.getByRole('button',{name:'Player 2',exact:true}).click();await expect(page.locator('#news-headline')).toContainText('Player 2');expect(await page.locator('.race-news-photo img').getAttribute('src')).toBe(src);
 await page.locator('#btn-close-news').click();await page.evaluate(()=>{quickRacePlayers=1;handleStartQuickRace(20);});await page.waitForFunction(()=>window._r3d?.mirrorRT);
 const state=await page.evaluate(()=>{const e=window._r3d;cancelAnimationFrame(e._raf);const original=e.renderer.readRenderTargetPixels;e.renderer.readRenderTargetPixels=()=>{throw new Error('test readback failure');};e.player.z=e.raceLength+1;e._checkFinish();e.renderer.readRenderTargetPixels=original;return {done:e.done,photo:e.finishPhoto,target:e.renderer.getRenderTarget()===null,player:e.player.isPlayer};});
 expect(state).toEqual({done:true,photo:null,target:true,player:true});await page.locator('#r3d-finish').getByRole('button',{name:'Next',exact:true}).click();await expect(page.locator('.race-news-no-photo')).toContainText('could not be captured');
});
