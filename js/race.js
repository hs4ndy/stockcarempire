// ============================================================
// STOCK CAR EMPIRE - Race Simulation Engine
// ============================================================

/**
 * Simulate a full race and return structured results.
 *
 * @param {object} opts
 *   playerCarId   - which of the player's cars is racing (null if manager/hired mode)
 *   trackId       - the track being raced
 *   isHiredMode   - true if player drives for an AI team
 * @returns {object}  { results, events, playerResult }
 */
function simulateRace({ playerCarId, trackId, isHiredMode }) {
  const track = TRACKS.find(t => t.id === trackId);
  const series = SERIES[game.currentSeries];

  // Build the full entry list
  const entries = buildEntryList(playerCarId, trackId, isHiredMode);

  // Calculate initial performance scores
  entries.forEach(e => {
    e.perfScore = calcPerf(e, track);
  });

  // --- Run the simulation in 5 phases ---
  const phases = ['start', 'early', 'mid', 'late', 'finish'];
  const events  = [];

  // Starting grid (sorted by perf with some qualifying randomness).
  // Data Analysts turn practice data into a better lap, so your cars qualify
  // stronger and with less scatter.
  const analystQuali = analystCount() * ANALYST_QUALI_BONUS;
  entries.forEach(e => {
    const ours = e.isPlayer || e.isTeammate;
    const scatter = ours && analystQuali > 0 ? 5 : 8;
    e.qualifyScore = e.perfScore + rand(-scatter, scatter) + (ours ? analystQuali : 0);
  });
  entries.sort((a, b) => b.qualifyScore - a.qualifyScore);
  entries.forEach((e, i) => { e.position = i + 1; });

  // Track lead changes
  let currentLeader = entries[0];
  let cautionCount  = 0;

  for (const phase of phases) {
    const phaseEvents = runPhase(entries, phase, track, currentLeader, cautionCount);
    events.push(...phaseEvents.events);
    if (phaseEvents.caution) cautionCount++;
    // Re-sort after phase
    entries.sort((a, b) => {
      if (a.dnf && !b.dnf) return 1;
      if (!a.dnf && b.dnf) return -1;
      if (a.dnf && b.dnf) return b.dnfLap - a.dnfLap; // later DNF = better
      return a.position - b.position;
    });
    entries.forEach((e, i) => { if (!e.dnf) e.position = i + 1; });

    // Check for new leader
    const leader = entries.find(e => !e.dnf);
    if (leader && leader.id !== currentLeader.id) {
      currentLeader = leader;
      const tmpl = pick(RACE_EVENTS.leadChange);
      events.push({
        phase,
        type: 'lead_change',
        text: tmpl.replace('{car}', leader.displayName).replace('{lap}', randInt(20, track.laps - 20)),
        isPlayer: leader.isPlayer,
      });
    }
  }

  // Final positions.
  // These MUST come from the running order the phases produced — the closing
  // phase decides the race. Re-sorting on the pre-race perfScore here threw
  // the whole race away and handed the win to whoever qualified strongest,
  // so the car reported leading at the flag could still lose.
  entries.sort((a, b) => {
    if (a.dnf && !b.dnf) return 1;
    if (!a.dnf && b.dnf) return -1;
    if (a.dnf && b.dnf) return b.dnfLap - a.dnfLap;
    return a.position - b.position;
  });
  entries.forEach((e, i) => { e.position = i + 1; });

  // Build results array
  const results = entries.map(e => ({
    entrantId:   e.id,
    carId:       e.carId || null,
    displayName: e.displayName,
    teamName:    e.teamName,
    teamColor:   e.teamColor,
    position:    e.position,
    dnf:         e.dnf,
    isPlayer:    e.isPlayer,
    points:      series.points[e.position - 1] || 0,
    prize:       e.dnf ? Math.round(series.prize[Math.min(e.position - 1, series.prize.length - 1)] * 0.4)
                       : (series.prize[e.position - 1] || series.prize[series.prize.length - 1]),
  }));

  const playerResult = results.find(r => r.isPlayer) || null;

  return { results, events, playerResult };
}

