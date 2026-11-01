const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function ctx(){const storage=new Map(),m=Object.create(Math);let seed=123;m.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);const c=vm.createContext({console,Math:m,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});for(const f of ['data','game','race','race3d'])vm.runInContext(fs.readFileSync(`js/${f}.js`,'utf8'),c);vm.runInContext(`
function car(player=false){return {isPlayer:player,x:0,z:0,speed:220,lv:0,lvx:0,raceHealth:100,sideStrain:0,finished:false,dnf:false,mesh:{rotation:{x:0,y:0,z:0},position:{set(){}}}};}
function engine(d='pro',rules={crashes:true,damage:true}){const e=Object.create(Race3DEngine.prototype);e.config={difficulty:d,raceRules:rules};e.diff=difficultyById(d);e.cars=[];e.camShake=0;e.wreckCount=0;return e;}
`,c);return c;}
function run(text){return vm.runInContext(text,ctx());}
test('easy modes mask preferences; higher modes default enabled',()=>{
 for(const d of ['beginner','amateur'])assert.equal(run(`raceFeatureRules('${d}').crashes || raceFeatureRules('${d}').damage`),false);
 for(const d of ['semipro','pro','allout'])assert.equal(run(`raceFeatureRules('${d}').damage`),true);
});
test('repeated side force crashes AI sooner; recovery is finite and slower, never DNF',()=>{
 assert.equal(run(`(()=>{const e=engine(),a=car(),b=car(true);e.cars=[a,b];for(let i=0;i<8;i++)e._sideContact(a,b,12,1,.1,1);if(!a.spinning||b.spinning)return false;for(let i=0;i<100;i++)e._advanceCrash(a,.05);return !a.spinning&&!a.dnf&&e._healthPace(a)<1;})()`),true);
});
test('zero health causes one recoverable blowout only when crashes enabled',()=>{
 assert.equal(run(`(()=>{for(const crashes of [false,true]){const e=engine('pro',{crashes,damage:true}),p=car(true);e.cars=[p];e._damageCar(p,600);if(!!p.spinning!==crashes||p.raceHealth!==0||e._healthPace(p)>=1)return false;e._damageCar(p,10);if((p.crashCount||0)!==(crashes?1:0))return false;}return true;})()`),true);
});
test('race damage is reduced by 80 percent equally for humans and AI',()=>{
 assert.equal(run(`(()=>{const e=engine();for(const human of [true,false]){const c=car(human);e._damageCar(c,50);if(c.raceHealth!==90||c.spinning)return false;}return true;})()`),true);
});
test('disabled damage cannot change health, and bumper nudges cannot start crashes',()=>{
 assert.equal(run(`(()=>{const e=engine('pro',{crashes:true,damage:false}),p=car(true);e.cars=[p];e.player=p;e._damageCar(p,100);for(let i=0;i<100;i++)e._bumpPlayer(1,0);return p.raceHealth===100&&!p.spinning;})()`),true);
});
test('ordinary bumper trains never accumulate side strain, while collection is capped',()=>{
 assert.equal(run(`(()=>{const e=engine(),a=car(true),b=car();a.z=4.4;e.cars=[a,b];for(let i=0;i<100;i++)e._separateCars(1/120);if(a.spinning||b.spinning||a.raceHealth!==100||b.raceHealth!==100)return false;
 const wreck=car();wreck.spinning=true;wreck.mesh.rotation.y=Math.PI/2;e.cars=[wreck,car(),car(),car(),car()];e._stepContactState(.01);return e.cars.filter(c=>c.spinning).length===5&&e._collectedCount===4;})()`),true);
});
test('retirement preserves records once; empty garage can buy replacement',()=>{
 assert.equal(run(`(()=>{newGame('Team','Driver','Car');game.difficulty='pro';const c=game.cars[0];c.wins=4;c.races=40;c.totalPoints=555;c.appliedUpgrades=['engine_tune'];c.lifetimeHealth=0;retireExhaustedCars();retireExhaustedCars();if(game.cars.length||game.retiredCars.length!==1||game.retiredCars[0].totalPoints!==555)return false;game.money=100000;const r=buyCar('Replacement');return r.ok&&r.car.assignedDriverId==='player'&&r.car.lifetimeHealth===100&&game.retiredCars[0].wins===4;})()`),true);
});
test('legacy saves gain full life without retroactive wear or losing stats',()=>{
 assert.equal(run(`(()=>{newGame('Team','Driver','Car');const c=game.cars[0];delete c.lifetimeHealth;delete game.retiredCars;delete game.raceRules;c.races=90;c.wins=12;saveToSlot(1);game=null;if(!loadFromSlot(1))return false;return game.cars[0].lifetimeHealth===100&&game.cars[0].wins===12&&game.cars[0].races===90;})()`),true);
});
test('impact health increases repair bill; repairs cannot restore lifetime health',()=>{
 assert.equal(run(`(()=>{newGame('Team','Driver','Car');game.difficulty='pro';game.money=1000000;const c=game.cars[0];postRaceUpdate({carId:c.id,position:5,prize:100,points:25,raceHealth:20,crashes:0},100,[]);const life=c.lifetimeHealth,condition=c.condition,r=repairCar(c.id);return r.ok&&condition<25&&r.cost>0&&c.condition===100&&c.lifetimeHealth===life;})()`),true);
});
test('typical ten-point damage retires at 40 starts in each series; easy/disabled wear pauses',()=>{
 assert.equal(run(`(()=>{for(let s=0;s<3;s++){newGame('Team','Driver','Car');game.currentSeries=s;game.difficulty='pro';const c=game.cars[0];for(let i=0;i<39;i++){c.condition=100;postRaceUpdate({carId:c.id,position:10,prize:0,raceHealth:90},0,[]);}if(game.cars.length!==1||Math.abs(c.lifetimeHealth-2.5)>.001)return false;c.condition=100;postRaceUpdate({carId:c.id,position:10,prize:0,raceHealth:90},0,[]);if(game.cars.length||game.retiredCars[0].races!==40)return false;}
for(const d of ['beginner','amateur','pro']){newGame('T','D','C');game.difficulty=d;if(d==='pro')game.raceRules.damage=false;const c=game.cars[0];postRaceUpdate({carId:c.id,position:5,raceHealth:0},0,[]);if(c.lifetimeHealth!==100)return false;}return true;})()`),true);
});

