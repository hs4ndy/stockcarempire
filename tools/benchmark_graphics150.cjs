// Controlled same-scene GPU work comparison. These are not physical-device FPS.
const {chromium}=require('playwright');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const browser=await chromium.launch({channel:'chrome'});
  try {
    for(const baseline of [true,false])for(const players of [1,2]) {
      const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:2});
      await page.addInitScript(()=>{
        Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});
        Object.defineProperty(navigator,'deviceMemory',{get:()=>4});
      });
      await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));
      if(baseline) {
        const sources=Object.fromEntries(require('../test/helpers/race-sources.cjs').entries(['js/race3d.js'],'c02cf48'));
        await page.route(/\/js\/race3d(?:\/[^/?]+)?\.js$/,route=>{
          const file=decodeURIComponent(new URL(route.request().url()).pathname).match(/\/(js\/race3d(?:\/[^/]+)?\.js)$/)[1];
          return route.fulfill({body:sources[file]||'',contentType:'application/javascript'});
        });
      }
      await page.goto(pathToFileURL(path.resolve('index.html')).href);
      await page.evaluate(players=>{setRaceGraphicsMode('performance');quickRacePlayers=players;handleStartQuickRace(40);},players);
      await page.waitForFunction(()=>window._r3d?.mirrorRT);
      await page.waitForFunction(()=>window._r3d.trackGroup.getObjectByName('track:asphalt').material.map.userData.loadState!=='loading');
      const report=await page.evaluate(()=>{
        const e=window._r3d,r=e.renderer;cancelAnimationFrame(e._raf);
        e.cars.forEach((c,i)=>{c.x=(i%3-1)*3.5;c.z=6000+Math.floor(i/3)*7;c.mesh.position.set(c.x,0,c.z);});
        e._updateCamera(1);r.info.autoReset=false;
        const samples=[];let triangles,calls;
        for(let i=0;i<12;i++){
          r.info.reset();const start=performance.now();
          if(e.player2)e._renderDual(1/60);
          else {r.autoClear=true;r.render(e.scene,e.camera);r.autoClear=false;e._renderMirror();}
          r.getContext().finish();
          if(i>=4)samples.push(performance.now()-start);
          triangles=r.info.render.triangles;calls=r.info.render.calls;
        }
        samples.sort((a,b)=>a-b);
        const result={pixels:e.canvas.width*e.canvas.height,triangles,calls,medianRenderMs:samples[4],
          trackInstances:e.trackGroup.children[0].count,groundInstances:e.environmentGroup.children[0].count};
        e.destroy();return result;
      });
      console.log(JSON.stringify({version:baseline?'149':'150',players,...report}));
      await page.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
