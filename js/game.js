// ============================================================
// STOCK CAR EMPIRE - Core Game State & Logic
// ============================================================

// ─── Multi-slot save system ──────────────────────────────────
const NUM_SLOTS   = 5;
const SLOT_PREFIX = 'sce_slot_';
const META_KEY    = 'sce_meta';
let currentSlot   = null;  // which slot is currently loaded

function getSaveMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : Array(NUM_SLOTS).fill(null);
  } catch(e) { return Array(NUM_SLOTS).fill(null); }
}

function saveToSlot(slot) {
  if (slot === null || slot === undefined) slot = 0;
  currentSlot = slot;
  try {
    localStorage.setItem(SLOT_PREFIX + slot, JSON.stringify(game));
    const meta = getSaveMeta();
    meta[slot] = {
      teamName: game.teamName,
      series: SERIES[game.currentSeries]?.name || 'N/A',
      year: game.season.year,
      wins: [...game.cars,...(game.retiredCars||[])].reduce((s, c) => s + (c.wins || 0), 0),
      savedAt: Date.now(),
    };
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    return true;
  } catch(e) { console.warn('Save failed:', e); return false; }
}

function loadFromSlot(slot) {
  const previousGame=game,previousSlot=currentSlot;
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + slot);
    if (!raw) return false;
    const loaded = JSON.parse(raw);
    if (!loaded || !loaded.teamName || !loaded.cars || !loaded.season) return false;
    // Careers always combine driving and team ownership. Retire legacy role
    // fields without resetting the player's assets or championship progress.
    for (const key of ['driverMode', 'hiredTeamId', 'hiredSalary', 'premierChoicePending']) {
      delete loaded[key];
    }
    const availableCars = loaded.cars.filter(c => !(loaded.hiredDrivers || []).some(h => h.carId === c.id));
    if (!availableCars.some(c => c.assignedDriverId === 'player') && availableCars.length) {
      availableCars[0].assignedDriverId = 'player';
    }
    // Expand older Premier careers without replacing existing entrants or points.
    if (loaded.currentSeries === 2) {
      const teams = loaded.season.aiTeams;
      let count = teams.reduce((n, t) => n + t.cars.length, 0);
      const names = new Set(teams.flatMap(t => t.cars.map(c => c.driverName)));
      const nums = new Set([1, ...teams.flatMap(t => t.cars.map(c => c.number)), ...loaded.cars.map(c => c.number)]);
      for (const team of count < SERIES[2].fieldSize - 1 ? generateAITeams(2) : []) {
        if (count >= SERIES[2].fieldSize - 1) break;
        team.cars = team.cars.slice(0, SERIES[2].fieldSize - 1 - count);
        for (const car of team.cars) {
          car.driverName = AI_DRIVER_NAMES.find(n => !names.has(n)) || car.driverName;
          names.add(car.driverName);
          car.number = Array.from({length: 98}, (_, i) => i + 2).find(n => !nums.has(n));
          nums.add(car.number);
          loaded.season.standings.push({id: car.id, teamId: team.id, name: `${team.name} (${car.driverName})`, isPlayer: false, points: 0, wins: 0, top5: 0, top10: 0, races: 0});
        }
        count += team.cars.length;
        teams.push(team);
      }
    }
    game = loaded;
    normalizeVehicleState();
    const rivals=game.season.aiTeams.flatMap(t=>t.cars);
    if(!rivals.some(c=>c.driverName==='Joshua Enright')){const c=[...rivals].sort((a,b)=>b.power-a.power)[0];if(c){c.driverName='Joshua Enright';c.power=Math.max(c.power,[.94,.97,.99][game.currentSeries]);const standing=game.season.standings.find(e=>e.id===c.id),team=game.season.aiTeams.find(t=>t.id===c.teamId);if(standing)standing.name=`${team?.name||'Rival'} (Joshua Enright)`;}}
    normalizeSupportStaff();
    retireExhaustedCars();
    currentSlot = slot;
    if(migrateSponsorship()) {
      const originalMeta=localStorage.getItem(META_KEY);
      if(!saveToSlot(slot)){try{localStorage.setItem(SLOT_PREFIX+slot,raw);if(originalMeta!==null)localStorage.setItem(META_KEY,originalMeta);else localStorage.removeItem(META_KEY);}catch(_){}game=previousGame;currentSlot=previousSlot;return false;}
    }
    return true;
  } catch(e) { game=previousGame;currentSlot=previousSlot;console.warn('Load failed:', e); return false; }
}

function deleteSlot(slot) {
  localStorage.removeItem(SLOT_PREFIX + slot);
  const meta = getSaveMeta();
  meta[slot] = null;
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

let game = null;   // The live game state object

// ─── Helpers ────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmt$( n ) {
  return '$' + Math.round(n).toLocaleString();
}

// ─── Car factory ────────────────────────────────────────────
function makeCar(name, classId, overrideStats, opts = {}) {
  const cls = CAR_CLASSES[classId];
  const base = { ...cls.baseStats };
  const stats = { ...base, ...(overrideStats || {}) };
  return {
    id: uid(),
    name,
    classId,
    color:       opts.color  || '#e8001d',
    number:      opts.number !== undefined ? opts.number : 1,
    speed:       stats.speed,
    handling:    stats.handling,
    reliability: stats.reliability,
    condition:   100,       // 0–100; degrades with racing
    lifetimeHealth: 100,
    appliedUpgrades: [],    // upgrade ids applied
    assignedDriverId: null, // null = unassigned; 'player' = player's seat
    wins: 0,
    races: 0,
    totalPoints: 0,
  };
}

function normalizeVehicleState() {
  game.raceRules={crashes:game.raceRules?.crashes!==false,damage:game.raceRules?.damage!==false};
  game.retiredCars=Array.isArray(game.retiredCars)?game.retiredCars:[];
  game.cars.forEach(c=>{c.lifetimeHealth=Number.isFinite(c.lifetimeHealth)?clamp(c.lifetimeHealth,0,100):100;});
}

