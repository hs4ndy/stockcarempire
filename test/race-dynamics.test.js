const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_FILES = ['js/data.js', 'js/game.js', 'js/race.js', 'js/race3d.js', 'js/ui.js'];

function runRearStart(seed, fieldSize = 36, difficulty = 'beginner', strategy = 'managed', baseline = null, options = {}) {
  let state = seed >>> 0;
  const seededMath = Object.create(Math);
  seededMath.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const context = vm.createContext({
    console,
    Math: seededMath,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    window: {},
    document: {},
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
    setTimeout,
    clearTimeout,
  });
  for (const file of SOURCE_FILES) {
    const source = baseline && typeof baseline === 'object' ? baseline[file] : baseline ? require('node:child_process').execFileSync('git', ['show', `${baseline}:${file}`], {encoding:'utf8'})
      : fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  vm.runInContext(fs.readFileSync(path.join(ROOT,'test/helpers/race-driver.js'),'utf8'), context);

  return JSON.parse(vm.runInContext(`JSON.stringify((() => {
    function car(id, x, z, speed = 175) {
      return {
        entrantId: id, number: id === 'player' ? 1 : 2, label: id, hex: 0x123456,
        isPlayer: id === 'player', isTeammate: false,
        power: id === 'player' ? ${options.playerPower ?? 0.6} : ${options.quickRace ? '.35 + Math.random() * .45' : '.45 + Math.random() * .35'},
        x, z, speed, lv: 0, lvx: 0, targetX: x,
        raceNerve: 0.85 + Math.random() * 0.3,
        draftBoost: 0, draftMomentum: 0, towStrength: 0, pushStrength: 0,
        laneTimer: Math.random() * 2, contactCooldown: 0,
        spinning: false, finished: false, dnf: false,
        mesh: {
          position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };
    }

    const slots = [];
    const rows = Math.ceil(${fieldSize} / 2);
    for (let row = 0; row < rows; row++) {
      const z = (rows - 1 - row) * R3D.GRID_SPACING;
      slots.push({ x: -3.5, z }, { x: 3.5, z: z - 1.6 });
    }
    slots.length = ${fieldSize};
    const playerIndex = ${options.frontTrain ? (options.teammates || 1) : fieldSize - 1};
    const player = car('player', slots[playerIndex].x, slots[playerIndex].z);
    const cars = [player, ...slots.filter((_,i)=>i!==playerIndex).map((slot, i) =>
      car('ai-' + i, slot.x, slot.z))];
    if (${!!options.frontTrain}) {
      player.power=${options.playerPower ?? .95};
      cars.slice(1,1+${options.teammates || 0}).forEach(c=>{c.isTeammate=true;c.power=.95;});
    }
    if (${!!options.openingPace}) cars.forEach(c=>c.speed=65*${options.seriesId==='grassroots' ? .9 : 1});
    const engine = Object.create(Race3DEngine.prototype);
    Object.assign(engine, {
      cars, player, diff: difficultyById('${difficulty}'),
      speedScale: ${options.seriesId==='grassroots' ? .9 : 1},
      keys: { a: false, d: false, s: false },
      wrecks: [], wreckCount: 0, wreckCooldown: Infinity, camShake: 0,
      finishOrder: [], done: false, racing: true, paused: false, paceMode: false,
      _warn() {}, _updateHUD() {}, _updateOrder() {}, _showFinish() {},
      _updateCamera() {}, _dropDebris() {},
    });

    const driver = {};
    const passStarts = [0, 0, 0];
    const lastTactic = new Map();
    const samples = [];
    let startPosition = null;
    let overtakes=0, priorAhead=new Set(cars.filter(c=>c!==player && c.z>player.z));

    for (let frame = 0; frame < 60 * 140 && !engine.done; frame++) {
      if ('${strategy}' === 'ride') {
        const mate=cars.filter(c=>c.isTeammate && !c.dnf && !c.finished && c.z>player.z).sort((a,b)=>a.z-b.z)[0];
        const target=mate ? mate.x+(player.z/R3D.TRACK_LEN>.92 ? 3.2 : 0) : player.x;
        const err=clamp(target,-9,9)-player.x-player.lv*.22;
        engine.keys.a=err>.3;engine.keys.d=err<-.3;engine.keys.s=false;
      } else raceDriverStep(engine, driver, 1/60, '${strategy}');

      engine._update(1 / 60);
      const nowAhead=new Set(cars.filter(c=>c!==player && !c.dnf && (c.finished || c.z>player.z)));
      for(const c of priorAhead) if(!nowAhead.has(c) && !c.dnf)overtakes++;
      priorAhead=nowAhead;
      for (const car of cars) {
        if (car._tactic === 'pass' && lastTactic.get(car) !== 'pass') {
          const third = Math.min(2, Math.floor((car.z / R3D.TRACK_LEN) * 3));
          passStarts[third]++;
        }
        lastTactic.set(car, car._tactic);
      }

      if (frame % 60 === 0) {
        const active = cars.filter(c => !c.dnf && !c.finished);
        const position = 1 + active.filter(c => c !== player && c.z > player.z).length;
        if (startPosition === null) startPosition = position;
        samples.push({
          span: Math.max(...active.map(c => c.z)) - Math.min(...active.map(c => c.z)),
          chain: Math.max(...active.map(c => c.chainLen || 1)),
          drafting: active.filter(c => c.towStrength > 0.2).length,
          nearby: active.filter(c => c !== player && Math.abs(c.z-player.z) < 100).length,
          leaderGap: Math.max(...active.map(c => c.z)) - player.z,
          playerPush: player.receivedPush || 0,
          playerTow: player.towStrength || 0,
        });
      }
    }

    const median = key => {
      const values = samples.map(sample => sample[key]).sort((a, b) => a - b);
      return values[Math.floor(values.length / 2)] || 0;
    };
    return {
      done: engine.done,
      finish: engine.finishOrder.indexOf(player) + 1,
      startPosition,
      overtakes,
      draftingSeconds: samples.filter(s=>s.drafting>0 && s.playerTow>.04).length,
      openingNearby: samples[Math.min(10,samples.length-1)].nearby,
      openingLeaderGap: samples[Math.min(10,samples.length-1)].leaderGap,
      passStarts,
      medianSpan: median('span'),
      medianDrafting: median('drafting'),
      medianNearby: median('nearby'),
      medianLeaderGap: median('leaderGap'),
      pushedSamples: samples.filter(s => s.playerPush > 1).length,
      maxChain: Math.max(...samples.map(sample => sample.chain)),
    };
  })())`, context));
}

module.exports = { runRearStart };

if (require.main === module) test('All-Out leaves a strong front starter within drafting reach after the opening',()=>{
  const report=runRearStart(17,36,'allout','ride',null,{frontTrain:true,teammates:3});
  assert.equal(report.done,true);
  assert.ok(report.openingNearby>=10,'the field should not immediately disappear');
  assert.ok(report.openingLeaderGap<82,'a strong starter can still reach a useful tow');
  assert.ok(report.finish>1,'passive teammate riding must not become a free win');
});

if (require.main === module) test('Pro keeps pressure on a powerful front-start teammate train', () => {
  const report=runRearStart(17,36,'pro','ride',null,{frontTrain:true,teammates:3,playerPower:.99});
  assert.equal(report.done,true);
  assert.ok(report.finish>1,'a fixed late pullout behind three teammates must not be an automatic win');
  assert.ok(report.medianNearby>=20,'the field must stay close enough to contest the player');
  assert.ok(report.medianSpan<250,'Pro must not let a leading teammate train detach from the field');
});

if (require.main === module) test('chasing groups stay connected and contest positions throughout the race', () => {
  const reports = [3, 17, 41].map(seed => runRearStart(seed,36,'beginner','managed',null,{playerPower:.75}));
  for (const report of reports) {
    assert.equal(report.done, true, 'every measured race must finish');
    assert.equal(report.startPosition, 36, 'the player must begin at the rear');
    assert.ok(report.maxChain >= 4, 'chasing cars should form useful longer lines');
    assert.ok(report.medianSpan > 100 && report.medianSpan < 1100, 'field should have racing room without becoming unreachable');
    assert.ok(report.medianDrafting >= 3, 'chasing groups must use the draft');
    assert.ok(report.passStarts.every(count => count >= 10),
      'AI passing attempts must occur in every third of the race');
  }
  assert.ok(reports.some(report => report.finish === 1),
    `a managed late run must be able to win from the final grid position: ${JSON.stringify(reports)}`);
});
