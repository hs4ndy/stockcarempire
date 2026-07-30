// ============================================================
// STOCK CAR EMPIRE - Main Entry Point & Event Handling
// ============================================================

// ─── Race playback state ──────────────────────────────────────
let racePlayback = {
  results: null,
  events:  null,
  playerResult: null,
  step: 0,
  speed: 1,       // 1 = normal, 3 = fast, 99 = instant
  timer: null,
  skipRequested: false,
};

let selectedCareerPath = null;

// ─── Startup ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  showScreen('intro');
});

function enterGame() {
  try {
    showScreen('game');
    updateHeader();
    showTab('dashboard');
    if (game.premierChoicePending) {
      showPremierChoiceModal();
    }
  } catch (e) {
    console.error('Failed to load game UI:', e);
    toast('Save file could not be loaded. Starting fresh.', 'error');
    deleteSave();
    showScreen('intro');
  }
}

// ─── Intro / New Game ─────────────────────────────────────────
document.getElementById('btn-start-new')?.addEventListener('click', () => {
  showScreen('setup');
});

document.getElementById('btn-load-game')?.addEventListener('click', () => {
  showLoadModal();
});

document.getElementById('btn-quick-race')?.addEventListener('click', () => {
  showQuickRaceScreen();
});

document.getElementById('btn-create-team')?.addEventListener('click', () => {
  const teamName   = document.getElementById('inp-team-name').value.trim();
  const driverName = document.getElementById('inp-driver-name').value.trim();
  const carName    = document.getElementById('inp-car-name').value.trim();
  if (!teamName)   { toast('Please enter a team name.', 'warning'); return; }
  if (!driverName) { toast('Please enter a driver name.', 'warning'); return; }
  if (!carName)    { toast('Please name your first car.', 'warning'); return; }
  newGame(teamName, driverName, carName);
  toast(`Welcome to Stock Car Empire, ${driverName}!`, 'success');
  enterGame();
});

// Allow Enter key on setup form
document.getElementById('inp-car-name')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-create-team').click();
});

// ─── Navigation ───────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    showTab(tab);
    updateHeader();
  });
});

// ─── Quick Race ───────────────────────────────────────────────
function showQuickRaceScreen() {
  document.body.insertAdjacentHTML('beforeend', renderQuickRaceModal());
}

function handleStartQuickRace(fieldSize) {
  document.getElementById('quick-race-modal')?.remove();
  const AI_COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#c0392b','#16a085','#8e44ad','#2980b9','#27ae60'];
  const aiEntries = [];
  // Unique human driver names for the field
  const namePool = [...AI_DRIVER_NAMES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < fieldSize - 1; i++) {
    const nm = namePool[i % namePool.length] + (i >= namePool.length ? ' Jr.' : '');
    aiEntries.push({ name: nm, color: AI_COLORS[i % AI_COLORS.length], number: i + 2, power: rand(0.35, 0.80) });
  }
  showScreen('game-race');
  launch3DRace(
    { playerColor: '#e8001d', playerNumber: 1, playerPower: 0.60, fieldSize, aiEntries },
    (pos) => {
      showScreen('intro');
      toast(`Quick Race finished — you placed ${pos}${ordinal(pos)}!`, pos <= 3 ? 'success' : 'info');
    }
  );
}

// ─── Career Stats ─────────────────────────────────────────────
function handleSetCarColor(carId, color) {
  setCarColor(carId, color);
  renderTab('carstats');
}

function handleSetCarNumber(carId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return;
  const val = prompt(`Car number for "${car.name}" (1–99):`, car.number || 1);
  if (val === null) return;                       // cancelled
  const res = setCarNumber(carId, val);
  if (!res.ok) { toast(res.msg, 'error'); return; }
  toast(`${car.name} is now #${res.number}.`, 'success');
  renderTab(activeTab());                          // stay on the tab you're on
}

// Which career tab is currently showing
function activeTab() {
  return document.querySelector('.nav-btn.active')?.dataset.tab || 'dashboard';
}

// ─── Dashboard handlers ───────────────────────────────────────
function handleOpenRaceWeekend() {
  if (!currentRace()) return;
  showScreen('race-setup');
  document.getElementById('race-setup-content').innerHTML = renderRaceSetup();
}