function retireExhaustedCars() {
  if(!raceFeatureRules(game.difficulty,game.raceRules).damage) return [];
  normalizeVehicleState();
  const retired=game.cars.filter(c=>c.lifetimeHealth<=0);
  for(const car of retired) {
    const hire=(game.hiredDrivers||[]).find(h=>h.carId===car.id);
    game.retiredCars.push({...JSON.parse(JSON.stringify(car)),lastDriver:car.assignedDriverId==='player'?game.driverName:HIREABLE_DRIVERS.find(d=>d.id===hire?.driverId)?.name || 'Unassigned',retiredYear:game.season.year,retiredRace:game.season.raceIndex+1});
    (game.hiredDrivers||[]).filter(h=>h.carId===car.id).forEach(h=>h.carId=null);
  }
  game.cars=game.cars.filter(c=>c.lifetimeHealth>0);
  if(retired.length) game.pendingRetirementNotice=retired.map(c=>c.name).join(', ');
  return retired;
}

function setCarColor(carId, color) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return;
  car.color = color;
  saveGame();
}

function setCarNumber(carId, num) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return { ok: false, msg: 'Car not found.' };
  const n = parseInt(num, 10);
  if (isNaN(n) || n < 1 || n > 99) return { ok: false, msg: 'Pick a number from 1 to 99.' };
  if (game.cars.some(c => c.id !== carId && (c.number || 1) === n)) {
    return { ok: false, msg: `#${n} is already on another of your cars.` };
  }
  car.number = n;
  saveGame();
  return { ok: true, number: n };
}

// ─── AI Team factory ────────────────────────────────────────
// Derived from the season's fixed equipment ratings, not current points/form.
// Stable IDs keep the same three rivals across races and save/load; no migration.
function championshipContenderIds() {
  const rivals = (game?.season?.aiTeams || []).flatMap(t => t.cars)
    .filter(c => c.id && Number.isFinite(c.power));
  rivals.sort((a,b) => b.power-a.power || (a.number || 999)-(b.number || 999) || String(a.id).localeCompare(String(b.id)));
  return new Set(rivals.slice(0,3).map(c => c.id));
}

function rivalPreparationCondition(condition, contender = false) {
  return clamp(Math.max(condition,contender ? 96 : 90),0,100);
}

function careerRivalPower(car, contender = false) {
  // Rival teams service their cars between events. Apply the same preparation
  // on entry so older midseason saves with exhausted rivals recover immediately.
  const contenderFloor = [.92,.95,.99][game?.currentSeries ?? 0] ?? .92;
  const power = contender ? Math.max(car.power+.035,contenderFloor) : car.power;
  return clamp(power * rivalPreparationCondition(car.condition,contender) / 100, .25, contender ? .99 : .95);
}

function makeAITeam(template, seriesLevel) {
  // Scale AI power to series level
  const powerBase = template.basePower + seriesLevel * 0.15;
  const power = clamp(powerBase + rand(-0.08, 0.08), 0.3, 0.98);

  // Each AI team has 1–2 cars
  const numCars = seriesLevel >= 1 ? randInt(1, 2) : 1;
  const cars = [];
  for (let i = 0; i < numCars; i++) {
    cars.push({
      id: uid(),
      teamId: null, // filled after team created
      driverName: pick(AI_DRIVER_NAMES),
      power,        // composite 0–1 score used in simulation
      condition: 100,
      number: 0,    // assigned by generateAITeams
      color: template.color,
    });
  }

  const team = {
    id: uid(),
    name: template.name,
    color: template.color,
    aggression: template.aggression,
    cars,
    points: 0,
    wins: 0,
    top5: 0,
    top10: 0,
    racesRun: 0,
  };
  team.cars.forEach(c => (c.teamId = team.id));
  return team;
}

// ─── Generate season calendar ───────────────────────────────
function generateCalendar(seriesLevel) {
  const series = SERIES[seriesLevel];
  const eligibleTracks = TRACKS.filter(t => t.series.includes(seriesLevel));
  const calendar = [];
  const used = new Set();

  // Always start with a short track or intermediate in entry series
  const shuffled = [...eligibleTracks].sort(() => Math.random() - 0.5);

  for (let i = 0; i < series.racesPerSeason; i++) {
    const track = shuffled[i % shuffled.length];
    calendar.push({
      raceNum: i + 1,
      trackId: track.id,
      trackName: track.name,
      trackType: track.type,
      status: 'upcoming',  // upcoming | completed | skipped
      playerResult: null,
      playerPoints: 0,
      earnings: 0,
    });
  }
  return calendar;
}

// ─── Generate AI teams for a season ─────────────────────────
function generateAITeams(seriesLevel) {
  const series = SERIES[seriesLevel];
  const targetCars = Math.max(0, series.fieldSize - 1); // one field slot belongs to the player

  // Shuffle templates, give varying power
  const templates = [...AI_TEAM_TEMPLATES].sort(() => Math.random() - 0.5);
  const teams = [];
  let carCount = 0;

  for (const tmpl of templates) {
    if (carCount >= targetCars) break;
    const team = makeAITeam(tmpl, seriesLevel);
    // Higher series can generate two-car teams. Trim only the final team so
    // the championship roster is exactly the advertised field size rather
    // than relying on a temporary, differently named race-day backmarker.
    const remaining = targetCars - carCount;
    if (team.cars.length > remaining) team.cars = team.cars.slice(0, remaining);
    team.cars.forEach(c => { c.teamId = team.id; });
    teams.push(team);
    carCount += team.cars.length;
  }

  // Assign unique car numbers (2–99; 1 is reserved for player)
  const usedNums = new Set([1]);
  // ...and unique driver names, so no two entries share a name in the standings
  const usedNames = new Set();
  const freeNames = [...AI_DRIVER_NAMES].sort(() => Math.random() - 0.5);

  for (const team of teams) {
    for (const car of team.cars) {
      let n;
      do { n = randInt(2, 99); } while (usedNums.has(n));
      usedNums.add(n);
      car.number = n;

      if (!car.driverName || usedNames.has(car.driverName)) {
        const next = freeNames.find(nm => !usedNames.has(nm));
        car.driverName = next || `${pick(AI_DRIVER_NAMES).split(' ')[1]} ${usedNames.size}`;
      }
      usedNames.add(car.driverName);
    }
  }

  const strongest=teams.flatMap(t=>t.cars).sort((a,b)=>b.power-a.power)[0];
  if(strongest){for(const c of teams.flatMap(t=>t.cars))if(c.driverName==='Joshua Enright')c.driverName=AI_DRIVER_NAMES.find(n=>!teams.some(t=>t.cars.some(c=>c.driverName===n)))||c.driverName;strongest.driverName='Joshua Enright';strongest.power=Math.max(strongest.power,[.94,.97,.99][seriesLevel]);}
  return teams;
}

