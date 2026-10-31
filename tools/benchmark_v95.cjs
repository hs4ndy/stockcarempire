const fs=require('fs'),cp=require('child_process'),{Worker,isMainThread,parentPort,workerData}=require('worker_threads');
const {runRearStart}=require('../test/race-dynamics.test.js');
if(!isMainThread){parentPort.on('message',job=>{try{parentPort.postMessage({...job,...runRearStart(job.seed,job.size,job.diff,job.strategy,workerData.sources[job.version],job.options)});}catch(e){parentPort.postMessage({...job,error:e.stack});}});}
else{
const files=['js/data.js','js/game.js','js/race.js','js/race3d.js','js/ui.js'];const sources={v94:Object.fromEntries(files.map(f=>[f,cp.execFileSync('git',['show',`69f0be3:${f}`],{encoding:'utf8'})])),v95:Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,'utf8')]))};
const suite=process.argv[2]||'pilot',label=process.argv[3]||suite,jobs=[];
if(suite==='pilot'){
 for(const [seriesId,size]of [['grassroots',20],['premier',40]])for(const diff of ['pro','allout'])for(const seed of [3,17])jobs.push({version:'v95',seed,size,diff,strategy:'race',options:{seriesId,quickRace:true,openingPace:true,playerPower:.75}});
 for(const seed of [3,17])jobs.push({version:'v95',seed,size:36,diff:'pro',strategy:'ride',options:{frontTrain:true,teammates:3,playerPower:.99,careerFixture:'upgraded',seriesId:'premier'}});
 for(const version of ['v94','v95'])jobs.push({version,seed:17,size:40,diff:'pro',strategy:'race',options:{seriesId:'premier',quickRace:true,openingPace:true,playerPower:.75,dropBack:true}});
}
if(suite==='matrix'){
 for(const [seriesId,size]of [['grassroots',20],['challenger',26],['premier',40]])for(const diff of ['beginner','amateur','semipro','pro','allout'])for(const seed of [3,17,41,73,101])jobs.push({version:'v95',seed,size,diff,strategy:'race-v1',options:{seriesId,quickRace:true,openingPace:true,playerPower:.75}});
 for(const [seriesId,size]of [['grassroots',20],['challenger',26],['premier',40]])for(const diff of ['beginner','amateur','semipro','pro','allout'])for(const seed of [3,17])jobs.push({version:'v94',seed,size,diff,strategy:'race-v1',options:{seriesId,quickRace:true,openingPace:true,playerPower:.75}});
 for(const diff of ['semipro','pro','allout'])for(const size of [20,40])for(const seed of [3,17,41])for(const strategy of ['ride','swap','race'])jobs.push({version:'v95',seed,size,diff,strategy,options:{seriesId:size===20?'grassroots':'premier',careerFixture:'upgraded',frontTrain:true,teammates:3,openingPace:true,playerPower:.99}});
 for(const [seriesId,size]of [['grassroots',20],['challenger',26],['premier',40]])for(const diff of ['semipro','pro','allout'])for(const seed of [3,17])for(const careerFixture of ['stock','upgraded'])jobs.push({version:'v95',seed,size,diff,strategy:'race',options:{seriesId,careerFixture,openingPace:true}});
 for(const diff of ['semipro','pro','allout'])for(const seed of [3,17,41])for(const version of ['v94','v95'])jobs.push({version,seed,size:40,diff,strategy:'race-v1',options:{seriesId:'premier',quickRace:true,openingPace:true,playerPower:.75,dropBack:true}});
}
if(suite==='stock'){
 for(const [seriesId,size]of [['grassroots',20],['challenger',26],['premier',40]])for(const careerFixture of ['stock','upgraded'])jobs.push({version:'v95',seed:17,size,diff:'pro',strategy:'race',options:{seriesId,careerFixture,openingPace:true}});
}
if(suite==='career'){
 for(const diff of ['semipro','pro','allout'])for(const size of [20,40])for(const seed of [3,17,41])for(const strategy of ['ride','swap','race'])jobs.push({version:'v95',seed,size,diff,strategy,options:{seriesId:size===20?'grassroots':'premier',careerFixture:'upgraded',frontTrain:true,teammates:3,openingPace:true,playerPower:.99}});
 for(const [seriesId,size]of [['grassroots',20],['challenger',26],['premier',40]])for(const diff of ['semipro','pro','allout'])for(const seed of [3,17])for(const careerFixture of ['stock','upgraded'])jobs.push({version:'v95',seed,size,diff,strategy:'race',options:{seriesId,careerFixture,openingPace:true}});
}
if(suite==='career')for(const [seriesId,size]of [['grassroots',20],['challenger',26],['premier',40]])for(const seed of [3,17,41])for(const careerFixture of ['stock','upgraded'])jobs.push({version:'v95',seed,size,diff:'pro',strategy:'race',options:{seriesId,careerFixture,startPosition:Math.ceil(size/2),openingPace:true}});
let next=0;const rows=[],out=`.impeccable/review/v95-${label}.json`;fs.mkdirSync('.impeccable/review',{recursive:true});
for(let i=0;i<Math.min(4,jobs.length);i++){const w=new Worker(__filename,{workerData:{sources}});w.on('message',r=>{rows.push(r);fs.writeFileSync(out,JSON.stringify({total:jobs.length,completed:rows.length,rows},null,2));if(next<jobs.length)w.postMessage(jobs[next++]);else w.terminate();});w.postMessage(jobs[next++]);}
console.log(`Running${jobs.length} cases -> ${out}`);
}
