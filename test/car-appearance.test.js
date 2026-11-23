const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {entries}=require('./helpers/race-sources.cjs');
function context(){const store=new Map(),c=vm.createContext({console,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});for(const [f,s]of entries(['js/data.js','js/game.js']))vm.runInContext(s,c,{filename:f});return c;}
test('legacy appearance has safe defaults without modifying the saved car',()=>{
 const c=context();assert.equal(vm.runInContext(`(()=>{const old={number:3,color:'#123456'},before=JSON.stringify(old),look=carAppearance(old);return look.stripes&&look.stripeColor==='#f2f3e9'&&look.numberColor==='#f2f3e9'&&JSON.stringify(old)===before&&carAppearance(null).stripes;})()`,c),true);
});
test('career save/load preserves cosmetic settings and equipment values',()=>{
 const c=context();assert.equal(vm.runInContext(`(()=>{newGame('Team','Driver','Car');const car=game.cars[0],power=careerRacePower(car,70);Object.assign(car,{stripes:false,stripeColor:'#ffcc00',numberColor:'#22ff88'});if(!saveToSlot(0))return false;loadFromSlot(0);const loaded=game.cars[0],look=carAppearance(loaded);return !look.stripes&&look.stripeColor==='#ffcc00'&&look.numberColor==='#22ff88'&&careerRacePower(loaded,70)===power;})()`,c),true);
});
test('stripe overlay is finite, indexed and contained within the existing Gen-7 body envelope',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('assets/cars/racing-stripes.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/cars/stock-car-model.js','utf8'),c);
 assert.equal(vm.runInContext(`(()=>{const s=SC_RACING_STRIPES,p=SC_STOCK_CAR_MODEL.parts.paint.position;if(s.index.length!==292*3||!s.position.every(Number.isFinite)||!s.index.every(i=>Number.isInteger(i)&&i>=0&&i<s.position.length/3))return false;for(const axis of [0,2]){const body=p.filter((v,i)=>i%3===axis),stripe=s.position.filter((v,i)=>i%3===axis);if(Math.min(...stripe)<Math.min(...body)||Math.max(...stripe)>Math.max(...body))return false;}return true;})()`,c),true);
});

test('Grassroots markings follow the new hood and roof with no raised frame around the number',()=>{
 const THREE=require('three'),c=vm.createContext({});
 for(const name of ['legacy-stock-car-model','body-finishes','hood-logo-meshes'])
   vm.runInContext(fs.readFileSync('assets/cars/'+name+'.js','utf8'),c);
 const {base,finish,hood,roof,band}=vm.runInContext(`({base:SC_LEGACY_STOCK_CAR_MODEL.parts,
   finish:SC_BODY_FINISHES.grassroots,hood:SC_HOOD_LOGO_MESHES.grassroots,
   roof:SC_BODY_FINISHES.grassrootsRoofDecal,band:SC_BODY_FINISHES.grassrootsTeamBand})`,c);
 const skin = new THREE.BufferGeometry();
 skin.setAttribute('position',new THREE.Float32BufferAttribute(base.paint.position.concat(finish.paint.position),3));
 const retained=(key)=>finish[key].baseIndexRanges.flatMap(([a,b])=>base[key].index.slice(a,b));
 skin.setIndex(retained('paint').concat(finish.paint.index.map(i=>i+base.paint.position.length/3)));
 const paint = new THREE.Mesh(skin,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 const ray = new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
 for (const [decal,minGap,maxGap] of [[roof,.001,.006],[band,.001,.006],[hood,.008,.016]]) {
   for(let j=0;j<decal.position.length;j+=3){
     const [x,y,z]=decal.position.slice(j,j+3);
     ray.ray.origin.set(x,2,z);
     const hit=ray.intersectObject(paint)[0];
     assert.ok(hit && y-hit.point.y>=minGap && y-hit.point.y<=maxGap,'marking must follow painted surface');
   }
 }
 const trim=retained('trim').map(i=>base.trim.position.slice(i*3,i*3+3));
 assert.ok(!trim.some(([x,y,z])=>Math.abs(x)<.50 && y>=1.322 && z>-.75 && z<.3));
});
