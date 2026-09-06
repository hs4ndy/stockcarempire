const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_FILES = ['js/data.js', 'js/game.js', 'js/race.js', 'js/race3d.js', 'js/ui.js'];

function makeContext(seed = 123456789) {
  let state = seed >>> 0;
  const seededMath = Object.create(Math);
  seededMath.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  const storage = new Map();
  const context = vm.createContext({
    console,
    Math: seededMath,
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key),
    },
    window: {},
    document: {},
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    setTimeout,
    clearTimeout,
  });

  for (const file of SOURCE_FILES) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  return context;
}

function readJson(context, expression) {
  return JSON.parse(vm.runInContext(`JSON.stringify(${expression})`, context));
}

function physicsContext(seed = 17) {
  const context = makeContext(seed);
  vm.runInContext(`
    function car(id, x, z, speed = 190) {
      return {
        entrantId: id, number: id === 'player' ? 1 : 2, label: id, hex: 0x123456,
        isPlayer: id === 'player', isTeammate: false, power: 0.6, x, z, speed,
        lv: 0, lvx: 0, targetX: x, raceNerve: 1, draftBoost: 0, draftMomentum: 0,
        laneTimer: 0, contactCooldown: 0, spinning: false, finished: false, dnf: false,
        mesh: { position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
          rotation: { x: 0, y: 0, z: 0 } }
      };
    }
    function engine(cars, difficulty = 'semipro') {
      const e = Object.create(Race3DEngine.prototype);
      Object.assign(e, { cars, player: cars.find(c => c.isPlayer), diff: difficultyById(difficulty),
        keys: { a: false, d: false, s: false }, wrecks: [], wreckCount: 0,
        wreckCooldown: Infinity, camShake: 0, finishOrder: [], done: false,
        racing: true, paused: false, paceMode: false,
        _warn() {}, _updateHUD() {}, _updateOrder() {}, _showFinish() {}, _updateCamera() {},
        _dropDebris(c) { this.wrecks.push({ x: c.x, z: c.z }); }
      });
      return e;
    }
  `, context);
  return context;
}

test('tow and push taper continuously across gap and alignment boundaries', () => {
  const context = physicsContext();
  const checks = readJson(context, `[1.449, 1.45, 1.451, 3.799, 3.8, 3.801].map(x => {
    const a = car('player', x, 0), b = car('b', 0, 4.6);
    return r3dWake(a, b);
  })`);
  for (let i = 1; i < 3; i++) {
    assert.ok(Math.abs(checks[i].tow - checks[i - 1].tow) < 0.01);
    assert.ok(Math.abs(checks[i].push - checks[i - 1].push) < 0.01);
  }
  const gaps = readJson(context, `[6.499, 6.5, 6.501, 91.999, 92, 92.001].map(z =>
    r3dWake(car('player', 0, 0), car('b', 0, z)))`);
  assert.ok(Math.abs(gaps[0].tow - gaps[2].tow) < 0.001);
  assert.ok(Math.abs(gaps[0].push - gaps[2].push) < 0.001);
  assert.ok(gaps[3].tow < 0.001);
  assert.equal(gaps[4].tow, 0);
});

test('aero is independent of roster order, with capped smooth release and teammate push', () => {
  const context = physicsContext();
  const result = readJson(context, `(() => {
    const run = reverse => {
      const p = car('player', 0, 0), b = car('b', 0, 4.6), c = car('c', 0, 9.2);
      b.isTeammate = true;
      const e = engine(reverse ? [c, b, p] : [p, b, c]);
      const trace = [];
      for (let i = 0; i < 360; i++) {
        if (i === 180) p.x = 8;
        e._calcDraft(1 / 60);
        trace.push(p.draftBoost);
      }
      return { trace, boosts: [p, b, c].map(c => c.draftBoost), received: b.receivedPush };
    };
    return [run(false), run(true)];
  })()`);
  assert.deepEqual(result[0], result[1]);
  const trace = result[0].trace;
  assert.ok(trace[0] > 0 && trace[0] < 2, 'no instant attachment bonus');
  assert.ok(Math.max(...trace) <= 43);
  assert.ok(trace[180] > trace[179] * 0.97, 'carry run after pulling out');
  for (let i = 181; i < trace.length; i++) assert.ok(trace[i] <= trace[i - 1]);
  assert.ok(trace.at(-1) < trace[180] * 0.1, 'run eventually expires');
  const received = readJson(context, `(() => {
    const p = car('player', 0, 0), b = car('b', 0, 4.6);
    b.isTeammate = true;
    const e = engine([p, b]); e._calcDraft(1);
    return { received: b.receivedPush, leadBoost: b.draftBoost };
  })()`);
  assert.ok(received.received > 8 && received.leadBoost > 0);
});

