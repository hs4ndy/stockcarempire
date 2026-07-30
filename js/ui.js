// ============================================================
// STOCK CAR EMPIRE - UI Rendering
// ============================================================

// ─── Screen router ───────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('screen-' + name)?.classList.remove('hidden');
}

function showTab(tabName) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-tab="${tabName}"]`)?.classList.add('active');
  renderTab(tabName);
}

function renderTab(tabName) {
  const main = document.getElementById('main-content');
  switch (tabName) {
    case 'dashboard':  main.innerHTML = renderDashboard();   break;
    case 'garage':     main.innerHTML = renderGarage();      break;
    case 'team':       main.innerHTML = renderTeam();        break;
    case 'schedule':   main.innerHTML = renderSchedule();    break;
    case 'market':     main.innerHTML = renderMarket();      break;
    case 'standings':  main.innerHTML = renderStandings();   break;
    case 'carstats':   main.innerHTML = renderCareerStats(); break;
    default:           main.innerHTML = renderDashboard();
  }
  attachTabListeners(tabName);
}

// ─── Update header info ──────────────────────────────────────
function updateHeader() {
  if (!game) return;
  document.getElementById('hdr-money').textContent  = fmt$(game.money);
  document.getElementById('hdr-team').textContent   = game.teamName;
  const series = SERIES[game.currentSeries];
  document.getElementById('hdr-series').textContent = series.shortName;
  document.getElementById('hdr-series').style.color = series.color;
  const race = currentRace();
  const raceLabel = race
    ? `Race ${game.season.raceIndex + 1}/${game.season.calendar.length}`
    : 'Season End';
  document.getElementById('hdr-race').textContent = raceLabel;
  document.getElementById('hdr-year').textContent = `Year ${game.season.year}`;

  // Flag an unsaved career — auto-save only runs once a slot is chosen.
  const saveBtn = document.getElementById('btn-hdr-save');
  if (saveBtn) {
    const unsaved = (typeof currentSlot === 'undefined' || currentSlot === null);
    saveBtn.textContent = unsaved ? 'Save *' : 'Save';
    saveBtn.title = unsaved
      ? 'Not saved yet — choose a slot to enable auto-save (Ctrl+S)'
      : `Auto-saving to Slot ${currentSlot + 1} (Ctrl+S)`;
    saveBtn.classList.toggle('btn-unsaved', unsaved);
  }
}

// ─── Notifications / toasts ──────────────────────────────────
function toast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.classList.add('show'), 50);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, duration);
}

// ─── Stat bar HTML ────────────────────────────────────────────
function statBar(label, value, max = 100, color = '') {
  const pct = Math.round((value / max) * 100);
  const cls = color || (pct >= 70 ? 'bar-green' : pct >= 40 ? 'bar-yellow' : 'bar-red');
  return `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <div class="stat-bar-wrap">
        <div class="stat-bar ${cls}" style="width:${pct}%"></div>
      </div>
      <span class="stat-value">${value}</span>
    </div>`;
}

function condBar(val) {
  const pct = Math.round(val);
  const cls = pct >= 70 ? 'bar-green' : pct >= 40 ? 'bar-yellow' : 'bar-red';
  return `
    <div class="stat-row">
      <span class="stat-label">Condition</span>
      <div class="stat-bar-wrap">
        <div class="stat-bar ${cls}" style="width:${pct}%"></div>
      </div>
      <span class="stat-value">${pct}%</span>
    </div>`;
}

// ─── Dashboard ───────────────────────────────────────────────
function renderDashboard() {
  const series   = SERIES[game.currentSeries];
  const race     = currentRace();
  const track    = race ? TRACKS.find(t => t.id === race.trackId) : null;
  const pos      = getPlayerStandingPos();
  const sorted   = getStandings();
  const totalEntrants = sorted.length;
  const playerEntry  = sorted.find(e => e.id === 'player');
  const seasonOver   = isSeasonOver();
  const expenses     = weeklyExpenses();
  const income       = weeklySponsorIncome();

  const topStandings = sorted.slice(0, 8).map((e, i) => {
    const cls = e.isPlayer ? 'standing-row player-row' : 'standing-row';
    return `<div class="${cls}">
      <span class="pos-num">${i + 1}</span>
      <span class="entry-name">${e.isPlayer ? game.teamName : e.name}</span>
      <span class="pts-val">${e.points} pts</span>
    </div>`;
  }).join('');

  const racesCompleted = game.season.calendar.filter(r => r.status === 'completed').length;

  const net = income - expenses;
  const nextRaceLabel = seasonOver ? '—' : `${race.raceNum} / ${game.season.calendar.length}`;

  return `
  <!-- Command Strip -->
  <div class="cmd-strip">
    <div class="cmd-cell">
      <span class="cmd-label">Championship</span>
      <span class="cmd-value gold">${pos}${ordinal(pos)}</span>
      <span class="cmd-sub">of ${totalEntrants} teams</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Points</span>
      <span class="cmd-value">${playerEntry?.points || 0}</span>
      <span class="cmd-sub">${playerEntry?.wins || 0} wins this season</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Cash</span>
      <span class="cmd-value gold">${fmt$(game.money)}</span>
      <span class="cmd-sub ${net >= 0 ? 'green' : 'red'}">${net >= 0 ? '+' : ''}${fmt$(net)} / race</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Series</span>
      <span class="cmd-value" style="color:${series.color};font-size:1.1rem">${series.name}</span>
      <span class="cmd-sub">Year ${game.season.year}</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Race</span>
      <span class="cmd-value">${nextRaceLabel}</span>
      <span class="cmd-sub">${seasonOver ? 'Season complete' : (track?.name || '—')}</span>
    </div>
  </div>

  <div class="dashboard-grid">

    <!-- Next Race / Season End -->
    <div class="card">
      <div class="card-header">${seasonOver ? 'Season Complete' : 'Next Race'}</div>
      ${seasonOver ? `
        <div class="race-spotlight">
          <span class="race-spotlight-name">Final Standing: ${pos}${ordinal(pos)}</span>
          <span class="race-spotlight-meta">${series.name} · Year ${game.season.year}</span>
        </div>
        ${pos <= series.promotionSpots && series.level < 2
          ? `<div style="margin-bottom:.75rem"><span class="badge badge-green">PROMOTION ELIGIBLE</span></div>` : ''}
        ${series.relegationSpots > 0 && pos > totalEntrants - series.relegationSpots
          ? `<div style="margin-bottom:.75rem"><span class="badge badge-red">RELEGATION ZONE</span></div>` : ''}
        <button class="btn btn-primary" onclick="handleEndSeason()">Begin Off-Season</button>
      ` : `
        <div class="race-spotlight">
          <span class="race-spotlight-name">${track?.name || 'TBD'}</span>
          <span class="race-spotlight-meta">${formatTrackType(track?.type)} · ${track?.length} mi · ${track?.laps} laps</span>
        </div>
        <div class="team-stat"><span>Entry Fee</span><span class="red">${fmt$(series.entryFee)}</span></div>
        <div class="team-stat"><span>1st Prize</span><span class="green">${fmt$(series.prize[0])}</span></div>
        <div class="btn-row mt">
          <button class="btn btn-primary" onclick="handleOpenRaceWeekend()">Race Weekend</button>
          <button class="btn btn-ghost" onclick="handleSkipRace()">Skip</button>
        </div>
      `}
    </div>

    <!-- Championship Standings -->
    <div class="card">
      <div class="card-header">Championship Standings</div>
      <div class="season-progress-bar-wrap">
        <div class="season-progress-bar" style="width:${Math.round(racesCompleted / game.season.calendar.length * 100)}%"></div>
      </div>
      <p class="muted-text small" style="margin-bottom:.75rem">${racesCompleted} / ${game.season.calendar.length} races complete</p>
      <div class="standings-mini">${topStandings}</div>
      ${sorted.length > 8 ? `<p class="muted-text small mt"><a class="link" onclick="showTab('standings')">Full standings</a></p>` : ''}
    </div>

    <!-- Finances -->
    <div class="card">
      <div class="card-header">Finances</div>
      <div class="team-stat"><span>Cash</span><span class="highlight">${fmt$(game.money)}</span></div>
      <div class="team-stat"><span>Sponsor Income</span><span class="green">+${fmt$(income)}/race</span></div>
      <div class="team-stat"><span>Staff Costs</span><span class="red">-${fmt$(expenses)}/race</span></div>
      <div class="team-stat"><span>Net</span><span class="${net >= 0 ? 'green' : 'red'}">${net >= 0 ? '+' : ''}${fmt$(net)}/race</span></div>
      <div class="team-stat"><span>Sponsors</span><span>${game.activeSponsors.length} active</span></div>
      <div class="team-stat"><span>Staff</span><span>${game.staff.length + game.hiredDrivers.length} on payroll</span></div>
    </div>

    <!-- Garage -->
    <div class="card">
      <div class="card-header">Your Garage</div>
      ${game.cars.map(car => {
        const score = effectiveCarScore(car);
        const condPct = Math.round(car.condition);
        const condColor = condPct >= 70 ? 'var(--green)' : condPct >= 40 ? 'var(--gold)' : 'var(--red)';
        return `<div class="car-mini-row">
          <span class="car-mini-name">${car.name}</span>
          <div style="flex:1;height:4px;background:#1a1a1a;border-radius:0;overflow:hidden">
            <div style="width:${condPct}%;height:100%;background:${condColor}"></div>
          </div>
          <span class="car-mini-score">${condPct}%</span>
        </div>`;
      }).join('')}
      <a class="link mt" onclick="showTab('garage')">Manage</a>
    </div>

    <!-- Driver Profile -->
    <div class="card">
      <div class="card-header">Driver Profile</div>
      <div class="team-stat"><span>Driver</span><span class="highlight">${game.driverName || game.teamName}</span></div>
      ${game.driverMode === 'hired' ? `
        <div class="team-stat"><span>Team</span><span>${game.season.aiTeams.find(t=>t.id===game.hiredTeamId)?.name || '—'}</span></div>
        <div class="team-stat"><span>Salary</span><span class="green">${fmt$(game.hiredSalary || 0)}/week</span></div>
      ` : game.driverMode === 'manager' ? `
        <div class="team-stat"><span>Role</span><span>Team Manager</span></div>
      ` : `<div class="team-stat"><span>Role</span><span>Driver / Owner</span></div>`}
      ${statBar('Driver Skill', Math.round(game.playerSkill))}
      <div class="team-stat" style="margin-top:.5rem"><span>Seasons Raced</span><span>${game.history.length}</span></div>
      ${game.history.length > 0 ? game.history.slice(-3).map(h => `
        <div class="team-stat">
          <span>Yr ${h.year} ${h.series.split(' ')[0]}</span>
          <span>${h.finalPos}${ordinal(h.finalPos)} · ${h.wins}W</span>
        </div>`).join('') : ''}
    </div>

    <!-- Season Calendar snapshot -->
    <div class="card">
      <div class="card-header">Recent Results</div>
      ${game.season.calendar.filter(r => r.status === 'completed').slice(-5).reverse().map(r => {
        const t = TRACKS.find(tr => tr.id === r.trackId);
        const pos2 = r.playerResult?.position;
        const posStr = pos2 ? `P${pos2}` : 'Skipped';
        const col = pos2 === 1 ? 'var(--gold)' : pos2 <= 5 ? 'var(--green)' : pos2 ? 'var(--text)' : '#555';
        return `<div class="team-stat">
          <span>Race ${r.raceNum} · ${t?.name || '?'}</span>
          <span style="color:${col};font-weight:700">${posStr}${pos2 ? ' · ' + fmt$(r.earnings) : ''}</span>
        </div>`;
      }).join('') || '<p class="muted-text small">No races completed yet.</p>'}
    </div>

  </div>`;
}

function trackTypeBadge(type) {
  switch(type) {
    case 'short_oval':   return 'orange';
    case 'intermediate': return 'blue';
    case 'superspeedway':return 'red';
    case 'road_course':  return 'green';
    default: return 'gray';
  }
}
function formatTrackType(type) {
  return type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
}

// ─── Garage ──────────────────────────────────────────────────
function renderGarage() {
  const series = SERIES[game.currentSeries];
  const cls    = CAR_CLASSES[series.carClass];

  const carCards = game.cars.map(car => {
    const upgAvail = cls.upgrades.filter(u =>
      !car.appliedUpgrades.includes(u.id) &&
      (!u.prereq || car.appliedUpgrades.includes(u.prereq))
    );
    const repairCost = Math.round((100 - car.condition) * cls.repairCostPerPoint * (game.staff.some(s=>s.typeId==='mechanic') ? 0.75 : 1));
    const driverName = car.assignedDriverId === 'player'
      ? `You (Skill ${Math.round(game.playerSkill)})`
      : car.assignedDriverId
        ? HIREABLE_DRIVERS.find(d => d.id === car.assignedDriverId)?.name || 'Unknown'
        : 'No Driver';

    return `
    <div class="car-card" id="car-${car.id}">
      <div class="car-card-header">
        <span class="car-name">${car.name}</span>
        <span class="car-class-badge">${cls.name}</span>
      </div>
      <div class="car-stats">
        ${statBar('Speed', car.speed)}
        ${statBar('Handling', car.handling)}
        ${statBar('Reliability', car.reliability)}
        ${condBar(car.condition)}
      </div>
      <div class="car-meta">
        <div class="team-stat"><span>Driver</span><span>${driverName}</span></div>
        <div class="team-stat"><span>Races</span><span>${car.races}</span></div>
        <div class="team-stat"><span>Wins</span><span>${car.wins}</span></div>
        <div class="team-stat"><span>Upgrades</span><span>${car.appliedUpgrades.length}/${cls.upgrades.length}</span></div>
      </div>
      <div class="car-actions">
        ${car.condition < 100 ? `<button class="btn btn-sm btn-warning" onclick="handleRepair('${car.id}', ${repairCost})">Repair (${fmt$(repairCost)})</button>` : `<button class="btn btn-sm" disabled>Perfect Condition</button>`}
        <button class="btn btn-sm btn-primary" onclick="showUpgradeModal('${car.id}')">Upgrades</button>
        <button class="btn btn-sm btn-ghost" onclick="handleRenameCar('${car.id}')">Rename</button>
        ${game.cars.length > 1 ? `<button class="btn btn-sm btn-danger" onclick="handleSellCar('${car.id}')">Sell</button>` : ''}
      </div>
      <div class="car-color-row">
        <span class="stat-label">Car Color</span>
        ${['#e8001d','#3498db','#2ecc71','#f39c12','#9b59b6','#ffffff','#222222','#ff6600','#00cccc','#ff69b4'].map(c =>
          `<button class="color-swatch${(car.color||'#e8001d')===c?' active':''}" style="background:${c}" onclick="setCarColor('${car.id}','${c}');renderTab('garage')" title="${c}"></button>`
        ).join('')}
      </div>
    </div>`;
  }).join('');

  return `
  <div class="page-header">
    <h2>Garage</h2>
    <button class="btn btn-primary" onclick="showTab('market')">Buy New Car (${fmt$(cls.buyCost)})</button>
  </div>
  <div class="car-grid">${carCards}</div>
  <div id="upgrade-modal-container"></div>`;
}

function renderUpgradeModal(carId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return '';
  const series = SERIES[game.currentSeries];
  const cls    = CAR_CLASSES[car.classId];

  const rows = cls.upgrades.map(upg => {
    const installed = car.appliedUpgrades.includes(upg.id);
    const prereqMet = !upg.prereq || car.appliedUpgrades.includes(upg.prereq);
    const canBuy    = !installed && prereqMet && game.money >= upg.cost;
    const effectStr = Object.entries(upg.effect).map(([k,v]) => `+${v} ${k}`).join(', ');

    return `<div class="upgrade-row ${installed ? 'installed' : ''}">
      <div class="upgrade-info">
        <span class="upgrade-name">${upg.name}</span>
        <span class="upgrade-effect">${effectStr}</span>
        ${upg.prereq ? `<span class="upgrade-prereq muted-text">Requires: ${cls.upgrades.find(u=>u.id===upg.prereq)?.name}</span>` : ''}
      </div>
      <div class="upgrade-action">
        ${installed
          ? `<span class="badge badge-green">Installed</span>`
          : canBuy
            ? `<button class="btn btn-sm btn-primary" onclick="handleUpgrade('${carId}','${upg.id}')">${fmt$(upg.cost)}</button>`
            : `<button class="btn btn-sm" disabled>${fmt$(upg.cost)}</button>`
        }
      </div>
    </div>`;
  }).join('');

  return `
  <div class="modal-overlay" id="upgrade-modal" onclick="closeUpgradeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3>Upgrades — ${car.name}</h3>
        <button class="modal-close" onclick="closeUpgradeModal()">Close</button>
      </div>
      <div class="modal-body upgrade-list">${rows}</div>
    </div>
  </div>`;
}

// ─── Team ────────────────────────────────────────────────────
function renderTeam() {
  const hiredIds = new Set(game.hiredDrivers.map(h => h.driverId));

  const yourDriverRows = game.hiredDrivers.map(h => {
    const d   = HIREABLE_DRIVERS.find(dr => dr.id === h.driverId);
    const car = game.cars.find(c => c.id === h.carId);
    if (!d) return '';
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${d.name}</span>
        <div class="staff-meta">Skill ${d.skill} • Aggression ${d.aggression} • ${fmt$(h.weeklyCost)}/week</div>
        <div class="staff-meta muted-text">Driving: ${car ? car.name : 'Unassigned'}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="handleFireDriver('${d.id}')">Release</button>
    </div>`;
  }).join('') || '<p class="muted-text">No hired drivers — you drive yourself.</p>';

  const staffRows = game.staff.map(s => {
    const type = STAFF_TYPES.find(t => t.id === s.typeId);
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${s.name}</span>
        <div class="staff-meta">${type?.bonus || ''} • ${fmt$(s.weeklyCost)}/week</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="handleFireStaff('${s.id}')">Fire</button>
    </div>`;
  }).join('') || '<p class="muted-text">No support staff hired.</p>';

  const availableDrivers = HIREABLE_DRIVERS.filter(d => !hiredIds.has(d.id));
  const driverRows = availableDrivers.map(d => {
    const signingFee = d.weeklyCost * 4;
    const canAfford  = game.money >= signingFee;
    // Only show hire button if there are cars without drivers
    const freeCar = game.cars.find(c => !game.hiredDrivers.find(h => h.carId === c.id) && c.assignedDriverId !== 'player');
    // If player is driving one car, look for cars available
    const hasFreeSlot = game.cars.length > 1;

    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${d.name}</span>
        <div class="staff-meta">Skill ${d.skill} • Aggression ${d.aggression}</div>
        <div class="staff-meta muted-text">${fmt$(d.weeklyCost)}/week • Signing: ${fmt$(signingFee)}</div>
      </div>
      ${canAfford ? `<button class="btn btn-sm btn-primary" onclick="openHireDriverModal('${d.id}')">Hire</button>`
                  : `<button class="btn btn-sm" disabled>Can't afford</button>`}
    </div>`;
  }).join('');

  const staffHireRows = STAFF_TYPES.map(type => {
    const current = game.staff.filter(s => s.typeId === type.id).length;
    const cost    = type.weeklyCost[game.currentSeries];
    const sigFee  = cost * 4;
    const canHire = current < type.max && game.money >= sigFee;
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${type.name}</span>
        <div class="staff-meta">${type.description}</div>
        <div class="staff-meta muted-text">${fmt$(cost)}/week • Signing fee: ${fmt$(sigFee)} • Hired: ${current}/${type.max}</div>
      </div>
      ${canHire ? `<button class="btn btn-sm btn-primary" onclick="handleHireStaff('${type.id}')">Hire (${fmt$(sigFee)})</button>`
               : `<button class="btn btn-sm" disabled>${current >= type.max ? 'Max Hired' : 'Can\'t afford'}</button>`}
    </div>`;
  }).join('');

  return `
  <div class="page-header"><h2>Team Management</h2></div>
  <div class="two-col-grid">
    <div>
      <div class="card">
        <div class="card-header">Your Drivers</div>
        ${yourDriverRows}
      </div>
      <div class="card mt">
        <div class="card-header">Your Support Staff</div>
        ${staffRows}
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-header">Hire Drivers</div>
        <p class="muted-text small">Hire drivers for your extra cars. Signing fee = 4 weeks' salary.</p>
        ${driverRows}
      </div>
      <div class="card mt">
        <div class="card-header">Hire Support Staff</div>
        ${staffHireRows}
      </div>
    </div>
  </div>
  <div id="hire-driver-modal-container"></div>`;
}

