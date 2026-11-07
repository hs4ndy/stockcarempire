const {test,expect}=require('playwright/test');
const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
for(const [mode,players,file] of [
  ['high',1,'index.html'],['performance',1,'index.html'],
  ['high',2,'index.html'],['performance',2,'index.html'],
  ['auto',1,'releases/Stock-Car-Empire.html'],
]) test(`Auto ignores legacy preference ${mode}, coverage ${players} ${file}`,async({page})=>{
  test.setTimeout(120000);
  await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));
  await page.goto(pathToFileURL(path.resolve(file)).href);
  await page.evaluate(mode=>localStorage.setItem('sce_graphics_mode',mode),mode);
  await page.reload();
  await expect(page.locator('#graphics-mode')).toHaveCount(0);
  if(players===1&&file==='index.html') {
    fs.mkdirSync('.impeccable/review',{recursive:true});
    await page.screenshot({path:`.impeccable/review/graphics150-${mode}-menu.png`});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:`.impeccable/review/graphics150-${mode}-mobile.png`});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.setViewportSize({width:1440,height:900});
  }
  await page.evaluate(({mode,players,file})=>{
    if(mode==='high'&&players===1&&file==='index.html') {
      newGame('Team','Driver','Car');game.currentSeries=2;game.cars[0].classId=SERIES[2].carClass;
      game.season.aiTeams=generateAITeams(2);game.season.calendar=generateCalendar(2);game.tutorial.status='skipped';
      rebuildStandings();enterGame();handleStartRace();
    } else {quickRacePlayers=players;handleStartQuickRace(40);}
  },{mode,players,file});
  await page.waitForFunction(()=>window._r3d?.mirrorRT);
  const report=await page.evaluate(()=>{
    const e=window._r3d;cancelAnimationFrame(e._raf);
    const coverage=[];
    for(const z of [0,9000,e.raceLength+100]) {
      e.player.z=z;e._positionTrack();
      coverage.push(...[e.trackGroup.getObjectByName('track:asphalt'),e.environmentGroup.children[0]].map(mesh=>{
        const positions=mesh.geometry.attributes.position, indices=mesh.geometry.index;
        const vertices=[0,1,2].map(i=>indices.getX(i));
        const x=vertices.reduce((sum,i)=>sum+positions.getX(i),0)/3;
        const localZ=vertices.reduce((sum,i)=>sum+positions.getZ(i),0)/3;
        const length=mesh===e.environmentGroup.children[0]?e._environmentLayout.length:e._trackLayout.length;
        const worldZ=Math.floor(z/length)*length+localZ;
        mesh.updateMatrixWorld(true);
        const ray=new THREE.Raycaster(new THREE.Vector3(x,200,worldZ),new THREE.Vector3(0,-1,0));
        return ray.intersectObject(mesh).length>0&&mesh.count<mesh.instanceMatrix.count;
      }));
    }
    return {mode:e.graphicsMode,low:e.lowPower,pixels:e.canvas.width*e.canvas.height,
      shadows:e.renderer.shadowMap.enabled,coverage,field:e.cars.length};
  });
  expect(report.mode).toBe('auto');
  expect(report.coverage.every(Boolean)).toBe(true);
  expect(report.field).toBe(40);
  if(report.low){expect(report.pixels).toBeLessThanOrEqual(750000);expect(report.shadows).toBe(false);}
  if(players===2)expect(report.shadows).toBe(false);
  if(mode==='auto') {
    const transitions=await page.evaluate(()=>{
      const e=window._r3d;
      const state=JSON.stringify(e.cars.map(c=>[c.x,c.z,c.speed]));
      e.racing=true;e._graphicsCooldown=0;e._setGraphicsQuality(false);
      for(let i=0;i<100;i++)e._sampleGraphics(1/30);
      const reduced=e.lowPower;
      e._renderMirror();
      for(let i=0;i<3000;i++)e._sampleGraphics(1/60);
      e._renderMirror();
      return {reduced,recovered:!e.lowPower,mirror:!!e.mirrorRT,
        sameCars:state===JSON.stringify(e.cars.map(c=>[c.x,c.z,c.speed]))};
    });
    expect(transitions).toEqual({reduced:true,recovered:true,mirror:true,sameCars:true});
  }
});
