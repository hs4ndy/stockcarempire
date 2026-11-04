const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {entries}=require('./helpers/race-sources.cjs');
function context(){const store=new Map(),c=vm.createContext({console,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});for(const[f,s]of entries(['js/data.js','js/game.js','js/race.js']))vm.runInContext(s,c,{filename:f});return c;}
const read=(c,s)=>JSON.parse(vm.runInContext(`JSON.stringify(${s})`,c));
test('each new player win earns one independent trophy with immutable race facts; DNF and teammate wins earn none',()=>{
 const c=context();vm.runInContext(`newGame('T','D','C');const first=currentRace();const result={isPlayer:true,entrantId:'player',carId:game.cars[0].id,position:1,dnf:false,points:40,prize:700,startingPosition:17,simulated:false};awardRaceTrophy(result);awardRaceTrophy(result);game.season.raceIndex=1;awardRaceTrophy({...result,startingPosition:8});game.season.raceIndex=2;awardRaceTrophy({...result,dnf:true});awardRaceTrophy({...result,isPlayer:false});game.cars[0].name='Changed';`,c);
 assert.equal(read(c,'game.trophies.length'),2);assert.deepEqual(read(c,'game.trophies.map(t=>[t.race,t.startingPosition,t.carName,t.points,t.simulated])'),[[1,17,'C',40,false],[2,8,'C',40,false]]);
 assert.equal(read(c,'game.trophies[0].track===TRACKS.find(t=>t.id===first.trackId).name'),true);
});
test('legacy histories recover separate wins and championships honestly and idempotently',()=>{
 const c=context();vm.runInContext(`newGame('T','D','C');delete game.trophies;game.history=[{year:1,series:SERIES[0].name,wins:2,champion:true,finalPos:1},{year:2,series:SERIES[1].name,wins:1,champion:false,finalPos:2}];game.currentSeries=2;game.season.year=3;game.season.calendar[4].status='completed';game.season.calendar[4].playerResult={position:1,dnf:false};game.season.standings.find(e=>e.id==='player').wins=2;ensureTrophies();const once=JSON.stringify(game.trophies);ensureTrophies();`,c);
 assert.equal(read(c,'game.trophies.length'),6);assert.equal(read(c,'once===JSON.stringify(game.trophies)'),true);assert.equal(read(c,"game.trophies.filter(t=>t.kind==='championship').length"),1);
 assert.equal(read(c,'game.trophies.filter(t=>t.startingPosition).length'),0);assert.equal(read(c,'game.trophies.find(t=>t.year===3).race'),5);
});
test('postrace awards survive save/reload, season promotion, and retirement archive without crossing careers',()=>{
 const c=context();vm.runInContext(`newGame('T','D','C');game.raceRules={crashes:false,damage:false};const r={isPlayer:true,entrantId:'player',carId:game.cars[0].id,position:1,dnf:false,points:40,prize:700,startingPosition:12,simulated:true};applyRaceResults([r]);currentRace().status='completed';currentRace().playerResult=r;postRaceUpdate(r,700,[r]);saveToSlot(0);loadFromSlot(0);const won=game.trophies.length;game.season.raceIndex=game.season.calendar.length;endSeason();const title=game.trophies.find(t=>t.kind==='championship');saveToSlot(0);loadFromSlot(0);const result=retireCareer();const archive=getHallOfFame()[0];newGame('Other','E','F');`,c);
 assert.equal(read(c,'won'),1);assert.equal(read(c,'title.series'),0);assert.equal(read(c,'title.year'),1);assert.equal(read(c,'result.ok'),true);assert.equal(read(c,'archive.trophies.length'),2);assert.equal(read(c,'game.trophies.length'),0);
});
test('six bounded finite Blender meshes match six data-embedded thumbnail assets',()=>{
 const c=vm.createContext({});for(const f of ['assets/trophies/trophy-models.js','assets/trophies/trophy-thumbnails.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
 const stats=read(c,'Object.entries(SC_TROPHY_MODELS).map(([key,m])=>({key,parts:m.parts.length,valid:m.parts.every(p=>p.positions.length===p.normals.length&&p.positions.every(Number.isFinite)&&p.normals.every(Number.isFinite)&&p.indices.every(i=>Number.isInteger(i)&&i>=0&&i<p.positions.length/3)),triangles:m.parts.reduce((s,p)=>s+p.indices.length/3,0),image:SC_TROPHY_THUMBNAILS[key].startsWith("data:image/png;base64,")}))');
 assert.equal(stats.length,6);for(const s of stats){assert.ok(s.valid&&s.image,s.key);assert.ok(s.parts<=5&&s.triangles<16000,s.key);}
});