function renderHireDriverModal(driverId) {
  const d = HIREABLE_DRIVERS.find(dr => dr.id === driverId);
  if (!d) return '';
  const freeCars = game.cars.filter(c => {
    if (c.assignedDriverId === 'player') return false;
    return !game.hiredDrivers.find(h => h.carId === c.id);
  });
  if (freeCars.length === 0) {
    return `<div class="modal-overlay" id="hire-modal" onclick="closeHireModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header"><h3>Hire ${d.name}</h3><button class="modal-close" onclick="closeHireModal()">Close</button></div>
        <div class="modal-body"><p>No free cars available. Buy more cars or release an existing driver first.</p></div>
      </div>
    </div>`;
  }
  const carOpts = freeCars.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  return `<div class="modal-overlay" id="hire-modal" onclick="closeHireModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header"><h3>Hire ${d.name}</h3><button class="modal-close" onclick="closeHireModal()">Close</button></div>
      <div class="modal-body">
        <p>Skill: ${d.skill} | Aggression: ${d.aggression}</p>
        <p>${fmt$(d.weeklyCost)}/week | Signing fee: ${fmt$(d.weeklyCost*4)}</p>
        <label class="form-label">Assign to car:</label>
        <select id="hire-car-select" class="form-select">${carOpts}</select>
        <div class="btn-row mt">
          <button class="btn btn-primary" onclick="confirmHireDriver('${driverId}')">Hire Driver</button>
          <button class="btn btn-ghost" onclick="closeHireModal()">Cancel</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ─── Schedule ────────────────────────────────────────────────
function renderSchedule() {
  const series = SERIES[game.currentSeries];
  const rows = game.season.calendar.map((race, i) => {
    const track = TRACKS.find(t => t.id === race.trackId);
    let statusBadge = '';
    let resultInfo  = '';

    if (race.status === 'completed') {
      const pos = race.playerResult?.position;
      statusBadge = `<span class="badge badge-blue">Completed</span>`;
      resultInfo  = pos ? `P${pos} · ${fmt$(race.earnings)} · ${race.playerPoints}pts` : '';
    } else if (race.status === 'skipped') {
      statusBadge = `<span class="badge badge-gray">Skipped</span>`;
    } else if (i === game.season.raceIndex) {
      statusBadge = `<span class="badge badge-green">NEXT</span>`;
    } else {
      statusBadge = `<span class="badge badge-gray">Upcoming</span>`;
    }

    return `<div class="schedule-row ${i === game.season.raceIndex ? 'next-race' : ''}">
      <span class="race-num">${race.raceNum}</span>
      <div class="race-details">
        <span class="race-track">${track?.name || 'Unknown'}</span>
        <span class="race-type muted-text">${formatTrackType(track?.type)} · ${track?.length}mi · ${track?.laps} laps</span>
      </div>
      ${statusBadge}
      <span class="race-result muted-text">${resultInfo}</span>
    </div>`;
  }).join('');

  const completedRaces = game.season.calendar.filter(r => r.status === 'completed');
  const wins   = completedRaces.filter(r => r.playerResult?.position === 1).length;
  const top5   = completedRaces.filter(r => r.playerResult?.position <= 5).length;
  const top10  = completedRaces.filter(r => r.playerResult?.position <= 10).length;
  const totalEarnings = completedRaces.reduce((s, r) => s + (r.earnings || 0), 0);

  return `
  <div class="page-header"><h2>${series.name} — Year ${game.season.year} Schedule</h2></div>
  <div class="season-stats-bar">
    <div class="season-stat"><span class="ss-num">${completedRaces.length}</span><span>Races</span></div>
    <div class="season-stat"><span class="ss-num">${wins}</span><span>Wins</span></div>
    <div class="season-stat"><span class="ss-num">${top5}</span><span>Top 5</span></div>
    <div class="season-stat"><span class="ss-num">${top10}</span><span>Top 10</span></div>
    <div class="season-stat"><span class="ss-num">${fmt$(totalEarnings)}</span><span>Earned</span></div>
  </div>
  <div class="schedule-list">${rows}</div>`;
}

// ─── Market ──────────────────────────────────────────────────
function renderMarket() {
  const series   = SERIES[game.currentSeries];
  const cls      = CAR_CLASSES[series.carClass];
  const canBuy   = game.money >= cls.buyCost;

  const availableSponsors = SPONSOR_DEALS.filter(d =>
    d.level <= game.currentSeries && !game.activeSponsors.includes(d.id)
  );
  const sponsorRows = availableSponsors.map(d => `
    <div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${d.name}</span>
        <div class="staff-meta">Base: ${fmt$(d.weekly)}/race · Bonus: ${fmt$(d.bonus)} if ${d.cond}</div>
      </div>
      ${game.activeSponsors.length < 3
        ? `<button class="btn btn-sm btn-primary" onclick="handleSignSponsor('${d.id}')">Sign Deal</button>`
        : `<button class="btn btn-sm" disabled>Max sponsors</button>`}
    </div>`).join('') || '<p class="muted-text">No new sponsors available right now.</p>';

  const activeSponsors = game.activeSponsors.map(sid => {
    const d = SPONSOR_DEALS.find(s => s.id === sid);
    if (!d) return '';
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${d.name}</span>
        <div class="staff-meta">Base: ${fmt$(d.weekly)}/race · Bonus: ${fmt$(d.bonus)} if ${d.cond}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="handleDropSponsor('${d.id}')">Drop</button>
    </div>`;
  }).join('') || '<p class="muted-text">No active sponsors.</p>';

  return `
  <div class="page-header"><h2>Market</h2></div>
  <div class="two-col-grid">
    <div>
      <div class="card">
        <div class="card-header">Buy a Car</div>
        <p class="muted-text">${cls.description}</p>
        <div class="team-stat"><span>Cost</span><span class="highlight">${fmt$(cls.buyCost)}</span></div>
        <div class="team-stat"><span>Sell Value</span><span>${fmt$(cls.sellValue)}</span></div>
        <div class="team-stat"><span>Base Speed</span><span>${cls.baseStats.speed}</span></div>
        <div class="team-stat"><span>Base Handling</span><span>${cls.baseStats.handling}</span></div>
        <div class="team-stat"><span>Base Reliability</span><span>${cls.baseStats.reliability}</span></div>
        ${canBuy
          ? `<button class="btn btn-primary mt" onclick="handleBuyCar()">Buy Car (${fmt$(cls.buyCost)})</button>`
          : `<button class="btn mt" disabled>Not enough money (need ${fmt$(cls.buyCost)})</button>`}
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-header">Active Sponsors</div>
        ${activeSponsors}
      </div>
      <div class="card mt">
        <div class="card-header">Available Sponsors</div>
        <p class="muted-text small">Sponsors pay you every race. Max 3 active deals.</p>
        ${sponsorRows}
      </div>
    </div>
  </div>`;
}