// ─── Build entry list ────────────────────────────────────────
function buildEntryList(playerCarId, trackId, isHiredMode) {
  const series  = SERIES[game.currentSeries];
  const entries = [];

  // Player entry
  if (!isHiredMode && playerCarId) {
    const car = game.cars.find(c => c.id === playerCarId);
    if (car) {
      entries.push({
        id:          'player',
        carId:       car.id,
        displayName: `${game.teamName} / ${car.name}`,
        teamName:    game.teamName,
        teamColor:   '#e8001d',
        isPlayer:    true,
        dnf:         false,
        // Performance inputs
        speed:       car.speed,
        handling:    car.handling,
        reliability: car.reliability,
        condition:   car.condition,
        driverSkill: game.playerSkill,
        hasCrchief:  game.staff.some(s => s.typeId === 'crew_chief'),
        hasEngineer: game.staff.some(s => s.typeId === 'engineer'),
        analysts:    analystCount(),
      });
    }
  }

  if (isHiredMode) {
    // Player is driving for an AI team — treat like a strong entry
    const aiTeam = game.season.aiTeams.find(t => t.id === game.hiredTeamId);
    if (aiTeam) {
      const power = (aiTeam.cars[0]?.power || 0.55) + game.playerSkill / 100 * 0.2;
      entries.push({
        id:          'player',
        displayName: `${aiTeam.name} / You`,
        teamName:    aiTeam.name,
        teamColor:   aiTeam.color,
        isPlayer:    true,
        dnf:         false,
        syntheticPower: clamp(power, 0.3, 0.98),
      });
    }
  }

  // Your other cars, driven by hired drivers. These are real entries: they
  // race, score points and appear in the standings under their driver's name.
  game.cars.forEach(car => {
    if (car.id === playerCarId) return;                 // that's the one you drive
    const hire = (game.hiredDrivers || []).find(h => h.carId === car.id);
    if (!hire) return;                                  // no driver = not entered
    const drv = HIREABLE_DRIVERS.find(d => d.id === hire.driverId);
    if (!drv) return;
    const carScore = (car.speed + car.handling + car.reliability) / 300;
    const skill    = hiredDriverSkill(hire);   // live, improves over the season
    const power    = clamp(carScore * 0.72 + (skill / 100) * 0.28, 0.25, 0.98);
    entries.push({
      id:          car.id,
      carId:       car.id,
      displayName: `${game.teamName} / ${drv.name}`,
      teamName:    game.teamName,
      teamColor:   car.color || '#e8001d',
      isPlayer:    false,
      isTeammate:  true,
      dnf:         false,
      syntheticPower: power * (car.condition / 100),
      aggression:  (drv.aggression || 50) / 100,
    });
  });

  // AI team entries
  game.season.aiTeams.forEach(team => {
    team.cars.forEach(car => {
      if (isHiredMode && team.id === game.hiredTeamId) return; // skip — player fills this slot
      entries.push({
        id:          car.id,
        displayName: `${team.name} / ${car.driverName}`,
        teamName:    team.name,
        teamColor:   team.color,
        isPlayer:    false,
        dnf:         false,
        syntheticPower: car.power * (car.condition / 100),
        aggression:  team.aggression,
      });
    });
  });

  // Pad to field size with generic backmarkers
  while (entries.length < series.fieldSize) {
    const tmpl = pick(AI_TEAM_TEMPLATES);
    entries.push({
      id:          uid(),
      displayName: `${tmpl.name} / ${pick(AI_DRIVER_NAMES)}`,
      teamName:    tmpl.name,
      teamColor:   tmpl.color,
      isPlayer:    false,
      dnf:         false,
      syntheticPower: rand(0.25, 0.45),
      aggression:  tmpl.aggression,
    });
  }

  return entries.slice(0, series.fieldSize);
}

