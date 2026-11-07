const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {entries} = require('./helpers/race-sources.cjs');

function engine(mode='auto', userAgent='Windows', threads=4, memory=4) {
  const c = vm.createContext({navigator:{userAgent,hardwareConcurrency:threads,deviceMemory:memory},
    window:{innerWidth:1366,innerHeight:768,devicePixelRatio:2},document:{hidden:false}});
  for (const [file,source] of entries(['js/race3d.js'])) vm.runInContext(source,c,{filename:file});
  c.mode=mode;
  return vm.runInContext(`(() => {
    const e=Object.create(Race3DEngine.prototype);
    e.config={graphicsMode:mode};e.canvas={};e.racing=true;
    e.renderer={shadowMap:{},getContext(){return {getExtension(){return null;}};},
      setPixelRatio(r){this.ratio=r;},setSize(){}};
    e._configureGraphics();return e;
  })()`,c);
}

test('four-thread or four-GB PC hints do not force low graphics; limited ChromeOS starts low',()=>{
  assert.equal(engine().lowPower,false);
  assert.equal(engine('auto','CrOS x86_64').lowPower,true);
  assert.equal(engine('auto','CrOS x86_64',8,8).lowPower,false);
});
test('legacy High/Performance configuration cannot override automatic selection',()=>{
  const chromebook=engine('high','CrOS',2,2),pc=engine('performance');
  assert.equal(chromebook.graphicsMode,'auto');
  assert.equal(chromebook.lowPower,true);
  assert.equal(pc.graphicsMode,'auto');
  assert.equal(pc.lowPower,false);
  assert.ok(chromebook.renderer.ratio**2*1366*768<=750001);
});
test('Auto reacts to sustained slow frames, ignores pause and recovers after stable frames',()=>{
  const e=engine();
  e.paused=true;for(let i=0;i<120;i++)e._sampleGraphics(1/30);
  assert.equal(e.lowPower,false);
  e.paused=false;
  for(let i=0;i<100;i++)e._sampleGraphics(1/30);
  assert.equal(e.lowPower,true);
  for(let i=0;i<3000;i++)e._sampleGraphics(1/60);
  assert.equal(e.lowPower,false);
});
test('split-screen alone does not force performance quality, while shadows stay bounded',()=>{
  const e=engine('high');e.config.dualPlayer=true;e._setGraphicsQuality(false);
  assert.equal(e.lowPower,false);
  assert.equal(e.renderer.shadowMap.enabled,false);
});
test('Auto can downshift a severely slow device without counting long interruption frames',()=>{
  const e=engine();
  for(let i=0;i<6;i++)e._sampleGraphics(2);
  assert.equal(e.lowPower,false);
  for(let i=0;i<20;i++)e._sampleGraphics(.2);
  assert.equal(e.lowPower,true);
});