// ─── New Game ────────────────────────────────────────────────
function newGame(teamName, driverName, firstCarName) {
  const firstCar = makeCar(firstCarName, 'stock', null, { color: '#e8001d', number: 1 });
  firstCar.assignedDriverId = 'player'; // player drives this car

  game = {
    version: '1.1',
    teamName,
    driverName: driverName || teamName,
    money: 50000,
    playerSkill: 60,     // 0–100, improves slowly
    reputation: 50,      // 0–100; affected by race behavior
    currentSeries: 0,

    cars: [firstCar],
    retiredCars: [],
    raceRules: {crashes:true,damage:true},
    hiredDrivers: [],    // { driverId, carId }
    staff: [],           // { staffType, name, weeklyCost }
    loans: [],           // bank loans currently outstanding
    difficulty: DEFAULT_DIFFICULTY,
    winsByDifficulty: {},

    season: {
      year: 1,
      raceIndex: 0,          // which race in calendar we're on
      calendar: generateCalendar(0),
      aiTeams: generateAITeams(0),
      standings: [],         // computed after races
    },

    history: [],             // { year, series, finalPos, wins }
    notifications: [],
    achievements: [],
    tutorial: { status: 'offered' }, // per-career onboarding; older saves have no tutorial field
  };

  game.sponsorship = freshSponsorship();
  // Init standings with player
  rebuildStandings();
  saveGame();
  return game;
}

// ─── Load / Save (slot wrappers) ─────────────────────────────
// Auto-save (called after most game actions). Only writes once the player has
// actually chosen a slot - otherwise a brand-new career would silently
// overwrite whatever save already lives in slot 0.
function saveGame() {
  if (currentSlot === null || currentSlot === undefined) return false;
  saveToSlot(currentSlot);
  return true;
}

function loadGame() {
  return false; // No auto-load; use loadFromSlot() explicitly
}

function deleteSave() {
  if (currentSlot !== null) deleteSlot(currentSlot);
  game = null;
}

// ─── Standings ───────────────────────────────────────────────
function rebuildStandings() {
  // Collect all entities (player + AI teams)
  const entries = [];

  // Player entry
  entries.push({
    id: 'player',
    name: game.teamName,
    isPlayer: true,
    points: 0,
    wins: 0,
    top5: 0,
    top10: 0,
    races: 0,
  });

  // Your other cars run by hired drivers - they score their own championship
  // points, so they need their own standings entry.
  (game.cars || []).forEach(car => {
    const hire = (game.hiredDrivers || []).find(h => h.carId === car.id);
    if (!hire) return;
    const drv = HIREABLE_DRIVERS.find(d => d.id === hire.driverId);
    entries.push({
      id: car.id,
      name: `${game.teamName} (${drv ? drv.name : 'Driver'})`,
      isPlayer: false,
      isTeamCar: true,
      points: 0, wins: 0, top5: 0, top10: 0, races: 0,
    });
  });

  // AI entries
  game.season.aiTeams.forEach(team => {
    // One standing entry per car
    team.cars.forEach(car => {
      entries.push({
        id: car.id,
        teamId: team.id,
        name: `${team.name} (${car.driverName})`,
        isPlayer: false,
        points: 0,
        wins: 0,
        top5: 0,
        top10: 0,
        races: 0,
      });
    });
  });

  game.season.standings = entries;
}

function getStandings() {
  return [...game.season.standings].sort((a, b) => b.points - a.points);
}

function getPlayerStandingPos() {
  const sorted = getStandings();
  return sorted.findIndex(e => e.id === 'player') + 1;
}

// ─── Apply race results to standings ─────────────────────────
function applyRaceResults(results) {
  const series = SERIES[game.currentSeries];
  results.forEach(r => {
    const pos = r.position;
    const pts = series.points[pos - 1] || 0;

    let entry = game.season.standings.find(e => e.id === r.entrantId);
    // A car hired a driver mid-season - give it a standings entry on the fly
    // so its results are never silently dropped.
    if (!entry && r.carId && game.cars.some(c => c.id === r.carId)) {
      entry = {
        id: r.entrantId,
        name: `${game.teamName} (${HIREABLE_DRIVERS.find(d => d.id === hireForCar(r.carId)?.driverId)?.name || String(r.displayName || 'Driver').split(' / ').pop()})`,
        isPlayer: false, isTeamCar: true,
        points: 0, wins: 0, top5: 0, top10: 0, races: 0,
      };
      game.season.standings.push(entry);
    }
    if (!entry) return;
    entry.points += pts;
    entry.races += 1;
    if (pos === 1) entry.wins += 1;
    if (pos <= 5) entry.top5 += 1;
    if (pos <= 10) entry.top10 += 1;
  });
}

