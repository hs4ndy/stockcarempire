const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,Math,window:{},document:{},localStorage:{getItem(){return null},setItem(){}},setTimeout,clearTimeout});
for(const f of ['js/data.js','js/game.js','js/race.js','js/race3d.js','js/ui.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const rows=JSON.parse(vm.runInContext(`JSON.stringify(DIFFICULTIES.flatMap(d=>['grassroots','challenger','premier'].flatMap(series=>[.75,.5771527778].flatMap(power=>[300,600,1000].flatMap(startGap=>[250,260,270].map(pace=>{
 const scale=series==='grassroots'?.9:1,car=(id,z,speed)=>({entrantId:id,isPlayer:id==='player',power,x:0,z,speed,lv:0,lvx:0,mesh:{position:{set(){}},rotation:{x:0,y:0,z:0}},draftMomentum:0,draftBoost:0,contactCooldown:0});
 const p=car('player',0,210*scale),b=car('ai',startGap,pace*scale),e=Object.create(Race3DEngine.prototype);Object.assign(e,{config:{qualifyAI:power<.6},cars:[p,b],player:p,diff:d,speedScale:scale,keys:{a:false,d:false,s:false},camShake:0,_warn(){}});
 let useful=null,close=null,max=0,gapAt60=null;
 for(let i=0;i<7200;i++){b.z+=b.speed/120;e._calcDraft(1/120);e._updatePlayer(1/120);const gap=b.z-p.z;if(useful===null&&p.towStrength>.15)useful=(i+1)/120;if(close===null&&gap<=25)close=(i+1)/120;max=Math.max(max,p.speed);gapAt60=gap;}
 return {difficulty:d.id,series,power,startGap,pace,useful,close,maxSpeed:max,limit:R3D.RECOVERY_MAX*scale,gapAt60};
}))))))`,c));fs.writeFileSync('.impeccable/review/v95-controlled-recovery.json',JSON.stringify(rows,null,2));console.log('cases',rows.length,'useful within60',rows.filter(r=>r.useful!==null).length,'close25 within60',rows.filter(r=>r.close!==null).length,'nonfinite',rows.filter(r=>!Number.isFinite(r.maxSpeed)).length);
