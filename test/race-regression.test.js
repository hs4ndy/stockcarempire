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

for (const legacyRole of ['driver', 'manager', 'hired']) {
  test(`legacy ${legacyRole} saves become driver-owner careers without losing progress`, () => {
    const context = makeContext();
    vm.runInContext(`
      newGame('Legacy Racing', 'Legacy Driver', 'Legacy Car');
      game.money = 712345;
      game.currentSeries = 2;
      game.season.aiTeams = generateAITeams(2); rebuildStandings();
      game.history = [{year: 1, series: 'Grassroots Cup', wins: 4, finalPos: 2, payout: 90000}];
      game.season.year = 4;
      game.season.raceIndex = 3;
      game.cars[0].assignedDriverId = null;
      game.driverMode = ${JSON.stringify(legacyRole)};
      game.hiredTeamId = game.season.aiTeams[0].id;
      game.hiredSalary = 8000;
      game.premierChoicePending = true;
      const original = JSON.stringify(game);
      localStorage.setItem('sce_slot_2', original);
      const loadedOk = loadFromSlot(2);
    `, context);
    assert.equal(vm.runInContext('loadedOk', context), true);
    const original = readJson(context, 'JSON.parse(original)');
    const expected = structuredClone(original);
    for (const key of ['driverMode', 'hiredTeamId', 'hiredSalary', 'premierChoicePending']) delete expected[key];
    expected.cars[0].assignedDriverId = 'player';
    assert.deepEqual(readJson(context, 'game'), expected);
    // Loading does not overwrite the saved slot until the next save.
    assert.deepEqual(readJson(context, "JSON.parse(localStorage.getItem('sce_slot_2'))"), original);
    vm.runInContext('saveGame()', context);
    assert.deepEqual(readJson(context, "JSON.parse(localStorage.getItem('sce_slot_2'))"), expected);
    assert.doesNotMatch(vm.runInContext('renderCareerStats()', context), /<span>Role<\/span>/);
    assert.doesNotMatch(vm.runInContext('renderRaceSetup()', context), /drive for|assigned automatically/);
    assert.equal(vm.runInContext('typeof chooseCareerPath', context), 'undefined');
    assert.equal(vm.runInContext('typeof renderPremierChoiceModal', context), 'undefined');
  });
}

test('career simulation requires the player in an available owned car and retains teammates', () => {
  const context = makeContext();
  vm.runInContext(`
    newGame('Owner Driver Racing', 'Player Driver', 'Player Car');
    game.money = 500000;
    buyCar('Teammate Car');
    game.reputation = 100; hireDriver(HIREABLE_DRIVERS[0].id, game.cars[1].id);
    const ownCarId = game.cars[0].id;
    const teammateCarId = game.cars[1].id;
    const entries = buildEntryList(ownCarId, currentRace().trackId);
  `, context);
  assert.equal(vm.runInContext("entries.filter(e => e.isPlayer).length", context), 1);
  assert.equal(vm.runInContext("entries.find(e => e.isPlayer).teamName", context), 'Owner Driver Racing');
  assert.equal(vm.runInContext("entries.filter(e => e.id === teammateCarId).length", context), 1);
  assert.throws(() => vm.runInContext('buildEntryList(null, currentRace().trackId)', context), /player must drive/);
  assert.throws(() => vm.runInContext('buildEntryList(teammateCarId, currentRace().trackId)', context), /player must drive/);
  const result = readJson(context, 'simulateRace({playerCarId: ownCarId, trackId: currentRace().trackId})');
  assert.equal(result.playerResult.carId, vm.runInContext('ownCarId', context));
  assert.equal(result.results.length, 20);
  assert.throws(() => vm.runInContext('renderRaceResultsModal([], [], null)', context), /require the player/);
});

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

