const {test,expect}=require('playwright/test'),path=require('path'),{pathToFileURL}=require('url');
for(const file of ['index.html','releases/Stock-Car-Empire.html'])test(`series race distances and finishes ${file}`,async({page})=>{
 await page.goto(pathToFileURL(path.resolve(file)).href);
 for(const [field,distance] of [[20,17250],[26,17250],[40,18750]])for(const players of [1,2]){
  await page.evaluate(({field,players})=>{quickRacePlayers=players;handleStartQuickRace(field);},{field,players});await page.waitForFunction(()=>window._r3d?.mirrorRT);
  const r=await page.evaluate(()=>{const e=window._r3d;cancelAnimationFrame(e._raf);e.paused=true;e.player.z=e.raceLength-1;e._positionTrack();e.scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(0,1,e.raceLength-1),new THREE.Vector3(0,-1,0));const road=ray.intersectObject(e.trackGroup.getObjectByName('track:asphalt')).length>0;
   e.player.z=15001;e._checkFinish();const early=e.player.finished;e.player.z=e.raceLength+1;if(e.player2)e.player2.z=e.raceLength+2;e._checkFinish();return {length:e.raceLength,finish:e.finishGroup.position.z,road,early:!!early,finished:e.player.finished,second:e.player2?.finished??true};});
  expect(r).toEqual({length:distance,finish:distance,road:true,early:false,finished:true,second:true});
  await page.evaluate(()=>{window._r3d.destroy();window._r3d=null;showScreen('intro');});
 }
});

