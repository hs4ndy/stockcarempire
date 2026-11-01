const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(){const c=vm.createContext({console});for(const [file,source] of require('./helpers/race-sources.cjs').entries(['js/data.js','js/game.js','js/race3d.js']))vm.runInContext(source,c);return c;}
test('shared wall contact distinguishes proximity, impact, scraping and release for either human or AI',()=>{
 const c=fixture();vm.runInContext(`
 const e=Object.create(Race3DEngine.prototype);e.wallInnerX=11.2;e.camShake=0;
 const car=(isPlayer,x,v)=>({isPlayer,x,z:100,speed:220,lv:v,lvx:v,targetX:x,wallHalfX:1.05,wallHalfZ:2.3,mesh:{rotation:{y:0},position:{x}}});
 for(const human of [true,false])for(const side of [-1,1]) {
  const p=car(human,side*10,side*10);e.cars=[p];e._resolveWalls(1/120);
  if(p.speed!==220 || p.x!==side*10)throw Error('proximity penalty');
  p.x=side*10.3;e._resolveWalls(1/120);
  if(Math.abs(Math.abs(p.x)-10.15)>1e-8 || p.speed>=220 || (human?p.lv:p.lvx)*side>=0)throw Error('contact response');
  const speed=p.speed;p.x=side*9.9;e._resolveWalls(1/120);
  if(p.speed!==speed || p._wallContact)throw Error('release');
 }
 `,c);
});
test('model bounds include yaw, roll and asymmetric body offsets',()=>{
 const c=fixture();vm.runInContext(`
 const e=Object.create(Race3DEngine.prototype);e.wallInnerX=10.528;
 const p={isPlayer:true,x:11,z:0,speed:210,lv:12,wallBounds:{minX:-1,maxX:1.1,minY:0,maxY:1.4,minZ:-2.1,maxZ:2.3},mesh:{rotation:{y:.3,z:.04},position:{}}};
 e.cars=[p];e._resolveWalls(1/120);
 if(Math.abs(p.x+e._wallExtent(p)-10.528)>1e-8)throw Error('body does not meet wall');
 if(e._wallExtent(p,1)===e._wallExtent(p,-1))throw Error('offset ignored');
 `,c);
});
test('hull support does not collide with an empty corner of the old box',()=>{
 const c=fixture();vm.runInContext(`
 const e=Object.create(Race3DEngine.prototype);e.wallInnerX=11.2;
 const p={isPlayer:true,x:10.7,z:0,speed:220,lv:5,wallHull:[-1,0,1,1,0,-1],wallBounds:{minX:-1,maxX:1,minY:0,maxY:1,minZ:-1,maxZ:1},mesh:{rotation:{y:Math.PI/4,z:0},position:{}}};
 e.cars=[p];e._resolveWalls(1/120);
 if(p.speed!==220 || p.x!==10.7)throw Error('empty box corner still collides');
 p.x=11.3;e._resolveWalls(1/120);if(Math.abs(p.x-11.2)>1e-8)throw Error('hull contact not resolved');
 `,c);
});
test('both generated hulls match all original body/wheel vertices through varied wall approach angles',()=>{
 const c=fixture();for(const f of ['stock-car-model','legacy-stock-car-model','wall-contact-hulls'])vm.runInContext(fs.readFileSync(`assets/cars/${f}.js`,'utf8'),c);
 vm.runInContext(`
 [SC_LEGACY_STOCK_CAR_MODEL,SC_STOCK_CAR_MODEL].forEach((model,index)=>{
  const raw=[],sx=index===0?.91:1,sz=index===0?.9:1;
  const add=(v,o=[0,0,0])=>{for(let i=0;i<v.length;i+=3)raw.push((v[i]+o[0])*sx,v[i+1]+o[1],(v[i+2]+o[2])*sz);};
  Object.values(model.parts).forEach(part=>add(part.position));model.wheelPositions.forEach(o=>add(model.wheel.position,o));
  const e=Object.create(Race3DEngine.prototype),car={wallHull:SC_WALL_HULLS[index===0?'grassroots':'gen7'],mesh:{rotation:{}}};
  for(const side of [-1,1])for(let angle=0;angle<24;angle++)for(const roll of [-.055,0,.055]){
   const yaw=angle*Math.PI/12;car.mesh.rotation.y=yaw;car.mesh.rotation.z=roll;
   const a=side*Math.cos(yaw)*Math.cos(roll),b=-side*Math.cos(yaw)*Math.sin(roll),d=side*Math.sin(yaw);
   let actual=-Infinity;for(let i=0;i<raw.length;i+=3)actual=Math.max(actual,a*raw[i]+b*raw[i+1]+d*raw[i+2]);
   if(Math.abs(actual-e._wallExtent(car,side))>1e-6)throw Error('generated hull differs from runtime mesh');
  }
 });`,c);
});
