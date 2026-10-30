const fs=require('fs'),path=require('path'),cp=require('child_process');
const {Worker,isMainThread,parentPort,workerData}=require('worker_threads');
const {runRearStart}=require('../test/race-dynamics.test.js');
if(!isMainThread){parentPort.on('message',job=>{try{const start=Date.now();const result=runRearStart(job.seed,job.size,job.diff,job.strategy,workerData.sources[job.version],job.options);parentPort.postMessage({...job,...result,elapsedMs:Date.now()-start});}catch(e){parentPort.postMessage({...job,error:e.stack});}});}
else {
 const files=['js/data.js','js/game.js','js/race.js','js/race3d.js','js/ui.js'];
 const sources={v93:Object.fromEntries(files.map(f=>[f,cp.execFileSync('git',['show',`5ebd597:${f}`],{encoding:'utf8'})])),v94:Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,'utf8')]))};
 const jobs=[],seeds=[3,17,41,73,101],modes=['beginner','amateur','semipro','pro','allout'],series=[['grassroots',20],['challenger',26],['premier',40]];
 const suite=process.argv[2]||'all';
 if(['all','quick'].includes(suite))for(const [seriesId,size] of series)for(const diff of modes)for(const seed of seeds)for(const version of ['v93','v94'])jobs.push({suite:'quick',version,seed,size,diff,strategy:'managed',options:{quickRace:true,openingPace:true,playerPower:.75,seriesId}});
 if(['all','career'].includes(suite))for(const [seriesId,size] of series)for(const diff of ['semipro','pro','allout'])for(const seed of seeds.slice(0,3))for(const careerFixture of ['stock','upgraded'])jobs.push({suite:'career',version:'v94',seed,size,diff,strategy:'managed',options:{careerFixture,openingPace:true,seriesId}});
 if(['all','partners'].includes(suite))for(const diff of modes)for(const seed of seeds.slice(0,3))for(const teammates of [0,1,3])for(const strategy of ['push','ride','swap'])jobs.push({suite:'partners',version:'v94',seed,size:20,diff,strategy,options:{frontTrain:true,teammates,rivalPartners:teammates===0,openingPace:true,playerPower:.99,seriesId:'grassroots'}});
 fs.mkdirSync('.impeccable/review',{recursive:true});const out=`.impeccable/review/v94-${suite}-matrix.json`,rows=[];
 let next=0,finished=0;const count=Math.min(4,jobs.length);
 const workers=Array.from({length:count},()=>{const w=new Worker(__filename,{workerData:{sources}});w.on('message',r=>{rows.push(r);finished++;fs.writeFileSync(out,JSON.stringify({total:jobs.length,completed:finished,rows},null,2));if(finished%10===0)console.log(`${finished}/${jobs.length}`);if(next<jobs.length)w.postMessage(jobs[next++]);else w.terminate();});w.on('error',e=>{console.error(e);process.exitCode=1;});return w;});
 for(const w of workers)w.postMessage(jobs[next++]);console.log(`Running ${jobs.length} cases on ${count} workers; results ${out}`);
}