// ─── Standings ───────────────────────────────────────────────
function renderStandings() {
  const series = SERIES[game.currentSeries];
  const sorted = getStandings();

  const rows = sorted.map((e, i) => {
    const pos = i + 1;
    const isPromo = pos <= series.promotionSpots && series.level < 2;
    const isRele  = series.relegationSpots > 0 && pos > sorted.length - series.relegationSpots;
    const cls     = e.isPlayer ? 'standings-row player-standing' : 'standings-row';
    return `<div class="${cls}">
      <span class="st-pos ${isPromo ? 'promo-pos' : isRele ? 'rele-pos' : ''}">${pos}</span>
      <span class="st-name">${e.isPlayer ? game.teamName : e.name}</span>
      <span class="st-races">${e.races}</span>
      <span class="st-wins">${e.wins}</span>
      <span class="st-top5">${e.top5}</span>
      <span class="st-pts">${e.points}</span>
      ${isPromo ? `<span class="badge badge-green">PROMO</span>` : ''}
      ${isRele  ? `<span class="badge badge-red">REL</span>` : ''}
    </div>`;
  }).join('');

  return `
  <div class="page-header"><h2>${series.name} — Championship Standings</h2></div>
  <div class="card">
    <div class="standings-header standings-row">
      <span class="st-pos">Pos</span>
      <span class="st-name">Driver / Team</span>
      <span class="st-races">Races</span>
      <span class="st-wins">Wins</span>
      <span class="st-top5">Top 5</span>
      <span class="st-pts">Points</span>
    </div>
    ${rows}
  </div>
  ${series.promotionSpots > 0 ? `<p class="muted-text small mt">Top ${series.promotionSpots} earn promotion to ${SERIES[series.level+1]?.name}</p>` : ''}
  ${series.relegationSpots > 0 ? `<p class="muted-text small">Bottom ${series.relegationSpots} may be relegated</p>` : ''}`;
}