function handleSkipRace() {
  if (!confirm('Skip this race? You won\'t earn prize money, but weekly costs still apply.')) return;
  const race = currentRace();
  if (!race) return;
  race.status = 'skipped';
  skipRace();
  toast('Race skipped. Weekly costs deducted.', 'info');
  updateHeader();
  renderTab('dashboard');
}

function handleEndSeason() {
  if (!isSeasonOver()) { toast('Season is not over yet!', 'warning'); return; }
  const info = endSeason();
  // Show result modal
  document.body.insertAdjacentHTML('beforeend', renderEndSeasonModal(info));
  if (game.premierChoicePending) {
    // Will show after dismissing end-season modal
  }
}

function handleDismissEndSeason() {
  document.getElementById('end-season-modal')?.remove();
  if (game.premierChoicePending) {
    showPremierChoiceModal();
    return;
  }
  updateHeader();
  renderTab('dashboard');
}

// ─── Garage handlers ─────────────────────────────────────────
// Modals must be children of <body>. Rendering them inside #main-content puts
// them under an element whose entry animation leaves a transform behind, which
// makes position:fixed resolve against that element — the overlay ends up at
// the bottom of the page instead of centred on screen.
function showUpgradeModal(carId) {
  document.getElementById('upgrade-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', renderUpgradeModal(carId));
}

function closeUpgradeModal(event) {
  if (event && event.target.id !== 'upgrade-modal') return;
  document.getElementById('upgrade-modal')?.remove();
}

function handleRepair(carId, cost) {
  const result = repairCar(carId);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  toast(`Car repaired for ${fmt$(result.cost)}.`, 'success');
  updateHeader();
  renderTab('garage');
}

function handleUpgrade(carId, upgradeId) {
  const result = upgradeCar(carId, upgradeId);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  const car = game.cars.find(c => c.id === carId);
  const upg = CAR_CLASSES[car.classId].upgrades.find(u => u.id === upgradeId);
  toast(`${upg?.name} fitted.`, 'success');
  updateHeader();
  // Refresh the modal (tier counts move) and the garage behind it
  showUpgradeModal(carId);
  renderTab(activeTab());
}

function handleRenameCar(carId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return;
  const name = prompt('Enter new car name:', car.name);
  if (!name || !name.trim()) return;
  renameCar(carId, name);
  renderTab('garage');
}

function handleSellCar(carId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return;
  const cls = CAR_CLASSES[car.classId];
  const val = Math.round(cls.sellValue * (car.condition / 100));
  if (!confirm(`Sell ${car.name} for ${fmt$(val)}?`)) return;
  const result = sellCar(carId);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  toast(`${car.name} sold for ${fmt$(result.value)}.`, 'success');
  updateHeader();
  renderTab('garage');
}

// ─── Team handlers ────────────────────────────────────────────
function handleHireStaff(typeId) {
  const result = hireStaff(typeId);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  const type = STAFF_TYPES.find(s => s.id === typeId);
  toast(`${type?.name} hired!`, 'success');
  updateHeader();
  renderTab('team');
}

function handleFireStaff(staffId) {
  const s = game.staff.find(st => st.id === staffId);
  if (!confirm(`Fire ${s?.name}?`)) return;
  fireStaff(staffId);
  toast('Staff member released.', 'info');
  renderTab('team');
}

// Cars a hired driver could actually take: not the one you drive, and not
// already occupied by another hired driver.
function freeCarsForHire() {
  return (game.cars || []).filter(c =>
    c.assignedDriverId !== 'player' &&
    !(game.hiredDrivers || []).find(h => h.carId === c.id)
  );
}

function openHireDriverModal(driverId) {
  // You need a car before you can put a driver in one.
  if (!game.cars || game.cars.length === 0) {
    toast('No car — you must buy a car before hiring a driver.', 'error');
    return;
  }
  if (freeCarsForHire().length === 0) {
    toast('No free car — every car already has a driver. Buy another car first.', 'error');
    return;
  }
  document.getElementById('hire-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', renderHireDriverModal(driverId));
}

