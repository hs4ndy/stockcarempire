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
      series: SERIES[game.currentSeries]?.name || '—',
      year: game.season.year,
      wins: game.cars.reduce((s, c) => s + (c.wins || 0), 0),
      savedAt: Date.now(),
    };
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    return true;
  } catch(e) { console.warn('Save failed:', e); return false; }
}

function loadFromSlot(slot) {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + slot);
    if (!raw) return false;
    const loaded = JSON.parse(raw);
    if (!loaded || !loaded.teamName || !loaded.cars || !loaded.season) return false;
    game = loaded;
    currentSlot = slot;
    return true;
  } catch(e) { console.warn('Load failed:', e); return false; }
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
    appliedUpgrades: [],    // upgrade ids applied
    assignedDriverId: null, // null = player drives
    wins: 0,
    races: 0,
    totalPoints: 0,
  };
}

function setCarColor(carId, color) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return;
  car.color = color;
  saveGame();
}

function setCarNumber(carId, num) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return;
  const n = parseInt(num, 10);
  if (isNaN(n) || n < 1 || n > 99) return;
  car.number = n;
  saveGame();
}

// ─── AI Team factory ────────────────────────────────────────
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
  const needed = series.fieldSize;

  // Shuffle templates, give varying power
  const templates = [...AI_TEAM_TEMPLATES].sort(() => Math.random() - 0.5);
  const teams = [];
  let carCount = 0;

  for (const tmpl of templates) {
    if (carCount >= needed - 2) break; // leave room for player
    const team = makeAITeam(tmpl, seriesLevel);
    teams.push(team);
    carCount += team.cars.length;
  }

  // Assign unique car numbers (2–99; 1 is reserved for player)
  const usedNums = new Set([1]);
  for (const team of teams) {
    for (const car of team.cars) {
      let n;
      do { n = randInt(2, 99); } while (usedNums.has(n));
      usedNums.add(n);
      car.number = n;
    }
  }

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
    driverMode: 'driver', // 'driver' | 'manager' | 'hired' (Premier Cup choice)
    hiredTeamId: null,    // if 'hired', which AI team

    cars: [firstCar],
    hiredDrivers: [],    // { driverId, carId }
    staff: [],           // { staffType, name, weeklyCost }
    activeSponsors: [],  // sponsor deal ids

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
  };

  // Init standings with player
  rebuildStandings();
  saveGame();
  return game;
}

// ─── Load / Save (slot wrappers) ─────────────────────────────
function saveGame() {
  saveToSlot(currentSlot !== null ? currentSlot : 0);
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

    const entry = game.season.standings.find(e => e.id === r.entrantId);
    if (!entry) return;
    entry.points += pts;
    entry.races += 1;
    if (pos === 1) entry.wins += 1;
    if (pos <= 5) entry.top5 += 1;
    if (pos <= 10) entry.top10 += 1;
  });
}

// ─── Post-race: update player & cars ─────────────────────────
function postRaceUpdate(playerResult, earnings) {
  // Money
  game.money += earnings;

  // Skill improvement (small gain based on finish position)
  const series = SERIES[game.currentSeries];
  const field  = series.fieldSize;
  const pos    = playerResult.position;
  const relPerf = 1 - (pos - 1) / field;  // 1.0 = win, 0 = last
  game.playerSkill = clamp(game.playerSkill + relPerf * 0.4 + 0.1, 0, 98);

  // Reputation: improves with good finishes, degrades slightly on bad ones
  if (!game.reputation) game.reputation = 50;
  if (pos === 1) game.reputation = clamp(game.reputation + 5, 0, 100);
  else if (pos <= 3) game.reputation = clamp(game.reputation + 2, 0, 100);
  else if (pos <= 10) game.reputation = clamp(game.reputation + 1, 0, 100);
  else game.reputation = clamp(game.reputation - 1, 0, 100);

  // Car condition degrades
  game.cars.forEach(car => {
    if (car.id === playerResult.carId) {
      car.condition = clamp(car.condition - randInt(8, 18), 0, 100);
      car.races += 1;
      if (pos === 1) car.wins += 1;
      car.totalPoints += series.points[pos - 1] || 0;
    } else {
      // Cars not in this race lose a little condition anyway (idle wear)
      car.condition = clamp(car.condition - randInt(0, 3), 0, 100);
    }
  });

  // AI car condition degrades too
  game.season.aiTeams.forEach(team => {
    team.cars.forEach(c => {
      c.condition = clamp(c.condition - randInt(5, 15), 0, 100);
    });
  });

  // Deduct weekly staff costs
  const weeklyStaff = game.staff.reduce((s, st) => s + st.weeklyCost, 0);
  game.money -= weeklyStaff;

  // Sponsor payouts
  let sponsorPay = 0;
  game.activeSponsors.forEach(sid => {
    const deal = SPONSOR_DEALS.find(d => d.id === sid);
    if (!deal) return;
    sponsorPay += deal.weekly;
    // Bonus
    if (deal.cond === 'top10' && pos <= 10) sponsorPay += deal.bonus;
    else if (deal.cond === 'top5' && pos <= 5) sponsorPay += deal.bonus;
    else if (deal.cond === 'top3' && pos <= 3) sponsorPay += deal.bonus;
    else if (deal.cond === 'win' && pos === 1)  sponsorPay += deal.bonus;
  });
  game.money += sponsorPay;

  // Advance race index
  game.season.raceIndex += 1;
}