// ─── Merge a real 3D finish into simulated results ───────────
// The player's actual on-track finish replaces their simulated one. Everyone
// else has to shift around them, otherwise two cars share a position and one
// position goes missing (the "duplicate positions in the Top 10" bug).
function reRankWithPlayerAt(results, playerPosition) {
  const series  = SERIES[game.currentSeries];
  const player  = results.find(r => r.isPlayer);
  const others  = results.filter(r => !r.isPlayer)
                         .sort((a, b) => a.position - b.position);

  // Finishers first, DNFs always at the back
  const running = others.filter(r => !r.dnf);
  const retired = others.filter(r => r.dnf);

  const idx = clamp(playerPosition - 1, 0, running.length);
  if (player) running.splice(idx, 0, player);

  const ordered = [...running, ...retired];
  return ordered.map((r, i) => {
    const pos = i + 1;
    const prizeTable = series.prize;
    const basePrize  = prizeTable[pos - 1] !== undefined
      ? prizeTable[pos - 1]
      : prizeTable[prizeTable.length - 1];
    return {
      ...r,
      position: pos,
      points:   r.dnf ? 0 : (series.points[pos - 1] || 0),
      prize:    r.dnf ? Math.round(basePrize * 0.4) : basePrize,
    };
  });
}

// ─── Merge the whole team's real 3D finish into simulated results ────
// Every car of yours that ran on track (you and any team-mates) is placed in
// the order they actually finished, relative to each other. The simulated
// field then fills in around them, keeping every position unique.
//
// Without this only the player's result was real, so a team-mate you shoved to
// the win could still be shown mid-pack.
function reRankWithTeamOrder(results, playerPosition, trackOrder) {
  const series = SERIES[game.currentSeries];
  const order  = (trackOrder || []).filter(o => o.carId || o.isPlayer);
  if (!order.length) return reRankWithPlayerAt(results, playerPosition);

  // Results for our own cars, keyed so we can look them up by carId
  const isOurs = r => r.isPlayer || order.some(o => o.carId && o.carId === r.carId);
  const ours   = results.filter(isOurs);
  const rest   = results.filter(r => !isOurs(r)).sort((a, b) => a.position - b.position);

  // Sort our cars by where they really finished on track
  const trackPos = r => {
    const hit = order.find(o => (r.isPlayer && o.isPlayer) || (o.carId && o.carId === r.carId));
    return hit ? hit.position : Infinity;
  };
  ours.sort((a, b) => trackPos(a) - trackPos(b));

  // The player's on-track position anchors the team in the overall field;
  // team-mates that beat them slot in ahead, the rest just behind.
  const running = rest.filter(r => !r.dnf);
  const retired = rest.filter(r => r.dnf);
  const ourRunning = ours.filter(r => !r.dnf);
  const ourRetired = ours.filter(r => r.dnf);

  const playerIdxInTeam = Math.max(0, ourRunning.findIndex(r => r.isPlayer));
  const anchor = clamp(playerPosition - 1 - playerIdxInTeam, 0, running.length);

  const ordered = [
    ...running.slice(0, anchor),
    ...ourRunning,
    ...running.slice(anchor),
    ...ourRetired,
    ...retired,
  ];

  return ordered.map((r, i) => {
    const pos = i + 1;
    const table = series.prize;
    const base  = table[pos - 1] !== undefined ? table[pos - 1] : table[table.length - 1];
    return {
      ...r,
      position: pos,
      points:   r.dnf ? 0 : (series.points[pos - 1] || 0),
      prize:    r.dnf ? Math.round(base * 0.4) : base,
    };
  });
}