function closeHireModal(event) {
  if (event && event.target.id !== 'hire-modal') return;
  document.getElementById('hire-modal')?.remove();
}

function confirmHireDriver(driverId) {
  const carId = document.getElementById('hire-car-select')?.value;
  if (!carId) { toast('Select a car.', 'warning'); return; }
  const result = hireDriver(driverId, carId);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  const d = HIREABLE_DRIVERS.find(dr => dr.id === driverId);
  toast(`${d?.name} hired!`, 'success');
  document.getElementById('hire-modal')?.remove();
  updateHeader();
  renderTab('team');
}

function handleFireDriver(driverId) {
  const entry = game.hiredDrivers.find(h => h.driverId === driverId);
  const d     = HIREABLE_DRIVERS.find(dr => dr.id === driverId);
  if (!confirm(`Release ${d?.name}?`)) return;
  fireDriver(driverId);
  toast(`${d?.name} released.`, 'info');
  renderTab('team');
}

// ─── Market handlers ──────────────────────────────────────────
function handleBuyCar() {
  const name = prompt('Name your new car:');
  if (!name || !name.trim()) return;
  const result = buyCar(name.trim());
  if (!result.ok) { toast(result.msg, 'error'); return; }
  toast(`${name} added to your garage!`, 'success');
  updateHeader();
  renderTab('market');
}

// ─── Bank ─────────────────────────────────────────────────────
function handleTakeLoan(offerId) {
  const res = takeLoan(offerId);
  if (!res.ok) { toast(res.msg, 'error'); return; }
  toast(`${res.loan.name}: ${fmt$(res.loan.principal)} received. Repay ${fmt$(res.loan.balance)} within ${res.loan.term} races.`, 'success', 6000);
  updateHeader();
  renderTab('market');
}

function handleRepayLoan(loanId, amount) {
  const res = repayLoan(loanId, amount);
  if (!res.ok) { toast(res.msg, 'error'); return; }
  toast(res.cleared ? `Loan cleared — ${fmt$(res.paid)} paid.` : `${fmt$(res.paid)} paid off.`, 'success');
  updateHeader();
  renderTab('market');
}

function handleSignSponsor(sponsorId) {
  const result = signSponsor(sponsorId);
  if (!result.ok) { toast(result.msg, 'error'); return; }
  const d = SPONSOR_DEALS.find(s => s.id === sponsorId);
  toast(`Signed deal with ${d?.name}!`, 'success');
  renderTab('market');
}

function handleDropSponsor(sponsorId) {
  const d = SPONSOR_DEALS.find(s => s.id === sponsorId);
  if (!confirm(`Drop ${d?.name}?`)) return;
  dropSponsor(sponsorId);
  toast('Sponsor deal dropped.', 'info');
  renderTab('market');
}

// ─── Race Weekend ─────────────────────────────────────────────
// Every car you own must have someone in it before the team can enter.
// Returns an error string, or null when the entry is legal.
function validateRaceEntry(playerCarId) {
  if (!game.cars || game.cars.length === 0) {
    return 'No car — you must buy a car before you can race.';
  }
  if (game.driverMode === 'hired') return null;   // you drive for another team
  const undriven = game.cars.filter(c =>
    c.id !== playerCarId && !(game.hiredDrivers || []).find(h => h.carId === c.id)
  );
  if (undriven.length) {
    const names = undriven.map(c => `#${c.number || 1} ${c.name}`).join(', ');
    return `Error: assign a driver to ${names} before racing — hire one in the Team tab, or sell the car.`;
  }
  return null;
}