test('clean-air race pace stays brisk and releasing a tow still carries speed smoothly', () => {
  const context = physicsContext();
  const result = readJson(context, `(() => {
    const p = car('player', 0, 0, R3D.PACE_SPEED), e = engine([p]);
    for (let i = 0; i < 120 * 12; i++) e._updatePlayer(1 / 120);
    const cruise = p.speed;
    p.draftBoost = p.draftMomentum = 30; p.speed = cruise + 30;
    const trace = [];
    for (let i = 0; i < 120 * 6; i++) {
      e._calcDraft(1 / 120); e._updatePlayer(1 / 120);
      trace.push(p.speed);
    }
    e.keys.s = true;
    for (let i = 0; i < 120; i++) e._updatePlayer(1 / 120);
    return { cruise, trace, braked: p.speed };
  })()`);
  assert.ok(result.cruise > 185 && result.cruise < 195);
  assert.ok(result.trace[119] > result.cruise + 18, 'carry an earned run for the passing move');
  for (let i = 1; i < result.trace.length; i++) {
    assert.ok(result.trace[i] >= result.cruise);
    assert.ok(result.trace[i - 1] - result.trace[i] < 0.2, 'no abrupt speed drop on release');
  }
  assert.ok(result.trace.at(-1) < result.cruise + 1, 'draft still expires');
  assert.ok(result.braked < result.cruise * 0.5, 'higher cruising pace must not defeat deliberate braking');
});

test('continuous steering builds, reverses, and settles without a lateral jump', () => {
  const context = physicsContext();
  const trace = readJson(context, `(() => {
    const p = car('player', 0, 0), e = engine([p]), out = [];
    for (let i = 0; i < 180; i++) {
      e.keys.a = i < 60;
      e.keys.d = i >= 120 && i < 132;
      e._updatePlayer(1 / 60);
      out.push({ x: p.x, lv: p.lv });
    }
    return out;
  })()`);
  assert.ok(trace[5].x < 0.2);
  assert.ok(trace[59].x > 2 && trace[59].x < 5.5);
  assert.ok(trace[60].lv > 0 && trace[60].lv < trace[59].lv);
  assert.ok(trace[119].x - trace[59].x < 2.0);
  for (let i = 1; i < trace.length; i++) {
    assert.ok(Math.abs(trace[i].lv - trace[i - 1].lv) <= 20 / 60 + 0.00001);
  }
});

test('separating door contact does not kick cars to maximum lateral speed', () => {
  const context = physicsContext();
  const result = readJson(context, `[30, 60, 120].map(hz => {
    const p = car('player', 1.4, 0), b = car('b', 0, 3.5), e = engine([p, b]);
    p.lv = 2;
    for (let i = 0; i < hz / 2; i++) {
      p.x += p.lv / hz; b.x += b.lvx / hz;
      e._separateCars(1 / hz);
    }
    return { x: p.x, lv: p.lv };
  })`);
  for (const state of result) assert.ok(state.lv < 3);
  assert.ok(Math.abs(result[0].x - result[2].x) < 0.15);
  assert.ok(Math.abs(result[0].lv - result[2].lv) < 0.1);
});

test('AI commits to earned passes, accepts smaller late runs, and respects occupied lanes', () => {
  const context = physicsContext();
  const states = readJson(context, `(() => {
    const run = (aggro, closing, blocked) => {
      const p = car('player', 0, 1000, 190), b = car('b', 0, 980, 190 + closing);
      const cars = [p, b];
      if (blocked) cars.push(car('l', -3, 980), car('r', 3, 980));
      const e = engine(cars);
      e._chooseAILine(b, aggro, 1 / 60);
      const first = b.targetX;
      e._chooseAILine(b, aggro, 1 / 60);
      return { tactic: b._tactic, target: b.targetX, first };
    };
    return [run(0, 6, false), run(0, 1.8, false), run(1, 1.8, false), run(1, 6, true)];
  })()`);
  assert.equal(states[0].tactic, 'pass');
  assert.equal(states[0].target, states[0].first);
  assert.notEqual(states[1].tactic, 'pass');
  assert.equal(states[2].tactic, 'pass');
  assert.equal(states[3].target, 0);
});

