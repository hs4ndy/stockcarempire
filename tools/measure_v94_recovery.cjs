const fs=require('fs'),vm=require('vm');
const c=vm.createContext({console,Math,window:{},document:{},localStorage:{getItem(){return null},setItem(){}},setTimeout,clearTimeout});
for(const f of ['js/data.js','js/game.js','js/race.js','js/race3d.js','js/ui.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const rows=JSON.parse(vm.runInContext(`JSON.stringify(DIFFICULTIES.flatMap(d=>['grassroots','challenger','premier'].flatMap(series=>[.75,.5771527778].map(power=>{
 const scale=series==='grassroots'?.9:1;
 const car=(id,z,speed)=>({entrantId:id,isPlayer:id==='player',power,x:0,z,speed,lv:0,lvx:0,mesh:{position:{set(){}},rotation:{x:0,y:0,z:0}},draftMomentum:0,draftBoost:0,contactCooldown:0});
 const p=car('player',0,210*scale),b=car('ai',300,250*scale),e=Object.create(Race3DEngine.prototype);
 Object.assign(e,{cars:[p,b],player:p,diff:d,speedScale:scale,keys:{a:false,d:false,s:false},camShake:0,_warn(){}});
 let reconnect=null,gapAt20=null,gapAt60=null,max=0;
 for(let i=0;i<7200;i++){b.z+=b.speed/120;e._calcDraft(1/120);e._updatePlayer(1/120);const gap=b.z-p.z;
  if(gap<120 && reconnect===null)reconnect=(i+1)/120;
  if(i===2399)gapAt20=gap;if(i===7199)gapAt60=gap;max=Math.max(max,p.speed);
 }
 return {difficulty:d.id,series,power,reconnect,gapAt20,gapAt60,maxSpeed:max,met20s:reconnect!==null&&reconnect<=20};
}))))`,c));
fs.writeFileSync('.impeccable/review/v94-recovery.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows,null,2));

