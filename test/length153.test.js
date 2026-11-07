const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {entries}=require('./helpers/race-sources.cjs');
test('all seven settings scale actual constructor distances in every series',()=>{
  const c=context();c.THREE=require('three');c.SC_LEGACY_STOCK_CAR_MODEL={};c.SC_STOCK_CAR_MODEL={};
  assert.equal(vm.runInContext(`(()=>{Race3DEngine.prototype._init=function(){};return SERIES.every(s=>RACE_LENGTHS.every(o=>new Race3DEngine({}, {seriesId:s.id,raceLength:o.id},()=>{}).raceLength===(s.id==='premier'?18750:17250)*o.scale));})()`,c),true);
});
function context(){const c=vm.createContext({console,localStorage:{getItem(){return null},setItem(){},removeItem(){}}});for(const[f,s]of entries(['js/data.js','js/game.js','js/race3d.js']))vm.runInContext(s,c);return c;}
test('seven length options preserve Standard, increase monotonically and normalize legacy saves',()=>{
  const c=context();
  assert.equal(vm.runInContext(`(()=>{newGame('T','D','C');delete game.raceLength;normalizeVehicleState();return game.raceLength==='standard'&&raceLengthOption('unknown').scale===1&&RACE_LENGTHS.map(o=>o.scale).join(',')==='0.25,0.5,0.75,1,1.25,1.5,2';})()`,c),true);
});
test('post-crash target is shared, capped, fades at the pack and grants no clean-driving bonus',()=>{
  const c=context();
  assert.equal(vm.runInContext(`(()=>{const e=Object.create(Race3DEngine.prototype);e.speedScale=1;for(const isPlayer of [true,false]){const car={isPlayer,z:0,_postCrashCatchup:12},ahead={z:200};e.cars=[car,ahead];if(e._postCrashTarget(car,220)!==238||e._postCrashTarget(car,R3D.RECOVERY_MAX)!==R3D.RECOVERY_MAX)return false;car._postCrashCatchup=1;const fade=e._postCrashTarget(car,220);if(!(fade>220&&fade<238))return false;ahead.z=18;if(e._postCrashTarget(car,220)!==220||car._postCrashCatchup!==0)return false;ahead.z=200;if(e._postCrashTarget(car,220)!==220)return false;}return true;})()`,c),true);
});
test('both human and AI receive catch-up time only after the spin ends',()=>{
  const c=context();
  assert.equal(vm.runInContext(`(()=>{for(const isPlayer of [true,false]){const e=Object.create(Race3DEngine.prototype);e.config={difficulty:'allout',raceRules:{crashes:true,damage:false}};const car={isPlayer,x:0,z:0,speed:220,mesh:{position:{set(){}},rotation:{y:0}}};e.cars=[car,{z:2000}];e._beginCrash(car,1,'side contact');if(car._postCrashCatchup!==0)return false;for(let i=0;i<500&&car.spinning;i++)e._advanceCrash(car,1/120);if(car.spinning||car._postCrashCatchup!==12||e._postCrashTarget(car,220)<=220)return false;}return true;})()`,c),true);
});

test('AI wreck collection strain is twenty percent lower while human contact stays unchanged',()=>{
  const c=context();
  assert.equal(vm.runInContext(`(()=>{for(const [wreckPlayer,carPlayer,strain] of [[false,false,20],[true,false,25],[false,true,12]]){const e=Object.create(Race3DEngine.prototype);e.config={difficulty:'allout',raceRules:{crashes:true,damage:false}};const wreck={isPlayer:wreckPlayer,spinning:true,_crashPhase:'veer',mesh:{rotation:{y:1}}},car={isPlayer:carPlayer,speed:220};e.cars=[wreck,car];e._wreckOverlap=()=>true;e._crashThreshold=()=>Infinity;e._stepContactState(1/120);if(car.sideStrain!==strain)return false;}return true;})()`,c),true);
});