// ─── Race Weekend ────────────────────────────────────────────
function renderRaceSetup() {
  const race   = currentRace();
  const track  = TRACKS.find(t => t.id === race.trackId);
  const series = SERIES[game.currentSeries];

  // Which cars can the player enter?
  const cars = game.driverMode === 'hired' ? [] : game.cars;

  const isHired    = game.driverMode === 'hired';
  const isManager  = game.driverMode === 'manager';

  let carSection = '';
  if (isHired) {
    const team = game.season.aiTeams.find(t => t.id === game.hiredTeamId);
    carSection = `<p>You will drive for <strong>${team?.name || 'your team'}</strong>.</p>`;
  } else if (isManager) {
    carSection = `<p>Your team enters all cars. Drivers are assigned automatically.</p>
    ${game.cars.map(c => {
      const d = c.assignedDriverId && c.assignedDriverId !== 'player'
        ? HIREABLE_DRIVERS.find(dr => dr.id === c.assignedDriverId)?.name : 'No Driver';
      return `<div class="team-stat"><span>${c.name}</span><span>${d || 'Needs driver'}</span></div>`;
    }).join('')}`;
  } else {
    // Player drives one car
    const driverCar = cars.find(c => c.assignedDriverId === 'player') || cars[0];
    carSection = `
      <p class="muted-text">Select which car you will drive:</p>
      ${cars.map(c => `
        <label class="radio-row">
          <input type="radio" name="drive-car" value="${c.id}" ${c === driverCar ? 'checked' : ''}>
          <span>${c.name} — Speed ${c.speed}, Handling ${c.handling}, Condition ${Math.round(c.condition)}%</span>
        </label>`).join('')}
    `;
  }

  return `
  <div class="race-setup-page">
    <div class="card">
      <div class="card-header">Race Weekend</div>
      <div class="race-info-box big">
        <span class="race-track-name big">${track.name}</span>
        <span class="badge badge-${trackTypeBadge(track.type)}">${formatTrackType(track.type)}</span>
      </div>
      <div class="race-details-grid">
        <div class="team-stat"><span>Track Length</span><span>${track.length} miles</span></div>
        <div class="team-stat"><span>Laps</span><span>${track.laps}</span></div>
        <div class="team-stat"><span>Entry Fee</span><span>${fmt$(series.entryFee)}</span></div>
        <div class="team-stat"><span>1st Prize</span><span>${fmt$(series.prize[0])}</span></div>
        <div class="team-stat"><span>Speed Emphasis</span><span>${Math.round(track.speedW * 10)}/10</span></div>
        <div class="team-stat"><span>Handling Emphasis</span><span>${Math.round(track.handW * 10)}/10</span></div>
      </div>
    </div>
    <div class="card mt">
      <div class="card-header">Car Selection</div>
      ${carSection}
    </div>
    <div class="btn-row mt">
      <button class="btn btn-primary btn-lg" id="btn-start-race" onclick="handleStartRace()">Race</button>
      <button class="btn btn-ghost btn-lg" onclick="handleSimulateRace()">Simulate</button>
      <button class="btn btn-ghost" onclick="handleSkipRace()">Skip</button>
      <button class="btn btn-ghost" onclick="showScreen('game')">Cancel</button>
    </div>
  </div>`;
}

