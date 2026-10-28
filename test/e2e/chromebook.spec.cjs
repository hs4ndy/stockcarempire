const {test,expect}=require('playwright/test');
const path=require('node:path'),fs=require('node:fs');
for(const series of [0,1,2]) for(const broken of [false,true]) {
  test(`low-resource series ${series} renders pavement with ${broken?'failed':'loaded'} asphalt`,async({browser})=>{
    const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:2});
    const page=await context.newPage();
    await page.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});Object.defineProperty(navigator,'deviceMemory',{get:()=>4});});
    await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve(__dirname,'../../node_modules/three/build/three.min.js')}));
    if(broken) for(const file of ['assets/track/track-textures.js','assets/track/grassroots/track-textures.js']) {
      const body=fs.readFileSync(path.resolve(__dirname,'../..',file),'utf8').replace(/("speedway-asphalt"\s*:\s*")[^"]+/, '$1data:image/png;base64,broken');
      await page.route('**/'+file,r=>r.fulfill({body,contentType:'application/javascript'}));
    }
    await page.goto('/');await page.locator('#btn-quick-race').click();await page.locator('.quick-series-btn').nth(series).click();await page.locator('#btn-quick-race-confirm').click();
    await page.waitForFunction(()=>window._r3d?.trackGroup.getObjectByName('track:asphalt').material.map.userData.loadState!=='loading' && window._r3d?.mirrorRT);
    const report=await page.evaluate(()=>{
      const e=window._r3d,r=e.renderer;cancelAnimationFrame(e._raf);e.done=true;
      const road=e.trackGroup.getObjectByName('track:asphalt'),tex=road.material.map;
      const camera=new THREE.OrthographicCamera(-2,2,2,-2,.1,30);camera.position.set(0,8,1000);camera.up.set(0,0,1);camera.lookAt(0,0,1000);
      const target=new THREE.WebGLRenderTarget(16,16);r.setRenderTarget(target);r.autoClear=true;r.render(e.scene,camera);
      const pixels=new Uint8Array(4);r.readRenderTargetPixels(target,8,8,1,1,pixels);r.setRenderTarget(null);target.dispose();
      const covered=[];
      for(const z of [0,7500,15000]){e.player.z=z;e._positionTrack();const ray=new THREE.Raycaster(new THREE.Vector3(0,5,z),new THREE.Vector3(0,-1,0));covered.push(ray.intersectObject(road).length>0);}
      const result={low:e.lowPower,dpr:r.getPixelRatio(),count:road.count,state:tex.userData.loadState,size:Math.max(tex.image.width,tex.image.height),pixel:[...pixels],covered,shadows:r.shadowMap.enabled};e.destroy();return result;
    });
    expect(report.low).toBe(true);expect(report.dpr).toBeLessThanOrEqual(1);expect(report.shadows).toBe(false);expect(report.count).toBeLessThan(150);
    expect(report.state).toBe(broken?'fallback':'loaded');expect(report.size).toBeLessThanOrEqual(1024);expect(report.pixel.slice(0,3).reduce((a,b)=>a+b,0)).toBeGreaterThan(80);expect(report.covered).toEqual([true,true,true]);
    await context.close();
  });
}
test('cash stays visible and updates at desktop and phone widths',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{newGame('Cash Team','Driver','Car');game.tutorial.status='skipped';enterGame();});
  for(const width of [1440,375]){await page.setViewportSize({width,height:850});await page.evaluate(()=>{game.money=1234567;updateHeader();});await expect(page.locator('#header-cash')).toHaveText('$1,234,567');await expect(page.locator('#header-cash')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.impeccable/review/cash-header-${width}.png`});}
});
test('hiring all performance staff never promotes the driven finishing position',async({page})=>{
  await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve(__dirname,'../../node_modules/three/build/three.min.js')}));
  await page.goto('/');await page.evaluate(()=>{newGame('Honest Racing','Driver','Car');game.tutorial.status='skipped';game.money=500000;for(const id of ['crew_chief','engineer','data_analyst'])hireStaff(id);enterGame();handleOpenRaceWeekend();});
  await page.getByRole('button',{name:'Drive Race',exact:true}).click();await page.waitForFunction(()=>window._r3d?.mirrorRT);
  await page.evaluate(()=>{const e=window._r3d;cancelAnimationFrame(e._raf);e.done=true;e.cars.forEach((c,i)=>{c.z=i===0?6000:i<=11?7000+i:5000+i;c.finished=false;c.dnf=false;});window._r3dFinish(12);});
  await expect(page.locator('#results-modal')).toBeVisible();
  expect(await page.evaluate(()=>game.season.calendar[0].playerResult.position)).toBe(12);
  expect(await page.evaluate(()=>game.season.calendar[0].playerResult.points)).toBe(await page.evaluate(()=>SERIES[0].points[11]));
});
