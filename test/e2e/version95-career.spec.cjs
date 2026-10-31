const {test,expect}=require('playwright/test');const path=require('path'),{pathToFileURL}=require('url');
test('stock Pro Career completes with actual classification and retained contenders',async({page})=>{
 await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));await page.addInitScript(()=>{let s=17;Math.random=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);});await page.goto(pathToFileURL(path.resolve('index.html')).href);await page.addScriptTag({path:path.resolve('test/helpers/race-driver.js')});
 await page.evaluate(()=>{newGame('Rookie','Driver','Stock Car');game.difficulty='pro';game.tutorial.status='skipped';saveToSlot(3);enterGame();handleStartRace();});await page.waitForFunction(()=>window._r3d?.mirrorRT);
 const r=await page.evaluate(()=>{const e=window._r3d;cancelAnimationFrame(e._raf);e.paceMode=false;e.racing=true;e.wreckCooldown=Infinity;const driver={};let steps=0;while(!e.done&&steps++<60*100){raceDriverStep(e,driver,1/60,'race');e._update(1/60);}window.actual95Order=e.finalOrder();return {done:e.done,start:e._startingPos,position:window.actual95Order.find(c=>c.isPlayer).position,count:window.actual95Order.length,unique:new Set(window.actual95Order.map(c=>c.entrantId)).size,contenders:e.cars.filter(c=>c.isContender).length};});
 console.log('VERSION95 stock Career',JSON.stringify(r));expect(r.done).toBe(true);expect(r.count).toBe(20);expect(r.unique).toBe(20);expect(r.contenders).toBe(3);
 await page.getByRole('button',{name:'Continue',exact:true}).click();expect(await page.evaluate(()=>game.season.raceIndex)).toBe(1);
 expect(await page.evaluate(()=>game.season.calendar[0].playerResult.position)).toBe(r.position);
 expect(await page.evaluate(()=>window.actual95Order.every(r=>game.season.standings.find(s=>s.id===r.entrantId)?.points===(SERIES[0].points[r.position-1]||0)))).toBe(true);
 expect(await page.evaluate(()=>localStorage.getItem('sce_slot_3')===JSON.stringify(game))).toBe(true);
});