// ─── Calculate performance score ─────────────────────────────
function calcPerf(entry, track) {
  if (entry.syntheticPower !== undefined) {
    // AI / hired entry: use synthetic power directly.
    // Rival teams get a difficulty bump; your own cars do not.
    const diff = difficultyById(game.difficulty || DEFAULT_DIFFICULTY);
    const mult = entry.isTeammate ? 1 : diff.aiPower;
    const base = entry.syntheticPower * 100 * mult;
    return base + rand(-6, 6);
  }

  // Player entry with real stats
  const sw  = track.speedW;
  const hw  = track.handW;
  const wt  = sw + hw;
  const raw = (entry.speed * sw + entry.handling * hw) / wt;
  const condMod   = entry.condition / 100;
  const skillMod  = 0.25 + entry.driverSkill / 100 * 0.35; // 0.25–0.60
  const chiefBonus = entry.hasCrchief ? 2 : 0;
  const engBonus   = entry.hasEngineer ? 2 : 0;
  const analystBonus = (entry.analysts || 0) * 2;   // setup work found in the data
  const base = raw * condMod + entry.driverSkill * 0.1 + chiefBonus + engBonus + analystBonus;
  return clamp(base, 10, 99) + rand(-5, 5);
}

// ─── Run a single race phase ──────────────────────────────────
function runPhase(entries, phase, track, currentLeader, cautionCount) {
  const events  = [];
  let   caution = false;
  const liveEntries = entries.filter(e => !e.dnf);

  // --- Position churn ---
  // Re-evaluate performance with fresh noise.
  // Track position is sticky: where you qualified sets the opening phase, and
  // running up front is worth a little every phase after. Without this the
  // grid was decorative and qualifying could not matter.
  const fieldN = liveEntries.length || 1;
  liveEntries.forEach(e => {
    const gridEdge = phase === 'start' ? (e.qualifyScore - e.perfScore) * 0.8 : 0;
    const momentum = e.position ? (fieldN - e.position) / fieldN * 6 : 0;
    e.phaseScore = e.perfScore + rand(-10, 10) + gridEdge + momentum;
    // Reliability check — DNF risk
    const relRisk = e.reliability !== undefined ? e.reliability : (e.syntheticPower || 0.5) * 80 + 30;
    const dnfChance = clamp((100 - relRisk) / 1000, 0.005, 0.06);
    if (Math.random() < dnfChance) {
      e.dnf    = true;
      e.dnfLap = randInt(track.laps * 0.2, track.laps * 0.9);
      events.push({
        phase,
        type:     'dnf',
        text:     pick(RACE_EVENTS.crash).replace('{car}', e.displayName.split(' / ')[0]),
        isPlayer: e.isPlayer,
      });
    }
  });

  // Sort by phaseScore
  const active = liveEntries.filter(e => !e.dnf).sort((a, b) => b.phaseScore - a.phaseScore);
  active.forEach((e, i) => { e.position = i + 1; });

  // --- Caution flag (random, less likely late) ---
  const cautionChance = phase === 'finish' ? 0.10 : 0.25;
  if (Math.random() < cautionChance && cautionCount < 4) {
    caution = true;
    events.push({
      phase,
      type:     'caution',
      text:     pick(RACE_EVENTS.caution),
      isPlayer: false,
    });
    // Bunch the field up after caution
    active.forEach((e, i) => {
      const bunching = rand(0, 3);
      e.position = clamp(e.position + (Math.random() > 0.5 ? -1 : 1) * Math.floor(bunching), 1, active.length);
    });
    // Re-sort
    active.sort((a, b) => a.position - b.position);
    active.forEach((e, i) => { e.position = i + 1; });
  }

  // --- Player-specific event ---
  const playerEntry = entries.find(e => e.isPlayer && !e.dnf);
  if (playerEntry && Math.random() < 0.35) {
    const isGood = Math.random() < 0.55;
    const eventText = isGood ? pick(RACE_EVENTS.good) : pick(RACE_EVENTS.bad);
    if (!isGood) {
      playerEntry.position = clamp(playerEntry.position + randInt(1, 4), 1, active.length);
    } else {
      playerEntry.position = clamp(playerEntry.position - randInt(1, 3), 1, active.length);
    }
    events.push({
      phase,
      type:     isGood ? 'player_good' : 'player_bad',
      text:     eventText,
      isPlayer: true,
    });
  }

  return { events, caution };
}

// ─── Build the final results for the race modal ───────────────
function formatRaceResults(results) {
  const series = SERIES[game.currentSeries];
  return results.map(r => {
    const pts = series.points[r.position - 1] || 0;
    return { ...r, pts };
  });
}
