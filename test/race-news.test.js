const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm');
function newsScripts(){return [...fs.readFileSync('index.html','utf8').matchAll(/<script src="js\/(news-data(?:\/[^"]+)?\.js)"><\/script>/g)].map(m=>m[1].slice(0,-3));}
function context(){const c=vm.createContext({console,window:{},document:{},Math});for(const f of ['data','game',...newsScripts(),'news'])vm.runInContext(fs.readFileSync(`js/${f}.js`,'utf8'),c);return c;}
function json(c,exp){return JSON.parse(vm.runInContext(`JSON.stringify(${exp})`,c));}

test('270 authored articles cover every valid finish in all series',()=>{
 const c=context();
 assert.deepEqual(json(c,'RACE_NEWS_REPORTERS'),['Sophia Calabrese','Michael Williams','Kenzie Wright']);
 const reports=json(c,`SERIES.flatMap(s=>Array.from({length:s.fieldSize},(_,i)=>{
   const choices=RACE_NEWS_ARTICLES[s.id][i+1];
   return {pos:i+1,series:s.id,count:choices.length,ids:choices.map(a=>a.id),articles:choices};
 }))`);
 assert.equal(reports.reduce((n,r)=>n+r.count,0),270);
 const ids=new Set(),bodies=new Set();
 for(const r of reports){assert.equal(r.count,r.pos===1?7:3);for(const a of r.articles){assert.ok(!ids.has(a.id));ids.add(a.id);assert.equal(a.paragraphs.length,2);assert.ok(a.paragraphs.join(' ').length>200);assert.ok(!bodies.has(a.paragraphs.join(' ')));bodies.add(a.paragraphs.join(' '));assert.ok(a.quote);}}
});
test('templates fill safely, avoid immediate repeats, and never invent championship facts in Quick Race',()=>{
 const c=context();
 const reports=json(c,`SERIES.flatMap(s=>Array.from({length:s.fieldSize},(_,i)=>{
   const ctx={seriesId:s.id,seriesName:s.name,position:i+1,playerName:'A <Driver>',trackName:'Thunder Creek'};
   return [createRaceNews(ctx,()=>0),createRaceNews(ctx,()=>0)];
 })).flat()`);
 for(let i=0;i<reports.length;i+=2){assert.notEqual(reports[i].id,reports[i+1].id);assert.match(reports[i].paragraphs[2],/exhibition/);assert.ok(!JSON.stringify(reports[i]).match(/\{player\}|\{track\}|\{position\}/));}
 const html=vm.runInContext(`renderRaceNews({mode:'quick',reports:[createRaceNews({seriesId:'premier',seriesName:'Premier Cup Series',position:7,playerName:'<img src=x onerror=alert(1)>',trackName:'<script>'},()=>0)]},0)`,c);
 assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('Finish photo unavailable'));
});
test('Career reports snapshot post-race points and the next scheduled track without altering saves',()=>{
 const c=context();
 vm.runInContext(`newGame('Test','Test Driver','Test Car');
   const completed=game.season.calendar[0]; game.season.raceIndex=1;
   game.season.standings.find(s=>s.id==='player').points=123;
   const before=JSON.stringify(game);
   prepareCareerNews(completed,{position:7,points:20},null,true);
   var unchanged=before===JSON.stringify(game);`,c);
 assert.equal(vm.runInContext('unchanged',c),true);
 const n=json(c,'pendingRaceNews');assert.equal(n.simulated,true);assert.equal(n.mode,'career');
 assert.match(n.reports[0].paragraphs[2],/123 points/);assert.match(n.reports[0].paragraphs[2],/20 points/);
 assert.match(n.reports[0].closing,/next scheduled stop/);
 vm.runInContext('game.season.standings.find(s=>s.id===\'player\').points=900',c);
 assert.match(json(c,'pendingRaceNews').reports[0].paragraphs[2],/123 points/);
});
test('DNF reports never celebrate a classified win; final event and split humans have honest context',()=>{
 const c=context();
 const d=json(c,`createRaceNews({seriesId:'grassroots',seriesName:'Grassroots Cup',playerName:'Driver',trackName:'Track',position:1,dnf:true,points:0,standing:{position:4,points:80}},()=>0)`);
 assert.match(d.headline,/DNF/);assert.match(d.paragraphs[0],/did not finish/);assert.match(d.closing,/season are complete/);assert.ok(!d.paragraphs.join(' ').includes('victory'));

});

test('article bank and deterministic repeated reports match pre-refactor fingerprints',()=>{
 const crypto=require('node:crypto'),baseline=JSON.parse(fs.readFileSync('test/fixtures/race-news-fingerprints.json','utf8')),c=context();
 const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
 assert.equal(hash(vm.runInContext('JSON.stringify([RACE_NEWS_REPORTERS,RACE_NEWS_ARTICLES])',c)),baseline.bank);
 const reports=vm.runInContext(`JSON.stringify(SERIES.flatMap(s=>Array.from({length:s.fieldSize},(_,i)=>Array.from({length:9},(_,n)=>createRaceNews({seriesId:s.id,seriesName:s.name,position:i+1,playerName:'Test Driver',trackName:'Test Track',career:true,points:15,standing:{position:3,points:200}},()=>[0,.25,.5,.75,.999][n%5])))).flat(2))`,c);
 assert.equal(hash(reports),baseline.reports);
});
test('news generator reproduces all shipped article scripts byte-for-byte',()=>{
 const path=require('node:path'),writes=new Map();
 vm.runInNewContext(fs.readFileSync('tools/build_news.cjs','utf8'),{__dirname:path.resolve('tools'),console:{log(){}},require:id=>['fs','node:fs'].includes(id)?{mkdirSync(){},writeFileSync:(file,text)=>writes.set(path.resolve(file),text)}:require(id)});
 assert.deepEqual([...writes.keys()].sort(),newsScripts().map(f=>path.resolve('js',f+'.js')).sort());
 for(const [file,text]of writes)assert.equal(fs.readFileSync(file,'utf8'),text);
});