// ─── Post-race: update player & cars ─────────────────────────
function postRaceUpdate(playerResult, earnings, allResults) {
  if(playerResult._sponsorEvent && game.sponsorship.processed.includes(playerResult._sponsorEvent))return;
  playerResult._sponsorEvent=game.season.year+':'+game.season.raceIndex;
  // Older saves have no reliable difficulty history. Track only newly
  // completed player wins, per career; teammate wins do not count here.
  if (playerResult.position === 1 && !playerResult.dnf) {
    const difficulty = game.difficulty || DEFAULT_DIFFICULTY;
    game.winsByDifficulty ||= {};
    game.winsByDifficulty[difficulty] = (game.winsByDifficulty[difficulty] || 0) + 1;
  }
  // Money
  game.money += earnings;

  // Skill improvement (small gain based on finish position)
  const series = SERIES[game.currentSeries];
  const field  = series.fieldSize;
  const pos    = playerResult.position;
  const relPerf = 1 - (pos - 1) / field;  // 1.0 = win, 0 = last
  game.playerSkill = clamp(game.playerSkill + relPerf * 0.4 + 0.1, 0, 98);

  // Reputation: improves with good finishes, degrades slightly on bad ones
  // Winning is a big deal - it moves reputation far more than anything else.
  // Gains taper as reputation climbs so it still takes a career to reach Legend.
  if (!game.reputation) game.reputation = 50;
  const headroom = (100 - game.reputation) / 100;   // 1.0 unknown → 0.0 maxed
  let repDelta;
  if      (pos === 1)  repDelta =  6 + 14 * headroom;   // +20 early, +6 at the top
  else if (pos <= 3)   repDelta =  2 +  6 * headroom;
  else if (pos <= 5)   repDelta =  1 +  3 * headroom;
  else if (pos <= 10)  repDelta =  0.5 + 1 * headroom;
  else if (pos <= 20)  repDelta = -0.5;
  else                 repDelta = -1.5;
  game.reputation = clamp(Math.round((game.reputation + repDelta) * 10) / 10, 0, 100);

  // Car condition degrades. Cars run by hired drivers race too, so they take
  // real race wear and bank their own stats.
  const byCar = new Map((allResults || []).filter(r => r.carId).map(r => [r.carId, r]));
  game.cars.forEach(car => {
    const res = car.id === playerResult.carId ? playerResult : byCar.get(car.id);
    if (res) {
      const rules=raceFeatureRules(game.difficulty,game.raceRules);
      const damageLoss=rules.damage && Number.isFinite(res.raceHealth) ? Math.max(0,car.condition-res.raceHealth) : 0;
      car.condition = clamp(car.condition - randInt(8, 18) - damageLoss, 0, 100);
      if(rules.damage) car.lifetimeHealth=clamp((car.lifetimeHealth ?? 100)-2.5*(.9+damageLoss/100+Math.min(res.crashes||0,3)*.15),0,100);
      car.races += 1;
      if (res.position === 1) car.wins += 1;
      car.totalPoints += series.points[res.position - 1] || 0;
    } else {
      // Cars not in this race lose a little condition anyway (idle wear)
      car.condition = clamp(car.condition - randInt(0, 3), 0, 100);
    }
  });

  // Rival teams also perform routine garage work between events. Without it,
  // every rival reached zero condition partway through a long season.
  const contenders = championshipContenderIds();
  game.season.aiTeams.forEach(team => {
    team.cars.forEach(c => {
      c.condition = rivalPreparationCondition(c.condition-randInt(5,15),contenders.has(c.id));
    });
  });

  // Charge the same staff and hired-driver payroll shown in the budget.
  game.money -= weeklyExpenses();

  processSponsorWeekend(pos);

  // Your hired drivers gain experience from the race they just ran
  game.lastDriverNotes = developHiredDrivers(allResults, field);

  // Bank: count down loan terms, charge interest on anything overdue
  game.lastLoanNotes = tickLoans();

  // Advance race index
  retireExhaustedCars();
  game.season.raceIndex += 1;
}

// ─── Skip a race ─────────────────────────────────────────────
function skipRace() {
  const race = currentRace();
  if (!race) return;
  processSponsorWeekend(null,true);
  race.status = 'skipped';
  game.lastLoanNotes = tickLoans();
  game.season.raceIndex += 1;
  // Weekly costs still apply
  game.money -= weeklyExpenses();
  saveGame();
}

// ─── End of season ───────────────────────────────────────────
// End-of-season prize money. Every driver who ran the season is paid on final
// championship position, and the champion takes a purse far bigger than
// anyone else's - winning the title should be the payday of the year.
function seasonPayout(seriesLevel, pos, total) {
  const series = SERIES[seriesLevel];
  // The purse grows sharply with the series - a Premier Cup Series title is a
  // life-changing payday, a Grassroots title is a good year.
  const PURSE_MULT = [8, 14, 22];
  const purse = series.prize[0] * (PURSE_MULT[seriesLevel] || 8);
  let f;
  if      (pos === 1) f = 1.00;
  else if (pos === 2) f = 0.55;
  else if (pos === 3) f = 0.40;
  else {
    const span = Math.max(1, total - 3);
    const t = clamp((pos - 3) / span, 0, 1);
    f = 0.30 * Math.pow(1 - t, 1.6) + 0.03;    // everyone still collects something
  }
  return Math.round(purse * f / 100) * 100;
}