function handleStartRace() {
  const race   = currentRace();
  const series = SERIES[game.currentSeries];
  const isHiredMode = game.driverMode === 'hired';

  // Determine which car the player is driving
  let playerCarId = null;
  if (game.driverMode === 'driver') {
    const radioSelected = document.querySelector('input[name="drive-car"]:checked');
    playerCarId = radioSelected?.value
      || (game.cars.find(c => c.assignedDriverId === 'player') || game.cars[0])?.id;
    game.cars.forEach(c => {
      if (c.id === playerCarId) c.assignedDriverId = 'player';
      else if (c.assignedDriverId === 'player') c.assignedDriverId = null;
    });
  }

  // Every owned car needs a driver before the team can enter
  const entryError = validateRaceEntry(playerCarId);
  if (entryError) { toast(entryError, 'error', 6000); return; }

  // Deduct entry fee
  const entryFee = series.entryFee * Math.max(1, game.cars.length);
  if (game.money < entryFee) {
    toast(`Not enough money for entry fee (${fmt$(entryFee)}).`, 'error');
    return;
  }
  game.money -= entryFee;

  // Player power based on their car + skill
  const pCar = game.cars.find(c => c.assignedDriverId === 'player') || game.cars[0];
  const carScore  = pCar ? (pCar.speed + pCar.handling + pCar.reliability) / 300 : 0.5;
  const playerPower = clamp(carScore * 0.65 + game.playerSkill / 100 * 0.35, 0.3, 0.95);

  // Build AI entry list for 3D race
  const aiEntries = [];
  const usedNums  = new Set([pCar?.number || 1]);
  const usedNames = new Set([game.driverName || game.teamName]);

  const nextNum = (preferred) => {
    let n = preferred;
    if (!n || usedNums.has(n)) { do { n = randInt(2, 99); } while (usedNums.has(n)); }
    usedNums.add(n);
    return n;
  };
  // Drivers are people — always show a human name in the race, never a team word.
  const nextDriverName = (preferred) => {
    if (preferred && !usedNames.has(preferred)) { usedNames.add(preferred); return preferred; }
    const free = AI_DRIVER_NAMES.filter(n => !usedNames.has(n));
    const nm = free.length ? pick(free) : `${pick(AI_DRIVER_NAMES).split(' ')[1]} #${usedNames.size}`;
    usedNames.add(nm);
    return nm;
  };

  // Player's own teammate cars (other cars in game.cars not driven by player)
  game.cars.forEach(car => {
    if (car.id === pCar?.id) return; // skip the car the player is driving
    const hired     = hireForCar(car.id);
    const hiredName = hired ? HIREABLE_DRIVERS.find(d => d.id === hired.driverId)?.name : null;
    if (!car.driverName) car.driverName = nextDriverName();
    // Teammate pace reflects both the car and how good the driver has become
    const carScore = (car.speed + car.handling + car.reliability) / 300;
    const skill    = hired ? hiredDriverSkill(hired) / 100 : 0.5;
    aiEntries.push({
      name:       nextDriverName(hiredName || car.driverName),
      color:      car.color || pCar?.color || '#e8001d',
      number:     nextNum(car.number),
      power:      clamp(carScore * 0.68 + skill * 0.27, 0.25, 0.95),
      isTeammate: true,
    });
  });

  game.season.aiTeams.forEach(team => {
    team.cars.forEach(car => {
      if (isHiredMode && team.id === game.hiredTeamId) return;
      aiEntries.push({
        name:   nextDriverName(car.driverName),
        color:  car.color || team.color,
        number: nextNum(car.number),
        power:  clamp(car.power * (car.condition / 100), 0.25, 0.95),
      });
    });
  });
  // Pad with generic backmarkers to fill field
  while (aiEntries.length < series.fieldSize - 1) {
    const tmpl = pick(AI_TEAM_TEMPLATES);
    aiEntries.push({ name: nextDriverName(), color: tmpl.color, number: nextNum(), power: rand(0.28, 0.48) });
  }

  // Switch to race screen and launch 3D
  showScreen('game-race');

  launch3DRace(
    {
      playerColor:  pCar?.color  || '#e8001d',
      playerNumber: pCar?.number || 1,
      playerPower,
      playerName:   game.driverName || game.teamName,
      fieldSize:    series.fieldSize,
      aiEntries:    aiEntries.slice(0, series.fieldSize - 1),
    },
    (playerPosition) => {
      // 3D race complete — playerPosition is 1-indexed finish position
      // Run background sim to get AI standings (player result will be overridden)
      const simResult = simulateRace({ playerCarId, trackId: race.trackId, isHiredMode });

      // Slot the player's real 3D finish into the field, shifting everyone
      // else so every position stays unique.
      const stub = {
        entrantId:   'player',
        carId:       playerCarId,
        displayName: `${game.teamName} / ${game.driverName || 'You'}`,
        teamName:    game.teamName,
        teamColor:   pCar?.color || '#e8001d',
        isPlayer:    true,
        dnf:         false,
        position:    playerPosition,
      };
      const merged     = simResult.results.map(r => (r.isPlayer ? stub : r));
      const allResults = reRankWithPlayerAt(merged, playerPosition);
      const pr         = allResults.find(r => r.isPlayer);
      const prize      = pr.prize;
      const pts        = pr.points;

      applyRaceResults(allResults);

      // Persist race state
      race.status       = 'completed';
      race.playerResult = pr;
      race.playerPoints = pts;
      race.earnings     = prize;

      postRaceUpdate(pr, prize, allResults);
      saveGame();

      // Show results modal over the now-blank race screen
      showScreen('game');
      document.body.insertAdjacentHTML('beforeend',
        renderRaceResultsModal(allResults, [], pr)
      );
    }
  );
}

