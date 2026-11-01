const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {entries,snapshot}=require('./helpers/race-sources.cjs');
const hash=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
test('race bundle preserves every method body, helper, tuning value and descriptor',()=>{
  const baseline=JSON.parse(fs.readFileSync('test/fixtures/race3d-baseline.json','utf8')),c=vm.createContext({});
  const sources=entries(['js/race3d.js']);for(const [file,source]of sources)vm.runInContext(source,c,{filename:file});
  const actual=vm.runInContext(`({r3d:JSON.stringify(R3D),methods:Object.getOwnPropertyNames(Race3DEngine.prototype).map(name=>{const d=Object.getOwnPropertyDescriptor(Race3DEngine.prototype,name),f=d.value;return {name,length:f.length,enumerable:d.enumerable,configurable:d.configurable,writable:d.writable,source:f.toString()};}),helpers:[r3dSmooth,r3dWake,r3dTex,r3dHex,r3dRoundelTex,launch3DRace].map(f=>({name:f.name,length:f.length,source:f.toString()}))})`,c);
  assert.equal(hash(actual.r3d),baseline.r3d);
  for(const list of ['methods','helpers']){
    const rows=JSON.parse(JSON.stringify(actual[list]));
    for(const f of rows){if(f.name==='constructor')f.source=sources[0][1].match(/  constructor\(canvas[\s\S]*?\n  }/)[0].trim();f.hash=hash(f.source);delete f.source;}
    assert.deepEqual(rows.sort((a,b)=>a.name.localeCompare(b.name)),baseline[list].slice().sort((a,b)=>a.name.localeCompare(b.name)));
  }
  assert.deepEqual(Object.keys(c).sort(),['launch3DRace','r3dRoundelTex','r3dSmooth','r3dTex','r3dWake'].sort());
});
test('all series and difficulties preserve seeded opening state and classification',()=>{
  const {runRearStart}=require('./race-dynamics.test.js');
  for(const row of JSON.parse(fs.readFileSync('test/fixtures/race3d-opening-traces.json','utf8'))){
    const result=runRearStart(17,row.size,row.diff,'managed',null,{seriesId:row.seriesId,quickRace:true,playerPower:.75,raceRules:{crashes:true,damage:true},durationSeconds:4,captureState:true});
    assert.deepEqual(result,row.result,`${row.seriesId}/${row.diff}`);
  }
});
test('historical snapshots remain self-contained without working-tree extensions',()=>{
  const legacy={'js/race3d.js':'legacy engine'};
  assert.deepEqual(entries(['js/race3d.js'],legacy),[['js/race3d.js','legacy engine']]);
  const current=snapshot();assert.deepEqual(entries(['js/race3d.js'],current).map(([file])=>file),entries(['js/race3d.js']).map(([file])=>file));
  assert.throws(()=>entries(['js/game.js'],legacy),/Missing snapshot source/);
});

test('both humans preserve seeded steering, braking, contact, pause and classification traces',()=>{
  const {dualState}=require('./helpers/dual-race-fixture.cjs');
  for(const row of JSON.parse(fs.readFileSync('test/fixtures/race3d-dual-traces.json','utf8')))assert.deepEqual(dualState(row.series,row.difficulty),row.result,`${row.series}/${row.difficulty}`);
});