function endSeason() {
  const series = SERIES[game.currentSeries];
  const sorted = getStandings();
  const playerPos = sorted.findIndex(e => e.id === 'player') + 1;
  const totalEntrants = sorted.length;
  const isChampion = playerPos === 1;

  // ── Season purse ────────────────────────────────────────
  const payouts = sorted.map((e, i) => ({
    pos:      i + 1,
    name:     e.name,
    isPlayer: !!e.isPlayer,
    isTeamCar:!!e.isTeamCar,
    amount:   seasonPayout(game.currentSeries, i + 1, totalEntrants),
  }));
  // You collect for your own entry and for every car your drivers ran
  const playerPayout = payouts.find(p => p.isPlayer)?.amount || 0;
  const teamPayout   = payouts.filter(p => p.isTeamCar).reduce((s, p) => s + p.amount, 0);
  game.money += playerPayout + teamPayout;

  const playerEntry = sorted.find(e => e.id === 'player');

  // Record history
  game.history.push({
    year: game.season.year,
    series: series.name,
    finalPos: playerPos,
    wins: playerEntry?.wins || 0,
    champion: isChampion,
    payout: playerPayout + teamPayout,
  });
  if (isChampion) game.titles = (game.titles || 0) + 1;

  // Promotion / relegation
  let promoted = false;
  let relegated = false;
  let message = '';

  if (game.currentSeries < 2 && playerPos <= series.promotionSpots) {
    game.currentSeries += 1;
    promoted = true;
    const newSeries = SERIES[game.currentSeries];
    message = isChampion
      ? `You are the ${series.name} champion, and you move up to the ${newSeries.name}.`
      : `You finished ${playerPos}${ordinal(playerPos)} and earned promotion to the ${newSeries.name}!`;

    // You reach the Premier Cup Series as what you have always been: the
    // driver who owns the team. No career-path choice is offered.

    // Upgrade cars to new class on promotion
    promoteCarClass();

  } else if (game.currentSeries > 0 && series.relegationSpots > 0 &&
             playerPos > totalEntrants - series.relegationSpots) {
    game.currentSeries -= 1;
    relegated = true;
    const newSeries = SERIES[game.currentSeries];
    message = `You finished ${playerPos}${ordinal(playerPos)} and were relegated to the ${newSeries.name}.`;
    relegateCarClass();
  } else if (isChampion) {
    message = `You are the ${series.name} champion. There is nowhere higher to go - now defend it.`;
  } else {
    message = `You finished ${playerPos}${ordinal(playerPos)} in the ${series.name}. Gearing up for another season!`;
  }

  // Start new season
  const newYear = game.season.year + 1;
  game.season = {
    year: newYear,
    raceIndex: 0,
    calendar: generateCalendar(game.currentSeries),
    aiTeams: generateAITeams(game.currentSeries),
    standings: [],
  };
  rebuildStandings();
  rolloverSponsorship(series.level);

  // Reset car conditions (off-season maintenance)
  game.cars.forEach(c => {
    c.condition = clamp(c.condition + 30, 0, 100);
  });

  saveGame();
  return {
    promoted, relegated, playerPos, message,
    champion:   isChampion,
    titles:     game.titles || 0,
    seriesName: series.name,
    year:       game.season.year - 1,
    driver:     game.driverName || game.teamName,
    wins:       playerEntry?.wins || 0,
    top5:       playerEntry?.top5 || 0,
    points:     playerEntry?.points || 0,
    races:      playerEntry?.races || 0,
    playerPayout, teamPayout,
    totalEntrants,
    payouts:    payouts.slice(0, 10),
  };
}

// ─── Promote cars to new class ───────────────────────────────
function promoteCarClass() {
  const newClass = SERIES[game.currentSeries].carClass;
  game.cars.forEach(car => {
    if (car.classId !== newClass) {
      const cls = CAR_CLASSES[newClass];
      car.classId = newClass;
      // Boost stats to new class base (keep any relative advantage)
      const base = cls.baseStats;
      car.speed       = Math.max(base.speed,       car.speed + 15);
      car.handling    = Math.max(base.handling,    car.handling + 15);
      car.reliability = Math.max(base.reliability, car.reliability);
      car.appliedUpgrades = [];
      car.condition = 85;
    }
  });
}

function relegateCarClass() {
  // Cars stay as they are; no need to downgrade
}

// ─── Car management ──────────────────────────────────────────
function buyCar(name) {
  const classId = SERIES[game.currentSeries].carClass;
  const cls = CAR_CLASSES[classId];
  if (game.cars.length >= MAX_TEAM_CARS) {
    return { ok: false, msg: `${MAX_TEAM_CARS} cars is the most any team runs.` };
  }
  if (game.money < cls.buyCost) return { ok: false, msg: 'Not enough money. Take out a loan in Market > Loans and Financing.' };
  game.money -= cls.buyCost;
  const carName = (name && String(name).trim()) || `Car ${game.cars.length + 1}`;
  // Give it the lowest free number so a new car never collides with an
  // existing one (they are painted on the cars and shown in the standings).
  const taken = new Set(game.cars.map(c => c.number || 1));
  let num = 1;
  while (taken.has(num) && num < 99) num++;
  const car = makeCar(carName, classId, null, { number: num });
  if(!game.cars.some(c=>c.assignedDriverId==='player')) car.assignedDriverId='player';
  game.cars.push(car);
  saveGame();
  return { ok: true, car };
}

function sellCar(carId) {
  const idx = game.cars.findIndex(c => c.id === carId);
  if (idx === -1) return { ok: false, msg: 'Car not found.' };
  if (game.cars.length === 1) return { ok: false, msg: 'You must keep at least one car.' };
  const car = game.cars[idx];
  const cls = CAR_CLASSES[car.classId];
  const value = Math.round(cls.sellValue * (car.condition / 100));
  game.money += value;
  game.cars.splice(idx, 1);
  saveGame();
  return { ok: true, value };
}

function repairCar(carId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return { ok: false, msg: 'Car not found.' };
  if (car.condition >= 100) return { ok: false, msg: 'Car is already in perfect condition.' };

  const cls = CAR_CLASSES[car.classId];
  const discount = 1 - staffRepairDiscount();
  const damage = 100 - car.condition;
  const cost = Math.round(damage * cls.repairCostPerPoint * discount);

  if (game.money < cost) return { ok: false, msg: `Need ${fmt$(cost)} to fully repair.` };
  game.money -= cost;
  car.condition = 100;
  saveGame();
  return { ok: true, cost };
}

// ═══════════════════════════════════════════════════════════
//  CHARITY - give back for goodwill
// ═══════════════════════════════════════════════════════════
// One donation per race weekend, so reputation still has to be earned on
// track - money alone can only ever top it up.
function donationRaceKey() {
  return `${game.season.year}:${game.season.raceIndex}`;
}