test('Grassroots race purses and sponsor income support early career growth', () => {
  const context = makeContext();
  const economy = readJson(context, `({
    grassrootsPrize: SERIES[0].prize,
    challengerWin: SERIES[1].prize[0],
    grassrootsSponsors: SPONSOR_DEALS.filter(deal => deal.level === 0),
  })`);

  assert.deepEqual(economy.grassrootsPrize.slice(0, 5), [15000, 11000, 8500, 7000, 6000]);
  assert.equal(economy.grassrootsPrize.at(-1), 300);
  assert.ok(economy.grassrootsPrize.every((amount, index, prizes) => index === 0 || amount <= prizes[index - 1]));
  assert.ok(economy.grassrootsPrize[0] < economy.challengerWin, 'series progression must remain intact');
  assert.deepEqual(economy.grassrootsSponsors.map(deal => deal.weekly), [800, 1600, 1300]);
  assert.deepEqual(economy.grassrootsSponsors.map(deal => deal.bonus), [500, 1500, 3000]);

  const sponsorIncome = vm.runInContext(`(() => {
    newGame('Economy Test', 'Taylor Tester', 'Test Car');
    game.activeSponsors = ['sp01', 'sp02', 'sp03'];
    return weeklySponsorIncome();
  })()`, context);
  assert.equal(sponsorIncome, 3700);

  const winningWeekendIncome = vm.runInContext(`(() => {
    const carId = game.cars[0].id;
    const before = game.money;
    const result = { entrantId: 'player', carId, position: 1, isPlayer: true };
    postRaceUpdate(result, SERIES[0].prize[0], [result]);
    return game.money - before;
  })()`, context);
  assert.equal(winningWeekendIncome, 23700, 'win purse plus all three base and bonus payments');
});

for (const event of ['completed', 'skipped']) {
  for (const roster of [
    { name: 'empty roster', staff: [], drivers: [] },
    { name: 'staff only', staff: [300, 500], drivers: [] },
    { name: 'drivers only', staff: [], drivers: [700, 900] },
    { name: 'staff and drivers', staff: [300, 500], drivers: [700, 900] },
  ]) {
    test(`${event} event charges budget payroll once for ${roster.name}`, () => {
      const context = makeContext();
      const payroll = roster.staff.concat(roster.drivers).reduce((sum, cost) => sum + cost, 0);
      const result = readJson(context, `(() => {
        newGame('Payroll Test', 'Taylor Tester', 'Test Car');
        game.money = 100;
        game.activeSponsors = [];
        game.staff = ${JSON.stringify(roster.staff)}.map(weeklyCost => ({ weeklyCost }));
        // Unentered drivers still receive their contracted weekly wages.
        game.hiredDrivers = ${JSON.stringify(roster.drivers)}.map((weeklyCost, index) =>
          ({ driverId: 'payroll-' + index, carId: 'unentered-' + index, weeklyCost }));
        const budget = weeklyExpenses();
        const beforeIndex = game.season.raceIndex;
        const pr = { entrantId: 'player', carId: game.cars[0].id, position: 1, isPlayer: true };
        if (${JSON.stringify(event)} === 'completed') postRaceUpdate(pr, 1000, [pr]);
        else skipRace();
        return { budget, money: game.money, advanced: game.season.raceIndex - beforeIndex };
      })()`);
      assert.equal(result.budget, payroll);
      assert.equal(result.money, 100 + (event === 'completed' ? 1000 : 0) - payroll);
      assert.equal(result.advanced, 1);
    });
  }
}

test('releasing a hired driver removes their wages from subsequent event payroll', () => {
  const context = makeContext();
  const result = readJson(context, `(() => {
    newGame('Payroll Test', 'Taylor Tester', 'Test Car');
    game.activeSponsors = [];
    const driver = HIREABLE_DRIVERS[0];
    const startingMoney = driver.weeklyCost * 4 + 10000;
    game.money = startingMoney;
    game.reputation = 100; const hired = hireDriver(driver.id, game.cars[0].id);
    const afterSigning = game.money;
    const contractedPayroll = weeklyExpenses();
    fireDriver(driver.id);
    const releasedPayroll = weeklyExpenses();
    skipRace();
    return { hired: hired.ok, signingFee: startingMoney - afterSigning,
      weeklyCost: driver.weeklyCost, contractedPayroll, releasedPayroll,
      afterSigning, afterEvent: game.money };
  })()`);
  assert.equal(result.hired, true);
  assert.equal(result.signingFee, result.weeklyCost * 4);
  assert.equal(result.contractedPayroll, result.weeklyCost);
  assert.equal(result.releasedPayroll, 0);
  assert.equal(result.afterEvent, result.afterSigning);
});

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
  const gaps = readJson(context, `[6.499, 6.5, 6.501, R3D.DRAFT_Z - .001, R3D.DRAFT_Z, R3D.DRAFT_Z + .001].map(z =>
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
      for (let i = 0; i < 420; i++) {
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
    const traffic = Array.from({length: 4}, (_, i) => car('traffic-' + i, i % 2 ? -4 : 4, 120 + i * 20));
    const e = engine([p, b, ...traffic]); e._calcDraft(1);
    return { received: b.receivedPush, leadBoost: b.draftBoost, teammate: b.isTeammate };
  })()`);
  assert.equal(received.teammate, true);
  assert.ok(received.received > 0 && received.received <= 6 && received.leadBoost > 0,
    'teammates receive the same capped push as any other partner');
});