test('AI can leave bumper contact and complete a pass without cancelling its own exit', () => {
  const context = physicsContext();
  const result = readJson(context, `(() => {
    const p = car('player', 0, 6004.6, 205), b = car('b', 0, 6000, 211);
    const e = engine([p, b]); b.power = 0.85;
    p.draftBoost = p.draftMomentum = b.draftBoost = b.draftMomentum = 30;
    b._pushLocked = true;
    e._chooseAILine(b, 1, 1 / 120);
    const started = b._tactic;
    let passed = false, maxStep = 0;
    for (let i = 0; i < 120 * 8; i++) {
      const x = b.x;
      e._update(1 / 120);
      maxStep = Math.max(maxStep, Math.abs(b.x - x));
      if (b.z > p.z + R3D.CAR_SEP_Z && Math.abs(b.x - p.x) >= R3D.CAR_SEP_X) passed = true;
    }
    return { started, passed, maxStep };
  })()`);
  assert.equal(result.started, 'pass');
  assert.equal(result.passed, true, 'earned run should carry past the leading car');
  assert.ok(result.maxStep < 0.15);
});

test('teammate ahead holds its line when the player pulls off the bumper', () => {
  const context = physicsContext();
  const result = readJson(context, `(() => {
    const p = car('player', 2, 0), b = car('b', 0, 5);
    b.isTeammate = true;
    engine([p, b])._chooseAILine(b, 1, 1 / 60);
    return { target: b.targetX, helping: b._helping };
  })()`);
  assert.equal(result.target, 0);
  assert.equal(result.helping, true);
});

test('incidents require advance warning and harmless rubbing never randomly spins the player', () => {
  const context = physicsContext();
  const result = readJson(context, `(() => {
    const p = car('player', 0, 1000, 200), near = car('near', 0, 1100), far = car('far', 0, 1800);
    const e = engine([p, near]); const warnings = []; e._warn = msg => warnings.push(msg);
    e._triggerWreck();
    const rejected = e.wreckCount === 0;
    e.cars.push(far); e._triggerWreck();
    for (let i = 0; i < 500; i++) e._bumpPlayer(1, 0);
    return { rejected, farSpins: far.spinning, nearSpins: near.spinning,
      playerSpins: p.spinning, warnings: warnings.length, speed: p.speed };
  })()`);
  assert.equal(result.rejected, true);
  assert.equal(result.farSpins, true);
  assert.equal(result.nearSpins, false);
  assert.equal(result.playerSpins, false);
  assert.equal(result.warnings, 1);
  assert.equal(result.speed, 200);
});

test('seeded full races retain finite bounded motion and unique final classifications', () => {
  for (const difficulty of ['beginner', 'pro']) {
    for (const seed of [3, 71]) {
      const context = physicsContext(seed);
      const result = readJson(context, `(() => {
        const cars = Array.from({ length: 20 }, (_, i) =>
          car(i === 9 ? 'player' : 'ai-' + i, i % 2 ? -3.5 : 3.5, (20 - i) * 18, 175));
        cars.forEach(c => { c.power = 0.45 + Math.random() * 0.35; c.raceNerve = 0.85 + Math.random() * 0.3; });
        const e = engine(cars, '${difficulty}');
        let passes = 0, finite = true, maxStep = 0;
        for (let i = 0; i < 120 * 140 && !e.done; i++) {
          const before = cars.map(c => ({ x: c.x, tactic: c._tactic }));
          e.keys.a = i % 1200 < 30; e.keys.d = i % 1200 >= 600 && i % 1200 < 630;
          e._update(1 / 120);
          cars.forEach((c, k) => {
            if (c._tactic === 'pass' && before[k].tactic !== 'pass') passes++;
            maxStep = Math.max(maxStep, Math.abs(c.x - before[k].x));
            finite = finite && Number.isFinite(c.speed + c.x + c.z) && Math.abs(c.x) <= 9.9;
          });
        }
        return { done: e.done, finite, passes, maxStep,
          ids: e.finalOrder().map(c => c.entrantId),
          positions: e.finalOrder().map(c => c.position) };
      })()`);
      assert.equal(result.done, true, `${difficulty}/${seed}: race must finish`);
      assert.equal(result.finite, true);
      assert.ok(result.maxStep < 0.15, 'no sideways teleport in pack');
      assert.ok(result.passes > 0, 'AI should attempt passes');
      assert.equal(new Set(result.ids).size, 20);
      assert.deepEqual(result.positions, Array.from({ length: 20 }, (_, i) => i + 1));
    }
  }
});

