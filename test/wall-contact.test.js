const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(){const c=vm.createContext({console});for(const f of ['data','game','race3d'])vm.runInContext(fs.readFileSync(`js/${f}.js`,'utf8'),c);return c;}
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
