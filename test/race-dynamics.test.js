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

    let careerPower=null,careerProfiles=null,installedParts=0;
    if (${!!options.careerFixture}) {
      newGame('Benchmark','Driver','Car'); game.money=1e9;
      game.currentSeries=${options.seriesId==='premier' ? 2 : options.seriesId==='challenger' ? 1 : 0};
      const cls=['stock','modified','premier'][game.currentSeries];
      game.cars=[makeCar('Benchmark',cls)];game.cars[0].assignedDriverId='player';
      const roster=generateAITeams(game.currentSeries);
      game.season.aiTeams=roster;
      const contenders=typeof championshipContenderIds==='function' ? championshipContenderIds() : new Set();
      careerProfiles=roster.flatMap(t=>t.cars.map(c=>({id:c.id,power:typeof careerRivalPower==='function' ? careerRivalPower(c,contenders.has(c.id)) : clamp(c.power*c.condition/100,.25,.95),isContender:contenders.has(c.id)})));
      careerProfiles.sort((a,b)=>Number(b.isContender)-Number(a.isContender));
      if (${options.careerFixture === 'upgraded'}) {
        game.staff=Array.from({length:3},()=>({typeId:'data_analyst'}));
        for(const u of CAR_CLASSES[cls].upgrades) if(upgradeCar(game.cars[0].id,u.id).ok)installedParts++;
      }
      careerPower=careerRacePower(game.cars[0],game.playerSkill);
    }
    const slots = [];
    const rows = Math.ceil(${fieldSize} / 2);
    for (let row = 0; row < rows; row++) {
      const z = (rows - 1 - row) * R3D.GRID_SPACING;
      slots.push({ x: -3.5, z }, { x: 3.5, z: z - 1.6 });
    }
    slots.length = ${fieldSize};
    const playerIndex = ${options.frontTrain ? (options.teammates ?? 0) : (options.startPosition ?? fieldSize) - 1};
    const player = car('player', slots[playerIndex].x, slots[playerIndex].z);
    const cars = [player, ...slots.filter((_,i)=>i!==playerIndex).map((slot, i) =>
      car('ai-' + i, slot.x, slot.z))];
    if (careerPower !== null) player.power=careerPower;
    if (${!!options.frontTrain}) {
      player.power=${options.playerPower ?? .95};
      cars.slice(1,1+${options.teammates || 0}).forEach(c=>{c.isTeammate=${!options.rivalPartners};c.power=.95;});
    }
    if(careerProfiles){
      const mates=${options.frontTrain ? options.teammates || 0 : 0};
      const opponents=cars.slice(1+mates);
      opponents.forEach((c,i)=>{const profile=careerProfiles[i];c.power=profile.power;c.entrantId=profile.id;c.isContender=profile.isContender;if(profile.isContender)c.raceNerve=1.12;});
      const others=cars.slice(1).map(c=>({c,score:c.power+(Math.random()-.5)*(c.isContender?.10:.24)})).sort((a,b)=>b.score-a.score);
      const otherSlots=slots.filter((_,i)=>i!==playerIndex);
      others.forEach(({c},i)=>{c.x=c.targetX=otherSlots[i].x;c.z=otherSlots[i].z;});
    }
    if (${!!options.openingPace}) cars.forEach(c=>c.speed=65*${options.seriesId==='grassroots' ? .9 : 1});
    const engine = Object.create(Race3DEngine.prototype);
    Object.assign(engine, {
      config:{qualifyAI:${!!options.careerFixture}},cars, player, diff: difficultyById('${difficulty}'),
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
    let dropoutStarted=false, dropoutReleased=null, usefulTowAfterRelease=null;
    let overtakes=0, priorAhead=new Set(cars.filter(c=>c!==player && c.z>player.z));

    for (let frame = 0; frame < 60 * 140 && !engine.done; frame++) {
      if (['ride','push','swap'].includes('${strategy}')) {
        const mate=cars.filter(c=>(c.isTeammate || ${!!options.rivalPartners} || '${strategy}'!=='ride') && c!==player && !c.dnf && !c.finished && c.z>player.z).sort((a,b)=>a.z-b.z)[0];
        const exiting='${strategy}'==='swap' ? frame/60%10>7 : '${strategy}'!=='push' && player.z/R3D.TRACK_LEN>.92;
        const target=mate ? mate.x+(exiting ? (mate.x>3 ? -3.2 : 3.2) : 0) : player.x;
        const err=clamp(target,-9,9)-player.x-player.lv*.22;
        engine.keys.a=err>.3;engine.keys.d=err<-.3;engine.keys.s=false;
      } else raceDriverStep(engine, driver, 1/60, '${strategy}');

      if (${!!options.dropBack}) {
        if(frame/60>=10 && dropoutReleased===null){
          dropoutStarted=true;
          const nearest=cars.filter(c=>c!==player && !c.dnf && !c.finished && c.z>player.z).sort((a,b)=>a.z-b.z)[0];
          if(nearest && nearest.z-player.z>=${options.dropBackGap ?? 600})dropoutReleased=frame/60;
          else engine.keys.s=true;
        }
      }
      engine._update(1 / 60);
      if(dropoutReleased!==null && usefulTowAfterRelease===null && player.towStrength>.15)usefulTowAfterRelease=frame/60-dropoutReleased;
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
          nearestGap: Math.min(...active.filter(c=>c.z>player.z).map(c=>c.z-player.z),Infinity),
          spacing: (()=>{const z=active.map(c=>c.z).sort((a,b)=>a-b);const lo=Math.floor((z.length-1)*.1),hi=Math.ceil((z.length-1)*.9);return (z[hi]-z[lo])/Math.max(1,hi-lo);})(),
          playerLead: (()=>{const rivals=active.filter(c=>c!==player);return rivals.length ? Math.max(0,player.z-Math.max(...rivals.map(c=>c.z))) : 0;})(),
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
    let detachedAt=null;const rejoinTimes=[];
    for(let i=0;i<samples.length;i++){
      if(samples[i].nearestGap>120 && Number.isFinite(samples[i].nearestGap) && detachedAt===null)detachedAt=i;
      if(samples[i].nearestGap<=120 && detachedAt!==null){rejoinTimes.push(i-detachedAt);detachedAt=null;}
    }
    return {
      careerPower,installedParts,contenderFinishes:cars.filter(c=>c.isContender).map(c=>engine.finalOrder().find(r=>r.entrantId===c.entrantId).position),dropoutReleased,usefulTowAfterRelease,
      detachedSeconds:samples.filter(s=>s.nearestGap>120 && Number.isFinite(s.nearestGap)).length,
      unrecovered:detachedAt!==null,rejoinTimes,
      medianNearestGap:median('nearestGap'),centralSpacing:median('spacing'),
      done: engine.done,
      finish: engine.finishOrder.indexOf(player) + 1,
      startPosition,
      overtakes,
      draftingSeconds: samples.filter(s=>s.drafting>0 && s.playerTow>.04).length,
      openingNearby: samples[Math.min(10,samples.length-1)].nearby,
      openingLeaderGap: samples[Math.min(10,samples.length-1)].leaderGap,
      passStarts,
      maxPlayerLead:Math.max(...samples.map(s=>s.playerLead)),
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

if (require.main === module) test('All-Out keeps strong starters connected and contests passive rides across Premier rosters',()=>{
  const reports=[3,17,41].map(seed=>runRearStart(seed,40,'allout','ride',null,{frontTrain:true,teammates:3,careerFixture:'upgraded',seriesId:'premier'}));
  for(const report of reports){
    assert.equal(report.done,true);
    assert.ok(report.openingNearby>=10,'strong starters retain opening traffic');
    assert.ok(report.openingLeaderGap<82,'a strong starter can reach a useful tow');
    assert.ok(report.maxPlayerLead<120,'passive pushing must not create an uncontested escape');
  }
  assert.ok(reports.some(r=>r.finish>1),'passive riding must not win every measured roster');
});

if (require.main === module) test('Pro contests maximum-power teammate trains across actual Premier rosters', () => {
  // One scripted win is not proof of an automatic-win exploit. Preserve that
  // seed, add two independent rosters and assert sustained field pressure.
  const reports=[3,17,41].map(seed=>runRearStart(seed,40,'pro','ride',null,{frontTrain:true,teammates:3,playerPower:.99,careerFixture:'upgraded',seriesId:'premier'}));
  for(const report of reports){
    assert.equal(report.done,true);
    assert.ok(report.medianNearby>=20,'the field must stay close enough to contest the player');
    assert.ok(report.maxPlayerLead<120,'a strong teammate train must not escape to a large uncontested lead');
  }
  assert.ok(reports.some(r=>r.finish>1),'passive rides must not win every measured roster');
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