test('third car carries an earned draft run while moving out to pass', () => {
  const context = physicsContext();
  const result = readJson(context, `(() => {
    const p = car('player', 0, 0, 205), second = car('second', 0, 4.6, 205),
      leader = car('leader', 0, 9.2, 205), e = engine([p, second, leader]);
    for (let i = 0; i < 240; i++) e._calcDraft(1 / 60);
    const built = p.draftMomentum;
    p.x = 4.5;
    const trace = [];
    for (let i = 0; i < 240; i++) {
      e._calcDraft(1 / 60);
      if ([0, 29, 59, 119, 239].includes(i)) trace.push(p.draftMomentum);
    }
    return { built, trace, timer: p._draftCarryTimer };
  })()`);
  assert.ok(result.built > 25, 'third car should build a meaningful run');
  assert.ok(result.trace[1] > result.built * 0.9, 'run must survive the first half-second out of line');
  assert.ok(result.trace[2] > result.built * 0.68, 'momentum must still be useful after one second');
  assert.ok(result.trace[3] < result.trace[2], 'carried momentum must begin wearing off');
  assert.ok(result.trace.at(-1) < result.built * 0.25, 'carried run must eventually expire');
  assert.equal(result.timer, 0);
});

test('longer connected lines earn more speed, including their lead car', () => {
  const context = physicsContext();
  const runs = readJson(context, `[1,2,3,5,8].map(size => {
    const cars = Array.from({length:size}, (_,i) => car(i === 0 ? 'player' : 'ai-'+i, 0, 5000-i*4.6, 210));
    const e = engine(cars, 'semipro');
    for (let i=0;i<300;i++) e._calcDraft(1/60);
    return {size, front:cars[0].draftBoost, mean:cars.reduce((n,c)=>n+c.draftBoost,0)/size,
      counts:cars.map(c=>c.chainLen)};
  })`);
  for (let i=1;i<runs.length;i++) {
    assert.ok(runs[i].front > runs[i-1].front, 'front car should benefit from the larger line');
    assert.ok(runs[i].mean > runs[i-1].mean, 'longer line should earn a faster average pace');
    assert.ok(runs[i].counts.every(n=>n === runs[i].size));
    assert.ok(runs[i].front <= 43, 'player aero remains capped');
    assert.ok(runs[i].mean <= 43 * 1.05, 'train gains remain bounded by AI/player aero ceilings');
  }
});

test('rivals push the player while chasing and hold still to receive a push', () => {
  const context = physicsContext();
  const result = readJson(context, `(() => {
    const p = car('player',0,5000,210), rival=car('rival',0,4995,212), lead=car('lead',5,5400,210);
    const e=engine([p,rival,lead],'pro');
    e._chooseAILine(rival,.7,1/60);
    const pushing=rival._tactic;
    e._calcDraft(1/60);
    const received=p.receivedPush;
    p.z=4990; rival.z=5000;
    rival._tactic=null; rival.laneTimer=rival.tacticTimer=0;
    e._chooseAILine(rival,.7,1/60);
    return {pushing,received,receiving:rival._tactic,target:rival.targetX};
  })()`);
  assert.equal(result.pushing,'push');
  assert.ok(result.received > 1);
  assert.equal(result.receiving,'receive');
  assert.equal(result.target,0);
});

test('a separated or retired car stops extending a drafting line', () => {
  const context = physicsContext();
  const result = readJson(context, `(() => {
    const p=car('player',0,5000), middle=car('middle',0,4995.4), back=car('back',0,4990.8);
    const e=engine([p,middle,back]);
    e._calcDraft(1/60);
    const connected=e.cars.map(c=>c.chainLen);
    back.x=7;
    e._calcDraft(1/60);
    const separated=e.cars.map(c=>c.chainLen);
    middle.dnf=true;
    e._calcDraft(1/60);
    return {connected,separated,retired:e.cars.map(c=>c.chainLen),boost:middle.draftBoost};
  })()`);
  assert.deepEqual(result.connected,[3,3,3]);
  assert.deepEqual(result.separated,[2,2,1]);
  assert.deepEqual(result.retired,[1,1,1]);
  assert.equal(result.boost,0);
});

