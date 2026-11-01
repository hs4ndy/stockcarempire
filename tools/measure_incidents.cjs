const fs=require('node:fs'),{Worker,isMainThread,parentPort}=require('node:worker_threads');
if(!isMainThread){const {runRearStart}=require('../test/race-dynamics.test.js');parentPort.on('message',j=>{try{parentPort.postMessage({...j,...runRearStart(j.seed,j.size,j.diff,'race',null,{seriesId:j.series,quickRace:true,playerPower:.75,openingPace:true,raceRules:{crashes:true,damage:true}})});}catch(e){parentPort.postMessage({...j,error:e.stack});}});}
else{
 const jobs=[];for(const [series,size] of [['grassroots',20],['challenger',26],['premier',40]])if(!process.argv[2]||process.argv[2]===series)for(const diff of ['semipro','pro','allout'])for(const seed of [3,17,41,73,101])jobs.push({series,size,diff,seed});
 const rows=[];let next=0;fs.mkdirSync('.impeccable/review',{recursive:true});
 for(let i=0;i<3;i++){const w=new Worker(__filename);w.on('message',r=>{rows.push(r);fs.writeFileSync(`.impeccable/review/incidents102${process.argv[2]?'-'+process.argv[2]:''}.json`,JSON.stringify({total:jobs.length,completed:rows.length,rows},null,2));if(next<jobs.length)w.postMessage(jobs[next++]);else w.terminate();if(rows.length===jobs.length)console.log(JSON.stringify({races:rows.length,errors:rows.filter(r=>r.error).length,aiCrashRaces:rows.filter(r=>r.aiCrashes>0).length,playerCrashRaces:rows.filter(r=>r.playerCrashes>0).length}));});w.postMessage(jobs[next++]);}
 console.log(`Measuring${jobs.length} seeded race scenarios`);
}
