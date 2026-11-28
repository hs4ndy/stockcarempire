const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {entries} = require('./helpers/race-sources.cjs');

function engine(mode, dualPlayer = false) {
  const c = vm.createContext({window:{innerWidth:1366,innerHeight:768,devicePixelRatio:2}});
  for (const [file,source] of entries(['js/data.js','js/race3d.js'])) vm.runInContext(source,c,{filename:file});
  c.mode = mode;
  c.dualPlayer = dualPlayer;
  return vm.runInContext(`(() => {
    const e = Object.create(Race3DEngine.prototype);
    e.config = {graphicsMode: mode, dualPlayer};
    e.canvas = {};
    e.renderer = {shadowMap:{}, capabilities:{maxTextureSize:8192},
      setPixelRatio(r){this.ratio=r;},setSize(){}};
    e._configureGraphics();
    return e;
  })()`, c);
}

test('the default and legacy graphics values resolve to Medium', () => {
  const medium = engine();
  assert.equal(medium.graphicsMode, 'medium');
  assert.equal(engine('auto').graphicsMode, 'medium');
  assert.equal(engine('performance').graphicsMode, 'medium');
  assert.equal(medium.lowPower, false);
  assert.equal(medium.renderer.shadowMap.enabled, false);
  assert.ok(medium.renderer.ratio ** 2 * 1366 * 768 <= 1500001);
});

test('Low lowers the pixel budget, while High uses native resolution and shadows in single and dual', () => {
  const low = engine('low');
  assert.equal(low.lowPower, true);
  assert.equal(low.renderer.shadowMap.enabled, false);
  assert.ok(low.renderer.ratio ** 2 * 1366 * 768 <= 1050001);
  for (const dual of [false, true]) {
    const high = engine('high', dual);
    assert.equal(high.renderer.ratio, 2);
    assert.equal(high.renderer.shadowMap.enabled, true);
  }
});