// ─── Skip a race ─────────────────────────────────────────────
function skipRace() {
  const race = currentRace();
  if (!race) return;
  race.status = 'skipped';
  game.season.raceIndex += 1;
  // Weekly costs still apply
  const weeklyStaff = game.staff.reduce((s, st) => s + st.weeklyCost, 0);
  game.money -= weeklyStaff;
  // Sponsor base pay still comes in
  let sponsorPay = 0;
  game.activeSponsors.forEach(sid => {
    const deal = SPONSOR_DEALS.find(d => d.id === sid);
    if (deal) sponsorPay += deal.weekly;
  });
  game.money += sponsorPay;
  saveGame();
}

// ─── End of season ───────────────────────────────────────────
function endSeason() {
  const series = SERIES[game.currentSeries];
  const sorted = getStandings();
  const playerPos = sorted.findIndex(e => e.id === 'player') + 1;
  const totalEntrants = sorted.length;

  // Record history
  game.history.push({
    year: game.season.year,
    series: series.name,
    finalPos: playerPos,
    wins: sorted.find(e => e.id === 'player')?.wins || 0,
  });

  // Promotion / relegation
  let promoted = false;
  let relegated = false;
  let message = '';

  if (game.currentSeries < 2 && playerPos <= series.promotionSpots) {
    game.currentSeries += 1;
    promoted = true;
    const newSeries = SERIES[game.currentSeries];
    message = `You finished ${playerPos}${ordinal(playerPos)} and earned promotion to the ${newSeries.name}!`;

    // If promoted to Premier, trigger special choice (handled in UI)
    if (game.currentSeries === 2) {
      game.premierChoicePending = true;
    }

    // Upgrade cars to new class on promotion
    promoteCarClass();

  } else if (game.currentSeries > 0 && series.relegationSpots > 0 &&
             playerPos > totalEntrants - series.relegationSpots) {
    game.currentSeries -= 1;
    relegated = true;
    const newSeries = SERIES[game.currentSeries];
    message = `You finished ${playerPos}${ordinal(playerPos)} and were relegated to the ${newSeries.name}.`;
    relegateCarClass();
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

  // Reset car conditions (off-season maintenance)
  game.cars.forEach(c => {
    c.condition = clamp(c.condition + 30, 0, 100);
  });

  saveGame();
  return { promoted, relegated, playerPos, message };
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
  if (game.money < cls.buyCost) return { ok: false, msg: 'Not enough money.' };
  game.money -= cls.buyCost;
  const car = makeCar(name, classId);
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
  const hasMechanic = game.staff.some(s => s.typeId === 'mechanic');
  const discount = hasMechanic ? 0.75 : 1.0;
  const damage = 100 - car.condition;
  const cost = Math.round(damage * cls.repairCostPerPoint * discount);

  if (game.money < cost) return { ok: false, msg: `Need ${fmt$(cost)} to fully repair.` };
  game.money -= cost;
  car.condition = 100;
  saveGame();
  return { ok: true, cost };
}

function upgradeCar(carId, upgradeId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return { ok: false, msg: 'Car not found.' };

  const cls = CAR_CLASSES[car.classId];
  const upgrade = cls.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return { ok: false, msg: 'Upgrade not found.' };
  if (car.appliedUpgrades.includes(upgradeId)) return { ok: false, msg: 'Already installed.' };
  if (upgrade.prereq && !car.appliedUpgrades.includes(upgrade.prereq)) {
    return { ok: false, msg: `Requires ${cls.upgrades.find(u=>u.id===upgrade.prereq)?.name} first.` };
  }
  if (game.money < upgrade.cost) return { ok: false, msg: 'Not enough money.' };

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
function hireStaff(typeId) {
  const type = STAFF_TYPES.find(s => s.id === typeId);
  if (!type) return { ok: false, msg: 'Unknown staff type.' };

  const currentCount = game.staff.filter(s => s.typeId === typeId).length;
  if (currentCount >= type.max) return { ok: false, msg: `You can only hire ${type.max} ${type.name}(s).` };

  const weeklyCost = type.weeklyCost[game.currentSeries];
  const signingFee = weeklyCost * 4;
  if (game.money < signingFee) return { ok: false, msg: `Signing fee is ${fmt$(signingFee)}.` };

  game.money -= signingFee;
  game.staff.push({ id: uid(), typeId, name: type.name, weeklyCost });
  saveGame();
  return { ok: true };
}

function fireStaff(staffId) {
  const idx = game.staff.findIndex(s => s.id === staffId);
  if (idx === -1) return;
  game.staff.splice(idx, 1);
  saveGame();
}

// ─── Driver management ───────────────────────────────────────
function hireDriver(driverId, carId) {
  if (game.hiredDrivers.find(h => h.driverId === driverId))
    return { ok: false, msg: 'Already hired.' };
  if (game.hiredDrivers.find(h => h.carId === carId))
    return { ok: false, msg: 'That car already has a driver.' };

  const driver = HIREABLE_DRIVERS.find(d => d.id === driverId);
  if (!driver) return { ok: false, msg: 'Driver not found.' };

  const signingFee = driver.weeklyCost * 4;
  if (game.money < signingFee) return { ok: false, msg: `Signing fee is ${fmt$(signingFee)}.` };

  game.money -= signingFee;

  const car = game.cars.find(c => c.id === carId);
  if (car) car.assignedDriverId = driverId;

  game.hiredDrivers.push({ driverId, carId, weeklyCost: driver.weeklyCost });
  saveGame();
  return { ok: true };
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

// ─── Sponsor management ──────────────────────────────────────
function signSponsor(sponsorId) {
  if (game.activeSponsors.includes(sponsorId)) return { ok: false, msg: 'Already signed.' };
  if (game.activeSponsors.length >= 3) return { ok: false, msg: 'Max 3 sponsors at a time.' };
  const deal = SPONSOR_DEALS.find(d => d.id === sponsorId);
  if (!deal) return { ok: false, msg: 'Deal not found.' };
  if (deal.level > game.currentSeries) return { ok: false, msg: 'Not eligible yet.' };
  game.activeSponsors.push(sponsorId);
  saveGame();
  return { ok: true };
}

function dropSponsor(sponsorId) {
  const idx = game.activeSponsors.indexOf(sponsorId);
  if (idx !== -1) game.activeSponsors.splice(idx, 1);
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

function weeklySponsorIncome() {
  return game.activeSponsors.reduce((s, sid) => {
    const deal = SPONSOR_DEALS.find(d => d.id === sid);
    return s + (deal ? deal.weekly : 0);
  }, 0);
}

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return (s[(v-20)%10] || s[v] || s[0]);
}

// ─── Premier Cup career choice ───────────────────────────────
function chooseCareerPath(path, aiTeamId) {
  // path: 'driver' | 'manager' | 'hired'
  game.driverMode = path;
  if (path === 'hired') {
    game.hiredTeamId = aiTeamId;
    // Player no longer owns their team; get a salary
    game.hiredSalary = 8000; // weekly salary
  }
  game.premierChoicePending = false;
  saveGame();
}
