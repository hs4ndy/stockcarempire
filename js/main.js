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
  if (loadGame()) {
    enterGame();
  } else {
    showScreen('intro');
  }
});

function enterGame() {
  showScreen('game');
  updateHeader();
  showTab('dashboard');
  if (game.premierChoicePending) {
    showPremierChoiceModal();
  }
}

// ─── Intro / New Game ─────────────────────────────────────────
document.getElementById('btn-start-new')?.addEventListener('click', () => {
  showScreen('setup');
});

document.getElementById('btn-load-game')?.addEventListener('click', () => {
  if (loadGame()) {
    enterGame();
  } else {
    toast('No save file found.', 'error');
  }
});

document.getElementById('btn-create-team')?.addEventListener('click', () => {
  const teamName = document.getElementById('inp-team-name').value.trim();
  const carName  = document.getElementById('inp-car-name').value.trim();
  if (!teamName) { toast('Please enter a team name.', 'warning'); return; }
  if (!carName)  { toast('Please name your first car.', 'warning'); return; }
  newGame(teamName, carName);
  toast(`Welcome to Stock Car Empire, ${teamName}!`, 'success');
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
function showUpgradeModal(carId) {
  document.getElementById('upgrade-modal-container').innerHTML = renderUpgradeModal(carId);
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
  const series = SERIES[game.currentSeries];
  const cls    = CAR_CLASSES[series.carClass];
  const upg    = cls.upgrades.find(u => u.id === upgradeId);
  toast(`${upg?.name} installed!`, 'success');
  updateHeader();
  // Re-render upgrade modal and garage
  document.getElementById('upgrade-modal-container').innerHTML = renderUpgradeModal(carId);
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

function openHireDriverModal(driverId) {
  document.getElementById('hire-driver-modal-container').innerHTML = renderHireDriverModal(driverId);
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
function handleStartRace() {
  const race  = currentRace();
  const track = TRACKS.find(t => t.id === race.trackId);
  const series = SERIES[game.currentSeries];

  // Determine which car the player is driving
  let playerCarId = null;
  if (game.driverMode === 'driver') {
    const radioSelected = document.querySelector('input[name="drive-car"]:checked');
    if (radioSelected) {
      playerCarId = radioSelected.value;
    } else {
      const driverCar = game.cars.find(c => c.assignedDriverId === 'player') || game.cars[0];
      playerCarId = driverCar?.id;
    }
    // Assign player to this car
    game.cars.forEach(c => {
      if (c.id === playerCarId) c.assignedDriverId = 'player';
      else if (c.assignedDriverId === 'player') c.assignedDriverId = null;
    });
  }

  const isHiredMode = game.driverMode === 'hired';

  // Deduct entry fee
  const entryFee = series.entryFee * Math.max(1, game.cars.length);
  if (game.money < entryFee) {
    toast(`Not enough money for entry fee (${fmt$(entryFee)}).`, 'error');
    return;
  }
  game.money -= entryFee;

  // Run simulation
  const simResult = simulateRace({ playerCarId, trackId: race.trackId, isHiredMode });

  // Apply results to standings
  applyRaceResults(simResult.results);

  // Update player result and earnings
  const pr = simResult.playerResult;
  const earnings = pr ? pr.prize : 0;

  // Mark race complete
  race.status = 'completed';
  race.playerResult = pr;
  race.playerPoints = pr ? series.points[pr.position - 1] || 0 : 0;
  race.earnings = earnings;

  postRaceUpdate(pr || { position: series.fieldSize, carId: playerCarId }, earnings);
  saveGame();

  // Show race screen with playback
  showScreen('game-race');
  document.getElementById('race-display').innerHTML = renderRaceScreen(track.name);

  startRacePlayback(simResult.results, simResult.events, simResult.playerResult);
}

function handleRaceSkipToEnd() {
  racePlayback.skipRequested = true;
  if (racePlayback.timer) clearTimeout(racePlayback.timer);
  finishRacePlayback();
}

function handleRaceSpeed() {
  racePlayback.speed = racePlayback.speed === 1 ? 3 : 1;
  const btn = document.getElementById('btn-race-speed');
  if (btn) btn.textContent = racePlayback.speed === 3 ? '⚡ Normal Speed' : '⚡ Speed Up';
}

// ─── Race Playback ────────────────────────────────────────────
const PHASE_LABELS = {
  start:  '🚦 Race Start',
  early:  '🏁 Early Stages',
  mid:    '⚙️ Mid-Race',
  late:   '🔥 Late Race',
  finish: '🏆 Final Laps',
};

function startRacePlayback(results, events, playerResult) {
  racePlayback = { results, events, playerResult, step: 0, speed: 1, timer: null, skipRequested: false };

  // Show initial grid
  const lb = document.getElementById('race-leaderboard');
  if (lb) lb.innerHTML = renderLeaderboard(results, true);
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
    el.textContent = '🏁 Checkered flag! Race complete.';
    log.prepend(el);
  }

  // Show results modal after short delay
  setTimeout(() => {
    document.body.insertAdjacentHTML('beforeend',
      renderRaceResultsModal(racePlayback.results, racePlayback.events, racePlayback.playerResult)
    );
  }, 800);
}

function handleCloseResults() {
  document.getElementById('results-modal')?.remove();
  showScreen('game');
  updateHeader();
  renderTab('dashboard');
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
  saveGame();
  toast('Game saved!', 'success');
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