test('a brief wake touch cannot bank an unearned full-strength passing boost', () => {
  const context=physicsContext();
  const result=readJson(context, `(() => {
    const p=car('player',0,0), front=car('front',0,4.6), e=engine([p,front]);
    e._calcDraft(1/60);
    const earned=p.draftBoost;
    p.x=7;
    for(let i=0;i<60;i++) e._calcDraft(1/60);
    return {earned,later:p.draftBoost};
  })()`);
  assert.ok(result.earned>0 && result.earned<2);
  assert.ok(result.later<result.earned);
});

test('small bumper alignment offsets do not trap a car between two safe exits', () => {
  const context = physicsContext();
  const result = readJson(context, `(() => {
    const p = car('player',0,5000,210), front=car('front',.15,5004.6,210),
      back=car('back',-.15,4995.4,210), e=engine([p,front,back]);
    const clear = [-3.1,3.1].map(x=>e._laneSafe(p,x));
    e.cars.push(car('alongside',3.1,5000,210));
    return {clear,occupied:e._laneSafe(p,3.1)};
  })()`);
  assert.deepEqual(result.clear,[true,true]);
  assert.equal(result.occupied,false);
});

test('clean-air race pace stays brisk and releasing a tow still carries speed smoothly', () => {
  const context = physicsContext();
  const result = readJson(context, `(() => {
    const p = car('player', 0, 0, R3D.PACE_SPEED), e = engine([p]);
    for (let i = 0; i < 120 * 12; i++) e._updatePlayer(1 / 120);
    const cruise = p.speed;
    const partner = car('partner', 0, p.z + 4.6, cruise);
    e.cars.push(partner);
    for (let i = 0; i < 120 * 4; i++) e._calcDraft(1 / 120);
    p.speed = cruise + p.draftBoost;
    partner.x = 8;
    const trace = [];
    for (let i = 0; i < 120 * 6; i++) {
      e._calcDraft(1 / 120); e._updatePlayer(1 / 120);
      trace.push(p.speed);
    }
    e.keys.s = true;
    for (let i = 0; i < 120; i++) e._updatePlayer(1 / 120);
    return { cruise, trace, braked: p.speed };
  })()`);
  assert.ok(result.cruise > 207 && result.cruise < 211);
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
    for (let i = 0; i < 120; i++) {
      e.keys.a = i < 18;
      e.keys.d = i >= 70 && i < 82;
      e._updatePlayer(1 / 60);
      out.push({ x: p.x, lv: p.lv });
    }
    return out;
  })()`);
  assert.ok(trace[5].x > 0.25 && trace[5].x < 0.5);
  assert.ok(trace[17].x > 2.2 && trace[17].x < 3.5);
  assert.ok(trace[18].lv > 0 && trace[18].lv < trace[17].lv);
  assert.ok(trace[69].x - trace[17].x < 5.2);
  for (let i = 1; i < trace.length; i++) {
    assert.ok(Math.abs(trace[i].lv - trace[i - 1].lv) <= 60 / 60 + 0.00001);
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

test('team identity changes neither AI pace, decisions, recovery nor aero', () => {
  const c=physicsContext();
  const r=readJson(c, `DIFFICULTIES.map(diff => {
    const run=teammate=>{
      const p=car('player',0,5000,230), b=car('b',0,4995,220), lead=car('lead',4,5400,240);
      b.isTeammate=teammate;b.power=.95;
      const e=engine([p,b,lead],diff.id);
      for(let i=0;i<180;i++){e._updateAI(1/120);e._calcDraft(1/120);}
      return {pace:e._naturalAIPace(b),x:b.x,z:b.z,speed:b.speed,tactic:b._tactic,draft:b.draftBoost};
    };
    return [run(false),run(true)];
  })`);
  for(const pair of r) assert.deepEqual(pair[0],pair[1]);
});

test('sustained bumper pushing triggers a safe, difficulty-scaled breakaway for every driver', () => {
  const context=physicsContext();
  const reports=readJson(context, `DIFFICULTIES.flatMap(diff=>[false,true].map(teammate=>{
    const p=car('player',0,5000,210), lead=car('lead',0,5004.6,210);
    lead.isTeammate=teammate;
    const e=engine([p,lead],diff.id);let response=null;
    for(let i=0;i<600;i++){e._chooseAILine(lead,.8,1/60);if(lead._tactic==='breakaway'){response=(i+1)/60;break;}}
    return {diff:diff.id,teammate,response,target:lead.targetX,safe:e._laneSafe(lead,lead.targetX)};
  }))`);
  for(const r of reports){assert.ok(r.response>0 && r.response<=8.1);assert.notEqual(r.target,0);assert.equal(r.safe,true);}
  assert.ok(reports.find(r=>r.diff==='pro').response<reports.find(r=>r.diff==='beginner').response);
});

test('direct pushes remain bounded without recycling accumulated draft momentum', () => {
  const context=physicsContext();
  const r=readJson(context, `(()=>{
    const p=car('player',0,5000,210), lead=car('lead',0,5004.6,210);
    const e=engine([p,lead],'pro');
    for(let i=0;i<360;i++)e._calcDraft(1/60);
    const before=lead.draftMomentum, follower=p.draftMomentum;
    p.x=6;e._calcDraft(1/60);
    return {before,follower,after:lead.draftMomentum};
  })()`);
  assert.ok(r.before>0 && r.before<15,'a pair receives direct push and train aero, without recirculation');
  assert.ok(r.after>r.before*.97,'the leader retains earned momentum on separation');
});

test('AI drafting increases on every difficulty and pack pressure scales to Pro', () => {
  const context = physicsContext();
  const report = readJson(context, `DIFFICULTIES.map(diff => {
    const p=car('player',0,6000,260), mate=car('mate',0,5995,210);
    mate.isTeammate=true;
    const e=engine([p,mate],diff.id);
    const front=mate.isTeammate;
    mate.z=5700;
    e._chooseAILine=()=>{};
    e._updateAI(1/60);
    return {id:diff.id,draft:diff.aiDraft,pressure:diff.packPressure,speed:mate.speed,front};
  })`);
  for (const r of report) {assert.equal(r.draft,r.id==='allout'?1.08:1.05);assert.equal(r.front,true);}
  for(let i=1;i<report.length;i++) assert.ok(report[i].speed>=report[i-1].speed);
  assert.ok(report.at(-1).speed>210,'a detached Pro car accelerates to reconnect');
});

test('difficulty above Beginner is strictly tougher in pace, racecraft and comeback help', () => {
  const context = makeContext();
  const values = readJson(context, `DIFFICULTIES.map(d => ({
    id:d.id, speed:d.aiSpeed, power:d.aiPower, aggression:d.aiAggro,
    playerDraft:d.playerDraft, playerCatchup:d.playerCatchup, racecraft:d.racecraft
  }))`);
  for (let i = 1; i < values.length; i++) {
    assert.ok(values[i].speed > values[i - 1].speed);
    assert.ok(values[i].power > values[i - 1].power);
    assert.ok(values[i].aggression > values[i - 1].aggression);
    assert.ok(values[i].racecraft > values[i - 1].racecraft);
    // Pro draft support is independently tuned by user request; AI pace and comeback retain their ordering.
    assert.ok(values[i].playerDraft > 0 && values[i].playerDraft <= values[0].playerDraft);
    assert.ok(values[i].playerCatchup < values[i - 1].playerCatchup);
  }
});

test('All-Out boosts simulated rivals without changing teammates or economy',()=>{
  const sample=difficulty=>{
    const c=makeContext(17);
    return readJson(c,`(()=>{newGame('Team','Driver','Car');game.difficulty='${difficulty}';return {rival:calcPerf({syntheticPower:.6},TRACKS[0]),teammate:calcPerf({syntheticPower:.6,isTeammate:true},TRACKS[0]),money:game.money};})()`);
  };
  const pro=sample('pro'),allout=sample('allout');
  assert.ok(allout.rival>pro.rival+9);
  assert.equal(allout.teammate,pro.teammate);assert.equal(allout.money,pro.money);
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
  for (const difficulty of ['beginner', 'pro', 'allout']) {
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
    cars: [{ id: 'p1', number: 1, name: 'Baseline', speed: 42, handling: 45, condition: 100, assignedDriverId: 'player' }],
    hiredDrivers: [],
    season: { raceIndex: 0, calendar: [{ trackId: 't05' }], aiTeams: [] },
  };`, context);

  const html = vm.runInContext('renderRaceSetup()', context);
  assert.match(html, /Speed Emphasis<\/span><span>48%/);
  assert.match(html, /Handling Emphasis<\/span><span>52%/);
  assert.doesNotMatch(html, /Emphasis<\/span><span>\d+\/10/);
});


