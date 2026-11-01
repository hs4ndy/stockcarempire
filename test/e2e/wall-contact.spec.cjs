const {test,expect}=require('playwright/test'),path=require('path');
for(const [id,size] of [['grassroots',20],['challenger',26],['premier',40]])test(`wall geometry and sparks ${id}`,async({page})=>{
 await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));await page.goto(process.env.STOCKCAR_TEST_FILE ? require('url').pathToFileURL(path.resolve(process.env.STOCKCAR_TEST_FILE)).href : '/');
 await page.evaluate(size=>{handleStartQuickRace(size);},size);await page.waitForFunction(()=>window._r3d?.mirrorRT);
 const r=await page.evaluate(()=>{
  const e=window._r3d;cancelAnimationFrame(e._raf);e.paused=false;e.paceMode=false;e.racing=true;
  const results=[];for(const car of [e.player,e.cars.find(c=>!c.isPlayer)])for(const side of [-1,1])for(const yaw of [0,-.25,.25,1.2]){
   car.mesh.rotation.set(0,yaw,.04);
   car.x=side*(e.wallInnerX-e._wallExtent(car,side)-.05);car.speed=210;car.lv=car.lvx=side*12;car._wallContact=false;const before=car.speed;
   e.cars.forEach(c=>c.mesh.position.set(c.x,0,c.z));e._resolveWalls(1/120);const near=car.speed===before;
   car.x+=side*.1;e._resolveWalls(1/120);car.mesh.position.set(car.x,0,car.z);car.mesh.updateMatrixWorld(true);
   let edge=-Infinity;const v=new THREE.Vector3();const solid=new Set([...Object.values(e.G.parts),e.G.wheel]);
   car.mesh.traverse(m=>{if(!m.isMesh || !solid.has(m.geometry))return;const pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);edge=Math.max(edge,side*v.x);}});
   results.push({near,edge,wall:e.wallInnerX,slowed:car.speed<before});
  }
  const p=e.player;p.mesh.rotation.set(0,0,0);p.z=6000;p.x=e.wallInnerX-e._wallExtent(p)+.005;p.lv=12;p.mesh.position.set(p.x,0,p.z);p._sparkWait=0;p._wallContact=false;e._resolveWalls(1/120);e._stepWallSparks(.1);e._updateCamera(1);document.getElementById('r3d-countdown').style.display='none';e.renderer.render(e.scene,e.camera);e._renderMirror();
  return {results,count:e._wallSparks.filter(p=>p.life>0).length,pool:e._wallSparks.length,draw:e._sparkMesh.geometry.drawRange.count,warn:document.getElementById('r3d-warn').textContent};
 });
 for(const c of r.results){expect(c.near&&c.slowed).toBe(true);expect(Math.abs(c.edge-c.wall)).toBeLessThan(.005);}expect(r.count).toBeGreaterThan(0);expect(r.pool).toBe(384);expect(r.draw).toBeLessThanOrEqual(768);expect(r.warn).not.toContain('WALL');
 await page.screenshot({path:`.impeccable/review/wall-${id}.png`});
 await page.evaluate(()=>{const e=window._r3d;e.destroy();window._r3d=null;});
});