test('every new career series creates the advertised number of championship entries', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const context = makeContext(seed);
    const rosters = readJson(context, `SERIES.map((series, level) => {
      const teams = generateAITeams(level);
      const cars = teams.flatMap(team => team.cars);
      return {
        fieldSize: series.fieldSize,
        carCount: cars.length,
        names: cars.map(car => car.driverName),
        numbers: cars.map(car => car.number),
        teamIdsValid: teams.every(team => team.cars.every(car => car.teamId === team.id)),
      };
    })`);

    for (const roster of rosters) {
      assert.equal(roster.carCount + 1, roster.fieldSize);
      assert.equal(new Set(roster.names).size, roster.names.length);
      assert.equal(new Set(roster.numbers).size, roster.numbers.length);
      assert.equal(roster.teamIdsValid, true);
    }
  }
});

test('track order wins by stable entrant identity and produces unique classifications', () => {
  const context = makeContext();
  context.results = [
    { entrantId: 'player', displayName: 'Player Team / Alex', teamName: 'Player Team', position: 1, isPlayer: true, dnf: false },
    { entrantId: 'car-a', displayName: 'Alpha Racing / Avery', teamName: 'Alpha Racing', position: 2, isPlayer: false, dnf: false },
    { entrantId: 'car-b', displayName: 'Blue Racing / Blake', teamName: 'Blue Racing', position: 3, isPlayer: false, dnf: true },
    { entrantId: 'car-c', displayName: 'Crimson Racing / Casey', teamName: 'Crimson Racing', position: 4, isPlayer: false, dnf: false },
  ];
  context.trackOrder = [
    { entrantId: 'car-c', label: 'Casey', dnf: false },
    { isPlayer: true, entrantId: 'player', label: 'Alex', dnf: false },
    { entrantId: 'car-b', label: 'Blake', dnf: false },
    { entrantId: 'car-a', label: 'Avery', dnf: true },
  ];

  vm.runInContext('game = { currentSeries: 0 };', context);
  const merged = readJson(context, 'reRankWithTeamOrder(results, 2, trackOrder)');

  assert.deepEqual(merged.map(r => r.entrantId), ['car-c', 'player', 'car-b', 'car-a']);
  assert.deepEqual(merged.map(r => r.position), [1, 2, 3, 4]);
  assert.deepEqual(merged.map(r => r.dnf), [false, false, false, true]);
  assert.equal(new Set(merged.map(r => r.position)).size, merged.length);
});

test('full-field identity merging survives 100 randomized finishing orders', () => {
  const context = makeContext();
  vm.runInContext('game = { currentSeries: 0 };', context);

  const baseIds = ['player', ...Array.from({ length: 19 }, (_, i) => `car-${i + 1}`)];
  let randomState = 987654321;
  const random = () => {
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    return randomState / 0x100000000;
  };

  for (let run = 0; run < 100; run++) {
    const finishIds = baseIds.slice();
    for (let i = finishIds.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [finishIds[i], finishIds[j]] = [finishIds[j], finishIds[i]];
    }

    context.results = baseIds.map((id, i) => ({
      entrantId: id,
      displayName: id === 'player' ? 'Player Team / Driver' : `Team ${i} / Duplicate Name`,
      teamName: id === 'player' ? 'Player Team' : `Team ${i}`,
      position: i + 1,
      isPlayer: id === 'player',
      dnf: false,
    }));
    context.trackOrder = finishIds.map((id, i) => ({
      entrantId: id,
      isPlayer: id === 'player',
      label: id === 'player' ? 'Driver' : 'Duplicate Name',
      position: i + 1,
      dnf: false,
    }));

    const merged = readJson(context, 'reRankWithTeamOrder(results, trackOrder.findIndex(x => x.isPlayer) + 1, trackOrder)');
    assert.deepEqual(merged.map(r => r.entrantId), finishIds, `identity order differed on run ${run + 1}`);
    assert.deepEqual(merged.map(r => r.position), Array.from({ length: 20 }, (_, i) => i + 1));
  }
});

test('an unmatched legacy backmarker cannot steal a later stable match', () => {
  const context = makeContext();
  context.results = [
    { entrantId: 'player', displayName: 'Player Team / Alex', teamName: 'Player Team', position: 1, isPlayer: true, dnf: false },
    { entrantId: 'car-a', displayName: 'Alpha Racing / Avery', teamName: 'Alpha Racing', position: 2, isPlayer: false, dnf: false },
    { entrantId: 'sim-guest', displayName: 'Old Guest / Grant', teamName: 'Old Guest', position: 3, isPlayer: false, dnf: false },
  ];
  context.trackOrder = [
    { entrantId: 'track-guest', label: 'Peyton', teamName: 'Track Guest', teamColor: '#123456', dnf: false },
    { entrantId: 'car-a', label: 'Avery', teamName: 'Alpha Racing', dnf: false },
    { isPlayer: true, entrantId: 'player', label: 'Alex', dnf: false },
  ];

  vm.runInContext('game = { currentSeries: 0 };', context);
  const merged = readJson(context, 'reRankWithTeamOrder(results, 3, trackOrder)');

  assert.equal(merged[0].entrantId, 'track-guest');
  assert.equal(merged[0].displayName, 'Track Guest / Peyton');
  assert.equal(merged[1].entrantId, 'car-a');
  assert.equal(merged[2].entrantId, 'player');
});