test('Premier field and legacy roster expand to 40 without losing points', () => {
  const c = makeContext();
  vm.runInContext(`newGame('Test','Driver','Car'); game.currentSeries=2; game.season.aiTeams=generateAITeams(2); rebuildStandings();
    game.season.aiTeams[game.season.aiTeams.length-1].cars.pop(); rebuildStandings(); game.season.standings[0].points=123; saveToSlot(1); loadFromSlot(1);`,c);
  assert.equal(vm.runInContext('game.season.aiTeams.reduce((n,t)=>n+t.cars.length,0)',c),39);
  assert.equal(vm.runInContext('game.season.standings[0].points',c),123);
  assert.equal(vm.runInContext('buildEntryList(game.cars[0].id,currentRace().trackId).length',c),40);
});
test('Jake requires reputation and first-season teammate standings use driver-first names', () => {
 const c=makeContext();
 vm.runInContext(`newGame('Test Team','Player','Car'); game.money=500000; buyCar('Mate'); const rejected=hireDriver('drv01',game.cars[1].id); game.reputation=100; const hired=hireDriver('drv01',game.cars[1].id); applyRaceResults([{entrantId:game.cars[1].id,carId:game.cars[1].id,displayName:'Test Team / Jake Rivers',position:3}]);`,c);
 assert.equal(vm.runInContext('rejected.ok',c),false); assert.equal(vm.runInContext('hired.ok',c),true);
 assert.match(vm.runInContext('standingName(game.season.standings.find(e=>e.isTeamCar))',c),/^Jake Rivers <span/);
 assert.equal(vm.runInContext("HIREABLE_DRIVERS[0].skill",c),88);
});

