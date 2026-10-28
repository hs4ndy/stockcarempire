// Same pose, viewport, DPR and renderer for baseline/current. Not Chromebook FPS.
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const baseline of [true, false]) {
      const page = await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:2});
      await page.addInitScript(() => {
        Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});
        Object.defineProperty(navigator,'deviceMemory',{get:()=>4});
      });
      await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve(__dirname,'../node_modules/three/build/three.min.js')}));
      if(baseline) await page.route('**/js/race3d.js',r=>r.fulfill({body:execFileSync('git',['show','32bfd54:js/race3d.js'],{encoding:'utf8'})}));
      await page.goto(process.env.STOCKCAR_BASE_URL || 'http://127.0.0.1:4190');
      await page.locator('#btn-quick-race').click();
      await page.locator('.quick-series-btn').last().click();
      await page.locator('#btn-quick-race-confirm').click();
      await page.waitForFunction(()=>window._r3d?.mirrorRT);
      await page.waitForTimeout(1000);
      const report=await page.evaluate(()=>{
        const e=window._r3d,r=e.renderer;cancelAnimationFrame(e._raf);e.done=true;
        e.cars.forEach((c,i)=>{c.x=(i%3-1)*3.5;c.z=6000+Math.floor(i/3)*7;c.mesh.position.set(c.x,0,c.z)});
        e._updateCamera(1);r.info.autoReset=false;
        const samples=[];let triangles;
        for(let i=0;i<12;i++){
          r.info.reset();const start=performance.now();r.autoClear=true;r.render(e.scene,e.camera);r.autoClear=false;e._renderMirror();r.getContext().finish();
          if(i>=4)samples.push(performance.now()-start);triangles=r.info.render.triangles;
        }
        samples.sort((a,b)=>a-b);
        const result={pixelRatio:r.getPixelRatio(),pixels:e.canvas.width*e.canvas.height,triangles,medianRenderMs:samples[4],shadows:r.shadowMap.enabled};e.destroy();return result;
      });
      console.log(JSON.stringify({version:baseline?'32bfd54':'working',...report}));await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
