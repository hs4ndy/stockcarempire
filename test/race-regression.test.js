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