// ─── Simulate Race (instant, no 3D) ───────────────────────────
function handleSimulateRace() {
  const race   = currentRace();
  const series = SERIES[game.currentSeries];
  if (!race) return;

  // Determine player car
  let playerCarId = null;
  if (game.driverMode === 'driver') {
    const radioSelected = document.querySelector('input[name="drive-car"]:checked');
    playerCarId = radioSelected?.value
      || (game.cars.find(c => c.assignedDriverId === 'player') || game.cars[0])?.id;
    game.cars.forEach(c => {
      if (c.id === playerCarId) c.assignedDriverId = 'player';
      else if (c.assignedDriverId === 'player') c.assignedDriverId = null;
    });
  }

  const entryError = validateRaceEntry(playerCarId);
  if (entryError) { toast(entryError, 'error', 6000); return; }

  // Deduct entry fee
  const entryFee = series.entryFee * Math.max(1, game.cars.length);
  if (game.money < entryFee) {
    toast(`Not enough money for entry fee (${fmt$(entryFee)}).`, 'error');
    return;
  }
  game.money -= entryFee;

  // Run full simulation
  const simResult = simulateRace({ playerCarId, trackId: race.trackId, isHiredMode: game.driverMode === 'hired' });
  const pr = simResult.playerResult;
  if (!pr) { toast('Simulation error.', 'error'); return; }

  applyRaceResults(simResult.results);
  race.status       = 'completed';
  race.playerResult = pr;
  race.playerPoints = pr.points;
  race.earnings     = pr.prize;
  postRaceUpdate(pr, pr.prize, simResult.results);
  saveGame();

  showScreen('game');
  document.body.insertAdjacentHTML('beforeend',
    renderRaceResultsModal(
      simResult.results.sort((a, b) => a.position - b.position),
      simResult.events,
      pr
    )
  );
}

// ─── Kept for potential future use (unused with 3D mode) ──────
function handleRaceSkipToEnd() {}
function handleRaceSpeed() {}

// ─── (Legacy playback removed — replaced by 3D race) ─────────
function startRacePlayback(results, events, playerResult) {
  // no-op placeholder
  setPhaseLabel('start');
  scheduleNextEvent();
}

function scheduleNextEvent() {
  if (racePlayback.skipRequested) { finishRacePlayback(); return; }
  const delay = racePlayback.speed === 1 ? 900 : 350;
  racePlayback.timer = setTimeout(showNextEvent, delay);
}

function showNextEvent() {
  const { events, step } = racePlayback;
  if (step >= events.length) {
    finishRacePlayback();
    return;
  }

  const evt = events[step];
  racePlayback.step++;

  // Update phase label
  if (evt.phase) setPhaseLabel(evt.phase);

  // Add event to log
  const log = document.getElementById('race-events');
  if (log) {
    const el = document.createElement('div');
    el.className = `race-event evt-${evt.type} ${evt.isPlayer ? 'evt-player' : ''}`;
    el.textContent = evt.text;
    log.prepend(el);
    // Limit to 15 entries
    while (log.children.length > 15) log.removeChild(log.lastChild);
  }

  // Refresh leaderboard every few events
  if (racePlayback.step % 3 === 0) {
    const lb = document.getElementById('race-leaderboard');
    if (lb) lb.innerHTML = renderLeaderboard(racePlayback.results, true);
  }

  scheduleNextEvent();
}