test('rotated wreck footprint collects true overlap beyond old tiny box only',()=>{
 assert.equal(run(`(()=>{const e=engine(),a=car(),b=car();a.mesh.rotation.y=Math.PI/2;a.wallHalfX=b.wallHalfX=1;a.wallHalfZ=b.wallHalfZ=2.5;b.x=3;const hit=e._wreckOverlap(a,b);b.x=4;return hit&&!e._wreckOverlap(a,b)&&e._crashThreshold(car(true))===80;})()`),true);
});

test('repair rates are ten percent lower and mechanic discount still applies',()=>{
 assert.equal(run(`(()=>{if(JSON.stringify(Object.values(CAR_CLASSES).map(c=>c.repairCostPerPoint))!==JSON.stringify([72,270,1350]))return false;newGame('T','D','C');game.money=100000;const c=game.cars[0];c.condition=50;const normal=repairCar(c.id).cost;c.condition=50;game.staff.push({typeId:'mechanic'});const discount=repairCar(c.id).cost;return normal===3600&&discount===2700;})()`),true);
});


test('AI-only contact builds one quarter strain, human-caused AI strain drops twenty percent',()=>{
 assert.equal(run(`(()=>{const e=engine(),a=car(),b=car();e.cars=[a,b];e._sideContact(a,b,4,1,.1,1);if(Math.abs(a.sideStrain-.2625)>.00001)return false;const p=car(true),c=car();e.cars=[p,c];e._sideContact(p,c,4,1,.1,1);return Math.abs(c.sideStrain-.84)<.00001&&Math.abs(p.sideStrain-1.05)<.00001;})()`),true);
});
