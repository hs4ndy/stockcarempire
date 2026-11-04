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

test('Career played results > Next > news has real points and preserves completed save',async({page})=>{
 await open(page);await page.evaluate(()=>{newGame('News Racing','Harrison Santos','News Car');game.tutorial.status='skipped';game.money=100000;saveToSlot(2);enterGame();handleStartRace();});
 await page.waitForFunction(()=>window._r3d?.mirrorRT);const photo=await finishFixture(page);
 await page.locator('#r3d-finish').getByRole('button',{name:'Next',exact:true}).click();await expect(page.locator('#results-modal')).toBeVisible();
 const data=await page.evaluate(()=>({saved:localStorage.getItem('sce_slot_2'),pos:getPlayerStandingPos(),points:getStandings().find(s=>s.id==='player').points,race:game.season.calendar[0]}));
 await page.evaluate(()=>{const policy=document.createElement('meta');policy.httpEquiv='Content-Security-Policy';policy.content="img-src 'none'";document.head.append(policy);});
 await page.locator('#btn-close-results').click();await expect(page.locator('.race-news-copy')).toContainText(`${data.points} points`);await expect(page.locator('figcaption')).toContainText(photo.leader);await expect(page.locator('.race-news-photo canvas')).toBeVisible();
 await expect(page.locator('#news-headline')).toContainText('Harrison Santos');await expect(page.locator('figcaption')).toContainText('Photo by Gavin Turnage');const bounds=await page.locator('#race-news-content').evaluate(el=>({scroll:el.scrollHeight>el.clientHeight,h:el.closest('.modal').getBoundingClientRect().height}));expect(bounds.scroll).toBe(true);expect(bounds.h).toBeLessThan(900);await page.screenshot({path:'.impeccable/review/news98-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.impeccable/review/news98-mobile.png'});expect(await page.evaluate(()=>localStorage.getItem('sce_slot_2'))).toBe(data.saved);
 await page.locator('#btn-close-news').click();expect(await page.evaluate(()=>game.season.raceIndex)).toBe(1);
 // Returning to Career may mark a primary sponsor offer as announced. That
 // existing notification metadata is the only permitted save difference.
 const stripAnnouncement=text=>{const value=JSON.parse(text);for(const offer of value.sponsorship.offers)delete offer.announced;return value;};
 expect(stripAnnouncement(await page.evaluate(()=>localStorage.getItem('sce_slot_2')))).toEqual(stripAnnouncement(data.saved));
});

test('offline phone simulated final event: no fake photo or next race, long names fit',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page,'releases/Stock-Car-Empire.html');
 await page.evaluate(()=>{newGame('Long News Team','Alexandertheverylongdrivername Santos','Test');game.tutorial.status='skipped';game.money=100000;game.season.raceIndex=game.season.calendar.length-1;saveToSlot(4);enterGame();handleSimulateRace();});
 await page.locator('#btn-close-results').click();await expect(page.locator('.race-news-no-photo')).toContainText('simulated');await expect(page.locator('.race-news-copy')).toContainText('season are complete');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.impeccable/review/news-mobile.png',fullPage:true});
 await page.locator('#btn-close-news').click();await expect(page.locator('#screen-game')).toBeVisible();
});

for(const dual of [false,true])test(`Quick Race has no news (${dual?'dual':'single'})`,async({page})=>{
 await open(page);await page.evaluate(dual=>{quickRacePlayers=dual?2:1;handleStartQuickRace(26);},dual);await page.waitForFunction(()=>window._r3d?.mirrorRT);
 await finishFixture(page);expect(await page.evaluate(()=>window._r3d.finishPhoto)).toBeUndefined();
 await page.locator('#r3d-finish').getByRole('button',{name:'Continue',exact:true}).click();await expect(page.locator('#btn-quick-race')).toBeVisible();await expect(page.locator('#race-news-modal')).toHaveCount(0);
});
