const fs=require('fs'),vm=require('vm');const files=['js/data.js','js/game.js','js/race.js'];const rows=[];const ref=process.argv[2]||null;const output=process.argv[3]||'.impeccable/review/contenders134-after.json';const sources=require('../test/helpers/race-sources.cjs').entries(files,ref);
for(const level of [0,1,2])for(const difficulty of ['semipro','pro','allout'])for(const seed of [3,17,41,73,101]){
 let state=seed;const math=Object.create(Math);math.random=()=>((state=(state*1664525+1013904223)>>>0)/4294967296);
 const c=vm.createContext({console,Math:math,window:{},document:{},localStorage:{getItem(){return null},setItem(){},removeItem(){}}});for(const [f,source] of sources)vm.runInContext(source,c,{filename:f});
 const r=JSON.parse(vm.runInContext(`JSON.stringify((()=>{newGame('Season','Driver','Car');game.currentSeries=${level};game.difficulty='${difficulty}';game.cars=[makeCar('Season',SERIES[${level}].carClass)];game.season.aiTeams=generateAITeams(${level});game.season.calendar=generateCalendar(${level});rebuildStandings();
 const contenders=championshipContenderIds(),points=new Map(),finishes=new Map(),wins=new Map();
 const tracks=TRACKS.filter(t=>t.series.includes(${level}));
 for(let race=0;race<SERIES[${level}].racesPerSeason;race++){
   const r=simulateRace({playerCarId:game.cars[0].id,trackId:tracks[race%tracks.length].id});
   applyRaceResults(r.results);game.season.calendar[race].status='completed';postRaceUpdate(r.playerResult,r.playerResult.prize,r.results);game.cars[0].condition=100;
   for(const e of r.results){points.set(e.entrantId,(points.get(e.entrantId)||0)+e.points);const list=finishes.get(e.entrantId)||[];list.push(e.position);finishes.set(e.entrantId,list);if(e.position===1)wins.set(e.entrantId,(wins.get(e.entrantId)||0)+1);}
 }
 const order=getStandings().map(e=>e.id);const standingsMatch=[...points].every(([id,value])=>game.season.standings.find(e=>e.id===id)?.points===value);const contenderConditions=game.season.aiTeams.flatMap(t=>t.cars.filter(c=>contenders.has(c.id)).map(c=>c.condition));const contendersStats=[...contenders].map(id=>({id,name:game.season.aiTeams.flatMap(t=>t.cars).find(c=>c.id===id)?.driverName,championshipPosition:order.indexOf(id)+1,points:points.get(id),wins:wins.get(id)||0,top5:finishes.get(id).filter(p=>p<=5).length,meanFinish:finishes.get(id).reduce((s,p)=>s+p,0)/finishes.get(id).length}));
 return {series:SERIES[${level}].id,difficulty:'${difficulty}',seed:${seed},races:SERIES[${level}].racesPerSeason,standingsMatch,contenderConditions,contenders:contendersStats};})())`,c));rows.push(r);
}
fs.writeFileSync(output,JSON.stringify(rows,null,2));console.log('Measured',rows.length,'seasons');
for(const series of ['grassroots','challenger','premier']){const a=rows.filter(r=>r.series===series);console.log(series,'seasons with >=2 contenders in top5:',a.filter(r=>r.contenders.filter(c=>c.championshipPosition<=5).length>=2).length+'/'+a.length,'all3top5',a.filter(r=>r.contenders.every(c=>c.championshipPosition<=5)).length);}

for(const series of ['grassroots','challenger','premier']){const a=rows.filter(r=>r.series===series),avg=values=>values.reduce((s,n)=>s+n,0)/values.length;console.log(series,'mean best contender wins',avg(a.map(r=>Math.max(...r.contenders.map(c=>c.wins)))),'Parker seasons/wins',a.filter(r=>r.contenders.some(c=>c.name==='Parker Holt')).length,avg(a.flatMap(r=>r.contenders.filter(c=>c.name==='Parker Holt').map(c=>c.wins))));}
