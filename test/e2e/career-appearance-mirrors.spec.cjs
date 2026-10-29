const {test,expect}=require('playwright/test');const path=require('node:path');const {pathToFileURL}=require('node:url');
for(const [width,file] of [[1440,'index.html'],[375,'releases/Stock-Car-Empire.html']]) test(`career appearance and independent sharp mirrors ${width}`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));
 await page.goto(pathToFileURL(path.resolve(file)).href);
 await page.evaluate(()=>{newGame('Paint Test','Driver','First');game.tutorial.status='skipped';game.money=500000;buyCar('Second');saveToSlot(2);enterGame();showTab('garage');});
 const custom=page.locator('.car-card').first();await custom.getByText('Customize and manage car',{exact:true}).click();
 await custom.locator('input[type="number"]').fill('27');await custom.locator('input[type="number"]').press('Tab');
 await custom.locator('input[type="color"]').evaluate(el=>{el.value='#13b7c9';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(custom.locator('.quick-car-preview strong')).toHaveText('27');
 expect(await page.evaluate(()=>[game.cars[0].number,game.cars[0].color])).toEqual([27,'#13b7c9']);
 await custom.locator('input[type="number"]').fill('2');await custom.locator('input[type="number"]').press('Tab');await expect(custom.locator('input[type="number"]')).toHaveValue('27');
 await page.evaluate(()=>{loadFromSlot(2);showTab('garage');});expect(await page.evaluate(()=>[game.cars[0].number,game.cars[0].color])).toEqual([27,'#13b7c9']);
 await page.locator('.car-card').first().getByText('Customize and manage car',{exact:true}).click();await page.screenshot({path:`.impeccable/review/career-paint-${width}.png`});
 await page.evaluate(()=>handleStartRace());await page.waitForFunction(()=>window._r3d?.mirrorRT);
 expect(await page.evaluate(()=>[window._r3d.player.number,window._r3d.player.hex])).toEqual([27,0x13b7c9]);
 expect(await page.evaluate(()=>{const e=window._r3d,w=document.getElementById('r3d-mirror-wrap');return e.mirrorRT.width/w.clientWidth;})).toBeGreaterThanOrEqual(1.49);
 await page.locator('#r3d-pause-btn').click();await expect(page.locator('#r3d-quit')).toHaveText('QUIT RACE');await page.locator('#r3d-quit').click();
 await page.evaluate(()=>{showScreen('intro');showQuickRaceScreen();setQuickRacePlayers(2);selectQuickRaceSeries(40);confirmQuickRace();});await page.waitForFunction(()=>window._r3d?.player2 && window._r3d?.mirrorRT);
 const checks=await page.evaluate(()=>{
  const e=window._r3d,r=e.renderer;cancelAnimationFrame(e._raf);e.paused=true;e.cars.forEach(c=>c.mesh.visible=false);e.player.x=e.player2.x=0;e.player.z=6000;e.player2.z=11000;
  for(const [p,color] of [[e.player,0x00ff00],[e.player2,0x0000ff]]){const m=new THREE.Mesh(new THREE.BoxGeometry(3,2,2),new THREE.MeshBasicMaterial({color}));m.position.set(0,1,p.z-18);e.scene.add(m);}
  e._renderDual(1);const gl=r.getContext(),cr=e.canvas.getBoundingClientRect();
  return [1,2].map(n=>{const w=document.getElementById(`dual-mirror-${n}`),b=w.getBoundingClientRect(),sx=e.canvas.width/cr.width,sy=e.canvas.height/cr.height;const x=Math.round((b.left-cr.left+2)*sx),y=Math.round((cr.bottom-b.bottom+2)*sy),ww=Math.floor(w.clientWidth*sx),hh=Math.floor(w.clientHeight*sy);const data=new Uint8Array(ww*hh*4);gl.readPixels(x,y,ww,hh,gl.RGBA,gl.UNSIGNED_BYTE,data);let green=0,blue=0;for(let i=0;i<data.length;i+=4){if(data[i]<50&&data[i+1]>200&&data[i+2]<50)green++;if(data[i]<50&&data[i+1]<50&&data[i+2]>200)blue++;}return {n,green,blue,ratio:e.mirrorRT.width/w.clientWidth,aspect:b.width/b.height};});
 });
 console.log(JSON.stringify(checks));expect(checks[0].green).toBeGreaterThan(20);expect(checks[0].blue).toBe(0);expect(checks[1].blue).toBeGreaterThan(20);expect(checks[1].green).toBe(0);for(const c of checks){expect(c.ratio).toBeGreaterThanOrEqual(1.49);expect(c.aspect).toBeCloseTo(4,1);}
 await page.screenshot({path:`.impeccable/review/mirror-proof-${width}.png`});await page.evaluate(()=>window._r3d.destroy());
});