test('formation lap preserves the starting order despite different race speeds', () => {
  const context = makeContext();
  const result = readJson(context, `(() => {
    const makeMesh = () => ({ position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } } });
    const cars = [
      { x: -3.5, z: 56, speed: 220, mesh: makeMesh() },
      { x:  3.5, z: 26, speed: 150, mesh: makeMesh() },
      { x: -3.5, z:  0, speed: 190, mesh: makeMesh() },
    ];
    const engine = {
      cars,
      player: cars[1],
      keys: { a: false, d: false },
    };
    const before = cars.map(car => car.z);
    Race3DEngine.prototype._updatePaceLap.call(engine, 0.5);
    return {
      gapsBefore: [before[0] - before[1], before[1] - before[2]],
      gapsAfter: [cars[0].z - cars[1].z, cars[1].z - cars[2].z],
      speeds: cars.map(car => car.speed),
    };
  })()`);

  assert.deepEqual(result.gapsAfter, result.gapsBefore);
  assert.deepEqual(result.speeds, [65, 65, 65]);
});

test('same-frame finishers are classified by distance and force a final tower refresh', () => {
  const context = makeContext();
  const result = readJson(context, `(() => {
    const cars = [
      { entrantId: 'player', isPlayer: true, z: R3D.TRACK_LEN + 2, finished: false, dnf: false },
      { entrantId: 'leader', isPlayer: false, z: R3D.TRACK_LEN + 8, finished: false, dnf: false },
      { entrantId: 'third', isPlayer: false, z: R3D.TRACK_LEN - 3, finished: false, dnf: false },
    ];
    const calls = [];
    const engine = {
      cars,
      player: cars[0],
      finishOrder: [],
      done: false,
      _updateOrder: (pos, total) => calls.push({ type: 'tower', pos, total }),
      _showFinish: pos => calls.push({ type: 'finish', pos }),
    };
    Race3DEngine.prototype._checkFinish.call(engine);
    return { order: engine.finishOrder.map(car => car.entrantId), done: engine.done, calls };
  })()`);

  assert.deepEqual(result.order, ['leader', 'player']);
  assert.equal(result.done, true);
  assert.deepEqual(result.calls, [
    { type: 'tower', pos: 2, total: 3 },
    { type: 'finish', pos: 2 },
  ]);
});

test('finalOrder carries stable identity and team metadata into result merging', () => {
  const context = makeContext();
  const result = readJson(context, `(() => {
    const leader = { entrantId: 'car-a', carId: null, isPlayer: false, number: 8, label: 'Avery', teamName: 'Alpha', hex: 0x123456, z: 15001, finished: true, dnf: false };
    const player = { entrantId: 'player', carId: 'p1', isPlayer: true, number: 1, label: 'Alex', teamName: null, hex: 0xe8001d, z: 14999, finished: false, dnf: false };
    const engine = { cars: [player, leader], finishOrder: [leader] };
    return Race3DEngine.prototype.finalOrder.call(engine);
  })()`);

  assert.deepEqual(result.map(r => r.entrantId), ['car-a', 'player']);
  assert.equal(result[0].teamName, 'Alpha');
  assert.equal(result[0].teamColor, '#123456');
  assert.equal(result[1].carId, 'p1');
});

test('race weekend presents track emphasis as normalized percentages', () => {
  const context = makeContext();
  vm.runInContext(`game = {
    currentSeries: 0,
    driverMode: 'driver',
    cars: [{ id: 'p1', number: 1, name: 'Baseline', speed: 42, handling: 45, condition: 100, assignedDriverId: 'player' }],
    hiredDrivers: [],
    season: { raceIndex: 0, calendar: [{ trackId: 't05' }], aiTeams: [] },
  };`, context);

  const html = vm.runInContext('renderRaceSetup()', context);
  assert.match(html, /Speed Emphasis<\/span><span>48%/);
  assert.match(html, /Handling Emphasis<\/span><span>52%/);
  assert.doesNotMatch(html, /Emphasis<\/span><span>\d+\/10/);
});