// ─── Race Display (live) ──────────────────────────────────────
function renderRaceScreen(trackName) {
  return `
  <div class="race-screen">
    <div class="race-header">
      <h2 id="race-title">${trackName}</h2>
      <div id="race-phase-label" class="race-phase">Pre-Race</div>
    </div>
    <div class="race-main">
      <div class="race-left">
        <div class="card">
          <div class="card-header">Leaderboard</div>
          <div id="race-leaderboard">Loading...</div>
        </div>
      </div>
      <div class="race-right">
        <div class="card">
          <div class="card-header">Race Events</div>
          <div id="race-events" class="race-events-log"></div>
        </div>
      </div>
    </div>
    <div class="race-footer">
      <button class="btn btn-primary" id="btn-race-skip" onclick="handleRaceSkipToEnd()">Skip to End</button>
      <button class="btn btn-ghost" id="btn-race-speed" onclick="handleRaceSpeed()">Speed Up</button>
    </div>
  </div>`;
}

function renderLeaderboard(results, highlightPlayer) {
  return results.slice(0, 15).map(r => `
    <div class="lb-row ${r.isPlayer ? 'lb-player' : ''}">
      <span class="lb-pos">${r.position}</span>
      <div class="lb-dot" style="background:${r.teamColor}"></div>
      <span class="lb-name">${r.displayName.split(' / ').pop()}</span>
      ${r.dnf ? '<span class="badge badge-red lb-badge">DNF</span>' : ''}
    </div>`).join('');
}

