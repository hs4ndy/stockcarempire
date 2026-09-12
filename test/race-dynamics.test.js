const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_FILES = ['js/data.js', 'js/game.js', 'js/race.js', 'js/race3d.js', 'js/ui.js'];

function runRearStart(seed, fieldSize = 36, difficulty = 'beginner', strategy = 'managed', baseline = null) {
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
    const source = baseline ? require('node:child_process').execFileSync('git', ['show', `${baseline}:${file}`], {encoding:'utf8'})
      : fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  vm.runInContext(fs.readFileSync(path.join(ROOT,'test/helpers/race-driver.js'),'utf8'), context);

  return JSON.parse(vm.runInContext(`JSON.stringify((() => {
    function car(id, x, z, speed = 175) {
      return {
        entrantId: id, number: id === 'player' ? 1 : 2, label: id, hex: 0x123456,
        isPlayer: id === 'player', isTeammate: false,
        power: id === 'player' ? 0.6 : 0.45 + Math.random() * 0.35,
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
    const player = car('player', slots.at(-1).x, slots.at(-1).z);
    const cars = [player, ...slots.slice(0, -1).map((slot, i) =>
      car('ai-' + i, slot.x, slot.z))];
    const engine = Object.create(Race3DEngine.prototype);
    Object.assign(engine, {
      cars, player, diff: difficultyById('${difficulty}'),
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

    for (let frame = 0; frame < 60 * 140 && !engine.done; frame++) {
      raceDriverStep(engine, driver, 1/60, '${strategy}');

      engine._update(1 / 60);
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

if (require.main === module) test('chasing groups stay connected and contest positions throughout the race', () => {
  const reports = [3, 17, 41].map(seed => runRearStart(seed));
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