test('strong Pro simulated cars remain competitive without near-guaranteed wins', () => {
 let wins=0, total=0;
 for(let seed=1;seed<=100;seed++) {
  const c=makeContext(seed);
  const pos=vm.runInContext(`newGame('Test','Driver','Car'); game.playerSkill=95; Object.assign(game.cars[0],{speed:95,handling:95,reliability:95,condition:100}); game.difficulty='pro'; simulateRace({playerCarId:game.cars[0].id,trackId:currentRace().trackId}).playerResult.position`,c);
  wins+=pos===1; total+=pos;
 }
 assert.ok(wins<40, `too many simulation wins: ${wins}`);
 assert.ok(total/100>2 && total/100<10, 'competitive results without automatic front finishes');
});

test('extended wake provides a useful tow beyond the former 82-unit cutoff', () => {
 const c=physicsContext();
 const r=readJson(c,`(() => {const p=car('player',0,0,210),b=car('b',0,95,210),e=engine([p,b],'pro');for(let i=0;i<240;i++)e._calcDraft(1/60);return {tow:r3dWake(p,b).tow,boost:p.draftBoost,out:r3dWake(p,{...b,z:121}).tow};})()`);
 assert.ok(r.tow>0 && r.boost>3); assert.equal(r.out,0);
});
test('isolated Pro player can regain the wake without giving the leader a recovery bonus', () => {
 const c=physicsContext();
 const r=readJson(c,`(() => {const p=car('player',0,0,210),b=car('b',0,500,240),e=engine([p,b],'pro');let maxSpeed=0;for(let i=0;i<60*40;i++){b.z+=240/60;e._calcDraft(1/60);e._updatePlayer(1/60);maxSpeed=Math.max(maxSpeed,p.speed);}const alone=car('player',0,0,210),lead=engine([alone],'pro');for(let i=0;i<300;i++)lead._updatePlayer(1/60);return {gap:b.z-p.z,maxSpeed,leaderSpeed:alone.speed};})()`);
 assert.ok(r.gap<120,`did not regain wake: ${r.gap}`);assert.ok(r.maxSpeed<=270);assert.ok(r.leaderSpeed<211);
});
test('installed career upgrades have a larger playable pace effect and preserve existing stats', () => {
 const c=makeContext();
 const r=readJson(c,`(() => {newGame('Test','Driver','Car');game.money=500000;const car=game.cars[0],before=careerRacePower(car,game.playerSkill),speed=car.speed;const result=upgradeCar(car.id,'engine_tune');const after=careerRacePower(car,game.playerSkill);return {ok:result.ok,before,after,delta:car.speed-speed,paceGain:210*.28*(after-before)};})()`);
 assert.equal(r.ok,true);assert.equal(r.delta,8);assert.ok(r.after>r.before);assert.ok(r.paceGain>1.0);
});