function canDonate() {
  return game.lastDonationKey !== donationRaceKey();
}

function donateToCharity(causeId) {
  const cause = CHARITY_CAUSES.find(c => c.id === causeId);
  if (!cause) return { ok: false, msg: 'Unknown cause.' };
  if (!canDonate()) {
    return { ok: false, msg: 'You have already given this race weekend. Come back after the next race.' };
  }
  const cost = charityCost(cause, game.currentSeries);
  if (game.money < cost) return { ok: false, msg: `That pledge is ${fmt$(cost)}.` };

  if (game.reputation == null) game.reputation = 50;
  const gain = charityRepGain(cause, game.reputation);

  game.money -= cost;
  game.reputation = clamp(Math.round((game.reputation + gain) * 10) / 10, 0, 100);
  game.lastDonationKey = donationRaceKey();
  game.charityGiven = (game.charityGiven || 0) + cost;
  saveGame();
  return { ok: true, cost, gain, name: cause.name, reputation: game.reputation };
}

// ═══════════════════════════════════════════════════════════
//  BANK - loans
// ═══════════════════════════════════════════════════════════
function getLoans() {
  if (!game.loans) game.loans = [];
  return game.loans;
}

function totalDebt() {
  return getLoans().reduce((s, l) => s + l.balance, 0);
}

// Reputation buys you credit; existing debt eats into it.
function creditLimit() {
  const base = LOAN_BASE[game.currentSeries] || LOAN_BASE[0];
  const rep  = (game.reputation != null ? game.reputation : 50) / 100;
  return Math.round(base * (0.5 + rep));
}

function creditAvailable() {
  return Math.max(0, creditLimit() - totalDebt());
}

// Principal an offer would advance right now
function loanPrincipal(offer) {
  const raw = Math.round(creditLimit() * offer.mult * 0.5 / 500) * 500;
  return Math.min(raw, creditAvailable());
}

function takeLoan(offerId) {
  const offer = LOAN_OFFERS.find(o => o.id === offerId);
  if (!offer) return { ok: false, msg: 'Unknown loan.' };
  if (getLoans().length >= 3) return { ok: false, msg: 'You already carry three loans.' };

  const principal = loanPrincipal(offer);
  if (principal < 500) {
    return { ok: false, msg: 'No credit available - repay existing debt first.' };
  }

  const loan = {
    id: uid(),
    name: offer.name,
    principal,
    balance: Math.round(principal * (1 + offer.rate)),
    term: offer.term,
    racesLeft: offer.term,
    rate: offer.rate,
    overdue: false,
  };
  getLoans().push(loan);
  game.money += principal;
  saveGame();
  return { ok: true, loan };
}

function repayLoan(loanId, amount) {
  const loan = getLoans().find(l => l.id === loanId);
  if (!loan) return { ok: false, msg: 'Loan not found.' };
  const pay = Math.min(Math.round(amount || loan.balance), loan.balance, game.money);
  if (pay <= 0) return { ok: false, msg: 'Not enough cash to make a payment.' };

  game.money   -= pay;
  loan.balance -= pay;
  let cleared = false;
  if (loan.balance <= 0) {
    game.loans = getLoans().filter(l => l.id !== loan.id);
    cleared = true;
  }
  saveGame();
  return { ok: true, paid: pay, cleared };
}

// Called once per race weekend. Counts down terms and compounds overdue debt.
function tickLoans() {
  const notes = [];
  getLoans().forEach(loan => {
    if (loan.racesLeft > 0) {
      loan.racesLeft -= 1;
      if (loan.racesLeft === 1) notes.push(`${loan.name}: 1 race left to repay ${fmt$(loan.balance)}.`);
    }
    if (loan.racesLeft <= 0) {
      // Term is up - try to settle automatically, then charge interest on the rest
      if (game.money >= loan.balance) {
        game.money  -= loan.balance;
        loan.balance = 0;
        notes.push(`${loan.name} settled in full.`);
      } else {
        if (game.money > 0) { loan.balance -= game.money; game.money = 0; }
        const interest = Math.round(loan.balance * LOAN_LATE_RATE);
        loan.balance += interest;
        loan.overdue  = true;
        notes.push(`${loan.name} is overdue - ${fmt$(interest)} interest added.`);
      }
    }
  });
  game.loans = getLoans().filter(l => l.balance > 0);
  return notes;
}

function upgradeCar(carId, upgradeId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return { ok: false, msg: 'Car not found.' };

  const cls = CAR_CLASSES[car.classId];
  const upgrade = cls.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return { ok: false, msg: 'Upgrade not found.' };
  if (car.appliedUpgrades.includes(upgradeId)) return { ok: false, msg: 'Already installed.' };
  if (!tierUnlocked(car, upgrade.tier, cls)) {
    return { ok: false, msg: `Fit ${MAX_PER_TIER} Tier ${upgrade.tier - 1} parts before Tier ${upgrade.tier} opens.` };
  }
  const cap = tierCapacity();   // 3, plus one per Data Analyst on staff
  if (tierInstalled(car, upgrade.tier, cls) >= cap) {
    const extra = cap > MAX_PER_TIER ? '' : ' Hire a Data Analyst to open another slot.';
    return { ok: false, msg: `Tier ${upgrade.tier} is full - ${cap} parts is the limit.${extra}` };
  }
  if (game.money < upgrade.cost) return { ok: false, msg: 'Not enough money. Take out a loan in Market > Loans and Financing.' };

  game.money -= upgrade.cost;
  car.appliedUpgrades.push(upgradeId);
  if (upgrade.effect.speed)       car.speed       = clamp(car.speed       + upgrade.effect.speed, 0, 99);
  if (upgrade.effect.handling)    car.handling    = clamp(car.handling    + upgrade.effect.handling, 0, 99);
  if (upgrade.effect.reliability) car.reliability = clamp(car.reliability + upgrade.effect.reliability, 0, 99);
  saveGame();
  return { ok: true };
}