// ─── Race Results modal ───────────────────────────────────────
function renderRaceResultsModal(results, events, playerResult) {
  const series  = SERIES[game.currentSeries];
  const topRows = results.slice(0, 10).map(r => `
    <div class="result-row ${r.isPlayer ? 'player-result' : ''}">
      <span class="res-pos ${r.position <= 3 ? 'podium' : ''}">${r.position}</span>
      <span class="res-name">${r.displayName}</span>
      <span class="res-pts">${r.points}pts</span>
      <span class="res-prize green">${fmt$(r.prize)}</span>
      ${r.dnf ? '<span class="badge badge-red">DNF</span>' : ''}
    </div>`).join('');

  let playerSection = '';
  if (playerResult) {
    const pos = playerResult.position;
    const label = pos === 1 ? 'VICTORY LANE' : pos <= 3 ? 'PODIUM FINISH' : `P${pos} FINISH`;
    playerSection = `
      <div class="player-result-hero">
        <div class="big-pos-label">${label}</div>
        <div>
          <div class="big-pos">${pos}${ordinal(pos)} place</div>
          <div class="big-prize green">${fmt$(playerResult.prize)} earned</div>
          <div class="muted-text">${playerResult.points} championship points</div>
        </div>
      </div>`;
  }

  return `
  <div class="modal-overlay" id="results-modal">
    <div class="modal modal-wide">
      <div class="modal-header">
        <h3>Race Results</h3>
      </div>
      <div class="modal-body">
        ${playerSection}
        <div class="card-header mt">Top 10 Finishers</div>
        <div class="results-list">${topRows}</div>
        ${results.length > 10 ? `<p class="muted-text small">${results.length - 10} more finishers...</p>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="btn-close-results" onclick="handleCloseResults()">Continue</button>
      </div>
    </div>
  </div>`;
}

// ─── End of Season / Premier Choice ─────────────────────────
function renderEndSeasonModal(info) {
  return `
  <div class="modal-overlay" id="end-season-modal">
    <div class="modal">
      <div class="modal-header"><h3>Season Over</h3></div>
      <div class="modal-body">
        <p class="highlight">${info.message}</p>
        ${info.promoted ? `<div class="achievement-badge">PROMOTED</div>` : ''}
        ${info.relegated ? `<div class="achievement-badge rele">RELEGATED</div>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="handleDismissEndSeason()">Start Next Season</button>
      </div>
    </div>
  </div>`;
}

function renderPremierChoiceModal() {
  const aiTeams = game.season.aiTeams.slice(0, 6);
  const teamOpts = aiTeams.map(t =>
    `<option value="${t.id}">${t.name}</option>`
  ).join('');

  return `
  <div class="modal-overlay" id="premier-choice-modal">
    <div class="modal modal-wide">
      <div class="modal-header"><h3>Welcome to the Premier Cup</h3></div>
      <div class="modal-body">
        <p>You've reached the top tier of stock car racing. How do you want to continue your career?</p>
        <div class="career-choices">
          <div class="career-card" onclick="selectCareerChoice('driver')">
            <div class="career-icon">01</div>
            <div class="career-title">Stay as Driver</div>
            <div class="career-desc">Drive one of your own cars each race. Compete for the championship yourself.</div>
          </div>
          <div class="career-card" onclick="selectCareerChoice('manager')">
            <div class="career-icon">02</div>
            <div class="career-title">Become a Manager</div>
            <div class="career-desc">Step back from driving. Run the team from the pit wall. Hire drivers for all your cars.</div>
          </div>
          <div class="career-card" onclick="selectCareerChoice('hired')">
            <div class="career-icon">03</div>
            <div class="career-title">Drive for Another Team</div>
            <div class="career-desc">Join an established team, collect a weekly salary, and leave the management headaches behind.</div>
          </div>
        </div>
        <div id="hired-team-select" class="hidden mt">
          <label class="form-label">Choose a team to drive for:</label>
          <select id="select-ai-team" class="form-select">${teamOpts}</select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="btn-confirm-career" onclick="confirmCareerChoice()" disabled>Confirm Choice</button>
      </div>
    </div>
  </div>`;
}

// ─── Career Stats ─────────────────────────────────────────────
function renderCareerStats() {
  if (!game) return '';
  const rep = game.reputation || 50;
  const repLabel = rep >= 80 ? 'Legend' : rep >= 60 ? 'Respected' : rep >= 40 ? 'Known' : rep >= 20 ? 'Rookie' : 'Unknown';
  const repCls   = rep >= 60 ? 'bar-green' : rep >= 40 ? 'bar-yellow' : 'bar-red';

  const histRows = (game.history || []).map(h => `
    <div class="result-row">
      <span class="res-pos">Year ${h.year}</span>
      <span class="res-name">${h.series}</span>
      <span class="res-pts">${h.finalPos}${ordinal(h.finalPos)}</span>
      <span class="res-prize">${h.wins} W</span>
    </div>`).join('') || '<p class="muted-text">No completed seasons yet.</p>';

  const carRows = game.cars.map(car => `
    <div class="car-card" style="margin-bottom:1rem">
      <div class="car-card-header">
        <span class="car-name">#${car.number || 1} ${car.name}</span>
        <span class="car-class-badge" style="background:${car.color||'#e8001d'}">&nbsp;</span>
      </div>
      <div class="car-meta">
        <div class="team-stat"><span>Number</span>
          <span><button class="btn btn-sm btn-ghost" onclick="handleSetCarNumber('${car.id}')">#${car.number || 1} Change</button></span>
        </div>
        <div class="team-stat"><span>Color</span>
          <span>${['#e8001d','#3498db','#2ecc71','#f39c12','#9b59b6','#ffffff','#222222','#ff6600','#00cccc','#ff69b4'].map(c =>
            `<button class="color-swatch${(car.color||'#e8001d')===c?' active':''}" style="background:${c};margin:1px" onclick="setCarColor('${car.id}','${c}');renderTab('carstats')" title="${c}"></button>`
          ).join('')}</span>
        </div>
        <div class="team-stat"><span>Wins</span><span>${car.wins || 0}</span></div>
        <div class="team-stat"><span>Races</span><span>${car.races || 0}</span></div>
        <div class="team-stat"><span>Points</span><span>${car.totalPoints || 0}</span></div>
      </div>
    </div>`).join('');

  const sorted = getStandings();
  const standRows = sorted.map((e, i) => `
    <div class="result-row ${e.isPlayer ? 'player-result' : ''}">
      <span class="res-pos ${i < 3 ? 'podium' : ''}">${i + 1}</span>
      <span class="res-name">${e.name}</span>
      <span class="res-pts">${e.points} pts</span>
      <span class="res-prize">${e.wins}W ${e.top5}T5</span>
    </div>`).join('');

  return `
  <div class="page-header"><h2>Career Stats</h2></div>
  <div class="card mb">
    <div class="card-header">Reputation</div>
    <div class="card-body">
      <div class="stat-row">
        <span class="stat-label">${repLabel}</span>
        <div class="stat-bar-wrap"><div class="stat-bar ${repCls}" style="width:${rep}%"></div></div>
        <span class="stat-value">${rep}/100</span>
      </div>
    </div>
  </div>
  <div class="card mb">
    <div class="card-header">Car Setup</div>
    <div class="card-body">${carRows}</div>
  </div>
  <div class="card mb">
    <div class="card-header">Current Season Standings</div>
    <div class="card-body results-list">${standRows}</div>
  </div>
  <div class="card mb">
    <div class="card-header">Season History</div>
    <div class="card-body results-list">${histRows}</div>
  </div>`;
}

// ─── Save / Load slot modals ──────────────────────────────────
function renderSaveModal() {
  const meta = getSaveMeta();
  const slots = meta.map((m, i) => {
    const filled = m !== null;
    const info = filled
      ? `<strong>${m.teamName}</strong><br>${m.series} · Year ${m.year} · ${m.wins} wins<br><span class="muted-text">${new Date(m.savedAt).toLocaleString()}</span>`
      : '<span class="muted-text">Empty</span>';
    return `
    <div class="save-slot">
      <div class="save-slot-info">${info}</div>
      <div class="save-slot-actions">
        <button class="btn btn-sm btn-primary" onclick="handleSaveToSlot(${i})">Save Here</button>
        ${filled ? `<button class="btn btn-sm btn-danger" onclick="handleDeleteSlot(${i})">Delete</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
  <div class="modal-overlay" id="save-slot-modal">
    <div class="modal">
      <div class="modal-header">
        <h3>Save Game</h3>
        <button class="modal-close" onclick="closeSaveModal()">Close</button>
      </div>
      <div class="modal-body save-slots">${slots}</div>
    </div>
  </div>`;
}

function renderLoadModal() {
  const meta = getSaveMeta();
  const hasAnySave = meta.some(m => m !== null);

  const slots = meta.map((m, i) => {
    const filled = m !== null;
    const info = filled
      ? `<strong>${m.teamName}</strong><br>${m.series} · Year ${m.year} · ${m.wins} wins<br><span class="muted-text">${new Date(m.savedAt).toLocaleString()}</span>`
      : '<span class="muted-text">Empty</span>';
    return `
    <div class="save-slot ${!filled ? 'save-slot-empty' : ''}">
      <div class="save-slot-info">${info}</div>
      <div class="save-slot-actions">
        ${filled ? `
          <button class="btn btn-sm btn-primary" onclick="handleLoadFromSlot(${i})">Load</button>
          <button class="btn btn-sm btn-danger" onclick="handleDeleteSlot(${i})">Delete</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
  <div class="modal-overlay" id="save-slot-modal">
    <div class="modal">
      <div class="modal-header">
        <h3>Load a Game</h3>
        <button class="modal-close" onclick="closeSaveModal()">Close</button>
      </div>
      <div class="modal-body save-slots">
        ${!hasAnySave ? '<p class="muted-text">No saved games found.</p>' : slots}
      </div>
    </div>
  </div>`;
}

// ─── Quick Race modal ─────────────────────────────────────────
function renderQuickRaceModal() {
  return `
  <div class="modal-overlay" id="quick-race-modal">
    <div class="modal">
      <div class="modal-header">
        <h3>Quick Race</h3>
        <button class="modal-close" onclick="document.getElementById('quick-race-modal')?.remove()">Close</button>
      </div>
      <div class="modal-body">
        <p>Jump straight into a superspeedway race — no career consequences.</p>
        <div class="career-choices" style="flex-direction:column;gap:0.75rem">
          <button class="btn btn-primary" onclick="handleStartQuickRace(12)">Small Field (12 cars)</button>
          <button class="btn btn-primary" onclick="handleStartQuickRace(20)">Full Field (20 cars)</button>
          <button class="btn btn-primary" onclick="handleStartQuickRace(30)">Big Pack (30 cars)</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ─── Listeners wired after each tab render ───────────────────
function attachTabListeners(tabName) {
  // Nothing extra for most tabs; specific interactions are via onclick attributes
}