test('Pro extra comeback help targets the back and does not help the leader', () => {
 const c=physicsContext();
 const r=readJson(c,`[0,10,30].map(z=>{const run=extra=>{const p=car('player',0,z,200),a=car('a',0,5,200),b=car('b',0,20,200),e=engine([p,a,b],'pro');e.diff={...e.diff,lastPlaceBoost:extra};e._updatePlayer(1);return p.speed;};return run(1.26)-run(0);})`);
 assert.ok(r[0]>0.9);assert.ok(r[1]<0.01);assert.equal(r[2],0);
});


test('opening acceleration blends from AI response back to normal race response',()=>{
 const c=physicsContext();
 const r=readJson(c,`[65,195,210].map(speed=>{const p=car('player',0,0,speed),e=engine([p],'pro');e._updatePlayer(0.1);return {initial:speed,speed:p.speed};})`);
 for(const [i,rate] of [2.2,1.9,1.6].entries()) assert.ok(Math.abs(r[i].speed-(209.58+(r[i].initial-209.58)*Math.exp(-rate*.1)))<1e-8);
});
test('AI and human recovery obey the same final speed cap in every series',()=>{
 const c=physicsContext();
 const r=readJson(c,`[.9,1].map(scale=>{const p=car('player',0,0,100),a=car('a',0,1000,100),e=engine([p,a],'allout');e.speedScale=scale;p.draftBoost=a.draftBoost=300;for(let i=0;i<600;i++){e._updatePlayer(1/60);e._updateAI(1/60);}return {p:p.speed,a:a.speed,limit:270*scale};})`);
 for(const v of r){assert.ok(v.p<=v.limit+1e-8);assert.ok(v.a<=v.limit+1e-8);}
});
test('career power remap lifts stock equipment and preserves monotonic upgrade gains',()=>{
 const c=makeContext();const r=readJson(c,`(()=>{newGame('Test','Driver','Car');return {stock:careerRacePower(game.cars[0],60),upper:careerRacePower({speed:99,handling:99,reliability:99},99),levels:[40,50,60,70,80,90,99].map(n=>careerRacePower({speed:n,handling:n,reliability:n},60))};})()`);
 assert.ok(r.stock>.57&&r.stock<.59);assert.equal(r.upper,.99);for(let i=1;i<r.levels.length;i++)assert.ok(r.levels[i]>r.levels[i-1]);
});

test('owned teammates use the ordinary rival clean-air curve',()=>{
 const c=physicsContext();const r=readJson(c,`(()=>{const p=car('player',0,0),b=car('b',0,10),e=engine([p,b],'pro');b.isTeammate=true;b.power=.99;return e._naturalAIPace(b);})()`);
 assert.ok(Math.abs(r-210*(.86+.99*.15)*1.05)<1e-8);
});
test('AI recovery references natural pace rather than a boosted leader speed',()=>{
 const c=physicsContext();const r=readJson(c,`(()=>{const p=car('player',0,6000,270),b=car('b',0,5500,200),e=engine([p,b],'pro');e._chooseAILine=()=>{};for(let i=0;i<300;i++)e._updateAI(1/60);return b.speed;})()`);
 assert.ok(r<220,'a boosted leader must not ratchet recovery targets toward270');
});


test('Quick Race recovery reconnects within20s in every mode and series then fades',()=>{
 const c=physicsContext();const rows=readJson(c,`DIFFICULTIES.flatMap(d=>[.9,1,1].map(scale=>{
   const p=car('player',0,0,210*scale),b=car('b',0,300,250*scale),e=engine([p,b],d.id);e.speedScale=scale;p.power=.75;
   let time=0;while(b.z-p.z>=120 && time<20){b.z+=250*scale/120;e._calcDraft(1/120);e._updatePlayer(1/120);time+=1/120;}
   return {mode:d.id,scale,time,gap:b.z-p.z,at60:e._playerRecoveryTarget(220,b,60),leader:e._playerRecoveryTarget(220,null,0),partial:e._playerRecoveryTarget(220,b,100),full:e._playerRecoveryTarget(220,b,140)};
 }))`);
 for(const r of rows){assert.ok(r.gap<120,JSON.stringify(r));assert.ok(r.time<20);assert.equal(r.at60,220);assert.equal(r.leader,220);assert.ok(r.partial>220 && r.partial<r.full);}
});