function renameCar(carId, newName) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return;
  car.name = newName.trim() || car.name;
  saveGame();
}

// ─── Staff management ────────────────────────────────────────
// Older generic hires retain contracts and effects; give them named identities once.
function normalizeSupportStaff() {
  game.staff = game.staff || [];
  for (const member of game.staff) {
    if (member.candidateId === 'analyst05') member.name = 'Grayson Fortenberry';
    if (member.candidateId === 'mechanic03') member.overall = 99;
    if (member.candidateId || member.overall) continue;
    const candidates = STAFF_CANDIDATES.filter(c=>c.typeId===member.typeId);
    const candidate = candidates.find(c=>c.overall===79 && !game.staff.some(s=>s.candidateId===c.id))
      || candidates.find(c=>!game.staff.some(s=>s.candidateId===c.id));
    if (!candidate) continue;
    Object.assign(member,{candidateId:candidate.id,name:candidate.name,overall:candidate.overall,
      effects:{...LEGACY_STAFF_EFFECTS[member.typeId]}});
  }
}
function hireStaff(candidateId) {
  // Keep role-ID calls working for older integrations; choose the standard specialist.
  const candidate = STAFF_CANDIDATES.find(c=>c.id===candidateId)
    || STAFF_CANDIDATES.find(c=>c.typeId===candidateId && c.overall===79);
  if (!candidate) return {ok:false,msg:'Unknown staff member.'};
  const type = STAFF_TYPES.find(t=>t.id===candidate.typeId);
  if (game.staff.some(s=>s.candidateId===candidate.id)) return {ok:false,msg:'Already hired.'};
  if (game.staff.filter(s=>s.typeId===type.id).length >= type.max)
    return {ok:false,msg:`You can only hire ${type.max} ${type.name}(s).`};
  const weeklyCost = staffSalary(candidate);
  const signingFee = weeklyCost * 4;
  if (game.money < signingFee) return {ok:false,msg:`Signing fee is ${fmt$(signingFee)}.`};
  game.money -= signingFee;
  game.staff.push({id:uid(),candidateId:candidate.id,typeId:type.id,name:candidate.name,
    overall:candidate.overall,weeklyCost,effects:{...candidate.effects}});
  saveGame();
  return {ok:true,name:candidate.name};
}

function fireStaff(staffId) {
  const idx = game.staff.findIndex(s => s.id === staffId);
  if (idx === -1) return;
  game.staff.splice(idx, 1);
  saveGame();
}

// ─── Driver management ───────────────────────────────────────
function hireDriver(driverId, carId) {
  if (game.hiredDrivers.length >= MAX_HIRED_DRIVERS)
    return { ok: false, msg: `${MAX_HIRED_DRIVERS} drivers is the most you can carry.` };
  if (game.hiredDrivers.find(h => h.driverId === driverId))
    return { ok: false, msg: 'Already hired.' };
  if (game.hiredDrivers.find(h => h.carId === carId))
    return { ok: false, msg: 'That car already has a driver.' };

  const driver = HIREABLE_DRIVERS.find(d => d.id === driverId);
  if (!driver) return { ok: false, msg: 'Driver not found.' };

  if ((game.reputation || 0) < (driver.minReputation || 0)) return { ok: false, msg: `Requires ${driver.minReputation} reputation.` };
  const signingFee = driver.weeklyCost * 4;
  if (game.money < signingFee) return { ok: false, msg: `Signing fee is ${fmt$(signingFee)}.` };

  game.money -= signingFee;

  const car = game.cars.find(c => c.id === carId);
  if (car) car.assignedDriverId = driverId;

  // Skill lives on the hire record, not on HIREABLE_DRIVERS - that list is a
  // shared constant, so mutating it would leak between save slots.
  // Each driver has a ceiling, so a cheap rookie can develop but a journeyman
  // will not turn into a superstar.
  game.hiredDrivers.push({
    driverId, carId,
    weeklyCost: driver.weeklyCost,
    skill:      driver.skill,
    startSkill: driver.skill,
    potential:  clamp(driver.skill + randInt(6, 20), 0, 99),
    racesRun:   0,
  });
  saveGame();
  return { ok: true };
}

// Live skill for a hired driver (falls back to the base value on old saves)
function hiredDriverSkill(hire) {
  if (!hire) return 0;
  if (hire.skill != null) return hire.skill;
  return HIREABLE_DRIVERS.find(d => d.id === hire.driverId)?.skill || 0;
}

// Find the hire record driving a given car
function hireForCar(carId) {
  return (game.hiredDrivers || []).find(h => h.carId === carId) || null;
}

// Drivers get better with seat time. Growth is biggest for strong runs and
// tapers as they approach their personal ceiling.
function developHiredDrivers(allResults, fieldSize) {
  const byCar = new Map((allResults || []).filter(r => r.carId).map(r => [r.carId, r]));
  const grown = [];

  (game.hiredDrivers || []).forEach(h => {
    const res = byCar.get(h.carId);
    if (!res) return;                       // that car did not run

    if (h.skill == null) {                  // migrate an older save
      const base = HIREABLE_DRIVERS.find(d => d.id === h.driverId);
      h.skill = h.startSkill = base ? base.skill : 50;
      h.potential = clamp(h.skill + randInt(6, 20), 0, 99);
      h.racesRun = 0;
    }

    h.racesRun = (h.racesRun || 0) + 1;
    const before  = h.skill;
    const relPerf = clamp(1 - (res.position - 1) / Math.max(1, fieldSize), 0, 1);
    // Taper on the remaining GAP, not the ratio: a driver well short of their
    // ceiling develops quickly, and progress slows as they close on it.
    const room    = clamp((h.potential - h.skill) / 20, 0, 1);
    // The floor means even a bad day is still seat time; a strong run is worth
    // roughly six times as much.
    const gain    = (0.15 + relPerf * 0.85) * room;
    h.skill = clamp(Math.round((h.skill + gain) * 10) / 10, 0, h.potential);

    if (Math.floor(h.skill) > Math.floor(before)) {
      const drv = HIREABLE_DRIVERS.find(d => d.id === h.driverId);
      grown.push(`${drv ? drv.name : 'Your driver'} improved to skill ${Math.floor(h.skill)}.`);
    }
  });

  return grown;
}

