const {test,expect}=require('playwright/test');const path=require('path'),{pathToFileURL}=require('url');
for(const [width,file] of [[1440,'index.html'],[375,'releases/Stock-Car-Empire.html']])test(`recurring Career rivals, fair AI grid and rollback ${width}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:850});await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));await page.goto(pathToFileURL(path.resolve(file)).href);
 await page.evaluate(()=>{newGame('Contenders','Driver','Car');game.tutorial.status='skipped';game.currentSeries=2;game.season.aiTeams=generateAITeams(2);game.money=1e8;game.reputation=100;game.difficulty='pro';
  game.cars[0].classId='premier';for(const d of HIREABLE_DRIVERS.slice(0,3)){const car=makeCar(d.name,'premier',{speed:20,handling:20,reliability:20});game.cars.push(car);hireDriver(d.id,car.id);}
  game.season.aiTeams.forEach(t=>t.cars.forEach(c=>c.condition=0));rebuildStandings();window.expectedPowers=Object.fromEntries(game.season.aiTeams.flatMap(t=>t.cars.map(c=>[c.id,careerRivalPower(c,championshipContenderIds().has(c.id))])));saveToSlot(2);enterGame();window.expectedContenders=[...championshipContenderIds()].sort();window.before95=JSON.stringify(game);handleStartRace();});
 await page.waitForFunction(()=>window._r3d?.mirrorRT);
 const r=await page.evaluate(()=>{const e=window._r3d;cancelAnimationFrame(e._raf);e.paused=true;const rivals=e.cars.filter(c=>window.expectedContenders.includes(c.entrantId));return {ids:rivals.map(c=>c.entrantId).sort(),nerves:rivals.map(c=>c.raceNerve),expected:window.expectedContenders,size:e.cars.length,qualifyAI:e.config.qualifyAI,preparedPowers:e.cars.filter(c=>!c.isPlayer&&!c.isTeammate).every(c=>Math.abs(c.power-window.expectedPowers[c.entrantId])<1e-9),weakMateBehindRival:e.cars.filter(c=>c.isTeammate).every(m=>e.cars.some(c=>!c.isPlayer&&!c.isTeammate&&c.z>m.z))};});
 expect(r.ids).toEqual(r.expected);expect(r.nerves).toEqual([1.12,1.12,1.12]);expect(r.size).toBe(40);expect(r.qualifyAI).toBe(true);expect(r.preparedPowers).toBe(true);expect(r.weakMateBehindRival).toBe(true);
 await page.evaluate(()=>{window._r3d.paused=false;window._r3d._togglePause();});await page.locator('#r3d-quit').click();expect(await page.evaluate(()=>JSON.stringify(game)===window.before95)).toBe(true);expect(errors).toEqual([]);
});

test('Pro Premier brake-created dropout returns to a useful tow in the real browser engine',async({page})=>{
 test.setTimeout(90000);await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));await page.addInitScript(()=>{let s=17;Math.random=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);});await page.goto(pathToFileURL(path.resolve('index.html')).href);await page.addScriptTag({path:path.resolve('test/helpers/race-driver.js')});
 await page.locator('#btn-quick-race').click();await page.locator('[data-diff="pro"]').last().click();await page.locator('.quick-series-btn').last().click();await page.locator('#btn-quick-race-confirm').click();await page.waitForFunction(()=>window._r3d?.mirrorRT);
 const result=await page.evaluate(()=>{const e=window._r3d;cancelAnimationFrame(e._raf);e.paceMode=false;e.racing=true;e.paused=false;e.wreckCooldown=Infinity;let braked=false,released=null,rejoined=null,max=0,peakGap=0;const driver={};
  for(let frame=0;frame<60*85&&!e.done;frame++){
   raceDriverStep(e,driver,1/60,'race');const next=e.cars.filter(c=>c!==e.player&&!c.finished&&!c.dnf&&c.z>e.player.z).sort((a,b)=>a.z-b.z)[0];
   if(frame>=60*10&&released===null){braked=true;if(next&&next.z-e.player.z>=600)released=frame/60;else e.keys.s=true;}
   e._update(1/60);max=Math.max(max,e.player.speed);if(next)peakGap=Math.max(peakGap,next.z-e.player.z);
   if(released!==null&&e.player.towStrength>.15){rejoined=frame/60-released;break;}
  }
  e._updateCamera(1/60);e.renderer.render(e.scene,e.camera);return {braked,released,rejoined,max,peakGap,size:e.cars.length};});
 console.log('VERSION95 browser recovery',JSON.stringify(result));expect(result.size).toBe(40);expect(result.braked).toBe(true);expect(result.released).not.toBeNull();expect(result.peakGap).toBeGreaterThanOrEqual(600);expect(result.rejoined).not.toBeNull();expect(result.rejoined).toBeLessThan(40);expect(result.max).toBeLessThanOrEqual(290.00001);
 await page.screenshot({path:'.impeccable/review/v95-premier-recovery.png'});await page.locator('#r3d-pause-btn').click();await page.locator('#r3d-quit').click();await expect(page.locator('#btn-quick-race')).toBeVisible();
});