test('human recovery target is identical for the second split-screen player',()=>{
 const c=physicsContext();const r=readJson(c,`(()=>{const p=car('player',0,0,200),q=car('player2',5,0,200),b=car('b',0,300,250),e=engine([p,q,b],'allout');q.isPlayer=true;e.player2=q;e.keys2={a:false,d:false,s:false};e._playerTraffic=e.cars.map(c=>({car:c,z:c.z,speed:c.speed}));e._updatePlayer(.1);e._withSecond(()=>e._updatePlayer(.1));return [p.speed,q.speed];})()`);
 assert.equal(r[0],r[1]);
});

test('contact transfers speed without creating it and enforces the cap for all identities',()=>{
 const c=physicsContext();const rows=readJson(c,`[.9,1].flatMap(scale=>[false,true].map(team=>{
   const p=car('player',0,5000,268*scale),b=car('b',0,4996,270*scale),e=engine([p,b],'pro');p.isTeammate=team;e.speedScale=scale;
   const before=p.speed+b.speed;e._separateCars(.1);const after=p.speed+b.speed;
   b.speed=290*scale;e._separateCars(.1);return {before,after,p:p.speed,b:b.speed,limit:270*scale};
 }))`);
 for(const r of rows){assert.ok(Math.abs(r.before-r.after)<1e-8);assert.ok(r.p<=r.limit && r.b<=r.limit);}
});

test('partnership time survives brief gaps and reversed running order',()=>{
 const c=physicsContext();const r=readJson(c,`(()=>{const p=car('player',0,5000,220),b=car('b',0,5005,220),e=engine([p,b],'pro');
   for(let i=0;i<120;i++)e._chooseAILine(b,.8,1/60);
   p.x=5;for(let i=0;i<60;i++)e._chooseAILine(b,.8,1/60);
   p.x=0;p.z=5010;b.z=5005;b._tactic=null;b.tacticTimer=0;
   let response=null;for(let i=0;i<90;i++){e._chooseAILine(b,.8,1/60);if(b._tactic==='breakaway'){response=(i+1)/60;break;}}
   return {response,time:b._partnerships.get(p).time};})()`);
 assert.ok(r.response>0 && r.response<1.2,JSON.stringify(r));assert.ok(r.time>=3);
});

test('defense selects the earliest closing threat rather than roster order',()=>{
 const c=physicsContext();const r=readJson(c,`(()=>{const p=car('player',-3,4980,223),b=car('b',0,5000,220),fast=car('fast',3,4975,225),e=engine([p,b,fast],'allout');e._chooseAILine(b,.8,1/60);return {tactic:b._tactic,x:b.targetX};})()`);
 assert.equal(r.tactic,'defend');assert.ok(r.x>0);
});

test('group pursuit starts beyond120 and fades without recursive recovery',()=>{
 const c=physicsContext();const r=readJson(c,`(()=>{const p=car('player',4,6000,270),b=car('b',0,5800,200),e=engine([p,b],'allout');e._chooseAILine=()=>{};e._updateAI(.1);const active=b._pursuing; b.z=5900;e._updateAI(.1);const fading=b._pursuing;b.z=5950;e._updateAI(.1);return {active,fading,off:b._pursuing,groups:e._racingGroups().groups.length};})()`);
 assert.equal(r.active,true);assert.equal(r.fading,true);assert.equal(r.off,false);assert.equal(r.groups,1);
});


test('race construction uses the same power bounds regardless of team ownership',()=>{
 const c=physicsContext();const r=readJson(c,`(()=>{const e=engine([],'pro');e.config={playerPower:.75,fieldSize:3,aiEntries:[{power:.99,isTeammate:false},{power:.99,isTeammate:true}]};e._makeCar=(x,z,opts)=>({...opts,x,z});e._buildCars();return e.cars.filter(c=>!c.isPlayer).map(c=>c.power);})()`);
 assert.deepEqual(r,[.99,.99]);
});