function fireDriver(driverId) {
  const idx = game.hiredDrivers.findIndex(h => h.driverId === driverId);
  if (idx === -1) return;
  const { carId } = game.hiredDrivers[idx];
  const car = game.cars.find(c => c.id === carId);
  if (car) car.assignedDriverId = null;
  game.hiredDrivers.splice(idx, 1);
  saveGame();
}

// ─── Computed helpers ────────────────────────────────────────
function currentRace() {
  if (!game) return null;
  return game.season.calendar[game.season.raceIndex] || null;
}

function isSeasonOver() {
  return game.season.raceIndex >= game.season.calendar.length;
}

function effectiveCarScore(car) {
  // Combined score used for display/comparison
  return Math.round((car.speed + car.handling + car.reliability) / 3 * (car.condition / 100));
}

function weeklyExpenses() {
  const staffCost = game.staff.reduce((s, st) => s + st.weeklyCost, 0);
  const driverCost = game.hiredDrivers.reduce((s, h) => s + h.weeklyCost, 0);
  return staffCost + driverCost;
}

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return (s[(v-20)%10] || s[v] || s[0]);
}

// Car development has more influence than driver skill in playable career pace.
function careerRacePower(car, skill) {
  const score = car ? (car.speed + car.handling + car.reliability) / 300 : 0.5;
  const rawPower = score * 0.80 + skill / 100 * 0.20;
  return clamp(0.58 + (rawPower - 0.51) * (0.41 / 0.48), 0.3, 0.99);
}

// Retired careers live outside the five playable save slots, on this browser/origin.
const HALL_OF_FAME_KEY = 'sce_hall_of_fame';
function getHallOfFame() {
  const raw = localStorage.getItem(HALL_OF_FAME_KEY);
  const records = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(records)) throw new Error('Hall of Fame data is unreadable.');
  return records;
}
function retireCareer() {
  if (!game) return {ok:false,msg:'No active career.'};
  let archiveRaw,metaRaw,slotRaw;
  const slot=currentSlot;
  try {
    archiveRaw=localStorage.getItem(HALL_OF_FAME_KEY);
    metaRaw=localStorage.getItem(META_KEY);
    slotRaw=slot===null?null:localStorage.getItem(SLOT_PREFIX+slot);
    const records=getHallOfFame(), history=JSON.parse(JSON.stringify(game.history||[]));
    const me=(game.season.standings||[]).find(e=>e.id==='player')||{};
    records.push({id:uid(),driverName:game.driverName||game.teamName,teamName:game.teamName,
      vehicles:JSON.parse(JSON.stringify([...(game.retiredCars||[]),...game.cars.map(c=>({...c,retirementReason:'Career ended'}))])),
      retiredAt:Date.now(),series:SERIES[game.currentSeries].name,year:game.season.year,
      wins:history.reduce((n,h)=>n+(h.wins||0),0)+(me.wins||0),titles:game.titles||history.filter(h=>h.champion).length,
      seasons:history.length,reputation:game.reputation||0,money:game.money,
      sponsors:{totalEarned:game.sponsorship?.totalEarned||0,partners:(game.sponsorship?.contracts||[]).map(c=>sponsorCompany(c.companyId).name)},
      season:{races:me.races||0,points:me.points||0,top5:me.top5||0,top10:me.top10||0},history});
    // Archive first: failed/quota-limited writes must never delete a playable career.
    localStorage.setItem(HALL_OF_FAME_KEY,JSON.stringify(records));
    if(slot!==null && slot!==undefined) {
      const meta=getSaveMeta();meta[slot]=null;
      localStorage.setItem(META_KEY,JSON.stringify(meta));
      localStorage.removeItem(SLOT_PREFIX+slot);
    }
  } catch(e) {
    // Best-effort rollback; live state remains available even when storage is unavailable.
    try {if(archiveRaw!==undefined){archiveRaw===null?localStorage.removeItem(HALL_OF_FAME_KEY):localStorage.setItem(HALL_OF_FAME_KEY,archiveRaw);}if(metaRaw!==undefined){metaRaw===null?localStorage.removeItem(META_KEY):localStorage.setItem(META_KEY,metaRaw);}if(slotRaw!==null&&slotRaw!==undefined)localStorage.setItem(SLOT_PREFIX+slot,slotRaw);}catch(_){}
    return {ok:false,msg:'Could not archive this career. Your active career has been kept. Check browser storage and try again.'};
  }
  game=null;currentSlot=null;
  return {ok:true};
}

function retireOwnedCar(carId) {
 const car=game?.cars.find(c=>c.id===carId);if(!car)return {ok:false,msg:'Car not found.'};
 const before=JSON.stringify(game),hire=(game.hiredDrivers||[]).find(h=>h.carId===carId);
 game.retiredCars=game.retiredCars||[];game.retiredCars.push({...JSON.parse(JSON.stringify(car)),retiredYear:game.season.year,retiredRace:game.season.raceIndex+1,retirementReason:'Manually retired',lastDriver:car.assignedDriverId==='player'?game.driverName:HIREABLE_DRIVERS.find(d=>d.id===hire?.driverId)?.name||'Unassigned'});
 if(hire)hire.carId=null;game.cars=game.cars.filter(c=>c.id!==carId);
 if(currentSlot!==null&&!saveToSlot(currentSlot)){game=JSON.parse(before);return {ok:false,msg:'Retirement could not be saved.'};}
 return {ok:true};
}