function setPhaseLabel(phase) {
  const el = document.getElementById('race-phase-label');
  if (el) el.textContent = PHASE_LABELS[phase] || phase;
}

function finishRacePlayback() {
  if (racePlayback.timer) clearTimeout(racePlayback.timer);

  const lb = document.getElementById('race-leaderboard');
  if (lb) lb.innerHTML = renderLeaderboard(racePlayback.results, true);
  setPhaseLabel('finish');

  const log = document.getElementById('race-events');
  if (log) {
    const el = document.createElement('div');
    el.className = 'race-event evt-finish';
    el.textContent = 'Checkered flag — race complete.';
    log.prepend(el);
  }

  // Show results modal after short delay
  setTimeout(() => {
    document.body.insertAdjacentHTML('beforeend',
      renderRaceResultsModal(racePlayback.results, racePlayback.events, racePlayback.playerResult)
    );
  }, 800);
}

// Surface what happened off-track during the race weekend
function reportLoanNotes() {
  const notes = [
    ...(game.lastDriverNotes || []).map(t => ({ t, type: 'success' })),
    ...(game.lastLoanNotes   || []).map(t => ({ t, type: t.includes('overdue') ? 'error' : 'info' })),
  ];
  notes.forEach((n, i) => setTimeout(() => toast(n.t, n.type, 6000), 400 + i * 600));
  game.lastDriverNotes = [];
  game.lastLoanNotes   = [];
}

function handleCloseResults() {
  document.getElementById('results-modal')?.remove();
  showScreen('game');
  updateHeader();
  renderTab('dashboard');
  reportLoanNotes();
}

// ─── Premier Cup career choice ────────────────────────────────
function showPremierChoiceModal() {
  document.body.insertAdjacentHTML('beforeend', renderPremierChoiceModal());
}

function selectCareerChoice(path) {
  selectedCareerPath = path;
  document.querySelectorAll('.career-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.career-card[onclick*="${path}"]`)?.classList.add('selected');
  document.getElementById('btn-confirm-career').disabled = false;

  const hiredSection = document.getElementById('hired-team-select');
  if (path === 'hired') {
    hiredSection?.classList.remove('hidden');
  } else {
    hiredSection?.classList.add('hidden');
  }
}

function confirmCareerChoice() {
  if (!selectedCareerPath) return;
  let aiTeamId = null;
  if (selectedCareerPath === 'hired') {
    aiTeamId = document.getElementById('select-ai-team')?.value;
    if (!aiTeamId) { toast('Select a team.', 'warning'); return; }
  }
  chooseCareerPath(selectedCareerPath, aiTeamId);
  document.getElementById('premier-choice-modal')?.remove();
  toast('Career path set! Good luck in the Premier Cup.', 'success');
  updateHeader();
  renderTab('dashboard');
}

// ─── Settings / save ─────────────────────────────────────────
function handleSaveGame() {
  showSaveModal();
}

function showSaveModal() {
  document.body.insertAdjacentHTML('beforeend', renderSaveModal());
}

function showLoadModal() {
  document.body.insertAdjacentHTML('beforeend', renderLoadModal());
}

function handleSaveToSlot(slot) {
  saveToSlot(slot);
  document.getElementById('save-slot-modal')?.remove();
  toast(`Saved to Slot ${slot + 1}!`, 'success');
}

function handleLoadFromSlot(slot) {
  if (loadFromSlot(slot)) {
    document.getElementById('save-slot-modal')?.remove();
    enterGame();
  } else {
    toast('Could not load save.', 'error');
  }
}

function handleDeleteSlot(slot) {
  if (!confirm(`Delete save in Slot ${slot + 1}?`)) return;
  deleteSlot(slot);
  document.getElementById('save-slot-modal')?.remove();
  showLoadModal();
}

function closeSaveModal() {
  document.getElementById('save-slot-modal')?.remove();
}

function handleNewGamePrompt() {
  if (!confirm('Start a new game? All current progress will be lost.')) return;
  deleteSave();
  location.reload();
}

// Keyboard shortcut: S to save
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    handleSaveGame();
  }
});
