const vm=require('node:vm');
const {entries}=require('./race-sources.cjs');
function dualState(seriesId,difficulty,sources=null){
  let seed=17;const math=Object.create(Math);math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const c=vm.createContext({Math:math,console,window:{},document:{getElementById:()=>null}});
  for(const [file,source]of entries(['js/data.js','js/game.js','js/race.js','js/race3d.js'],sources))vm.runInContext(source,c,{filename:file});
  return JSON.parse(vm.runInContext(`JSON.stringify((()=>{
    const car=(id,x,z)=>({entrantId:id,isPlayer:id==='p1'||id==='p2',x,z,speed:210,lv:0,lvx:0,targetX:x,power:.75,raceNerve:1,laneTimer:0,contactCooldown:0,raceHealth:100,sideStrain:0,draftBoost:0,draftMomentum:0,finished:false,dnf:false,mesh:{position:{set(){}},rotation:{x:0,y:0,z:0}}});
    const cars=[car('p1',0,0),car('p2',3,-5),car('a',0,25),car('b',-3,20),car('c',-3,35)];
    const e=Object.create(Race3DEngine.prototype);Object.assign(e,{config:{seriesId:'${seriesId}',difficulty:'${difficulty}',raceRules:{crashes:true,damage:true}},diff:difficultyById('${difficulty}'),cars,player:cars[0],player2:cars[1],keys:{a:false,d:false,s:false},keys2:{a:false,d:false,s:false},speedScale:${seriesId==='grassroots'?.9:1},finishOrder:[],done:false,racing:true,paused:false,paceMode:false,wrecks:[],wreckCooldown:Infinity,camShake:0,_warn(){},_updateHUD(){},_updateOrder(){},_showFinish(){},_updateDualHUD(){},_updateCamera(){}});
    const trace=[];
    for(let frame=0;frame<480;frame++){
      e.keys.a=frame<30;e.keys.d=frame>=60&&frame<90;e.keys2.s=frame<45;
      if(frame===90)e._beginCrash(cars[2],-1,'side contact');
      if(frame===150)e._damageCar(cars[1],50);
      e.paused=frame>=180&&frame<190;e._update(1/120);
      if(frame%60===0)trace.push(cars.map(c=>({id:c.entrantId,x:c.x,z:c.z,speed:c.speed,health:c.raceHealth,spinning:!!c.spinning})));
    }
    return {trace,order:e.finalOrder(),playerRestored:e.player===cars[0],keysRestored:e.keys!==e.keys2};
  })())`,c));
}
module.exports={dualState};
