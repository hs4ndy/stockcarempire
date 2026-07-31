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
    case 'settings':   main.innerHTML = renderSettings();    break;
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

// ─── Standings name ───────────────────────────────────────────
// Championship tables are driver standings, so always lead with the driver's
// name and keep the team as the secondary label.
function standingName(entry) {
  if (entry.isPlayer) {
    const drv = game.driverName || 'You';
    return `<strong>${drv}</strong> <span class="st-team">${game.teamName}</span>`;
  }
  // AI entries are stored as "Team Name (Driver Name)"
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(entry.name || '');
  if (m) return `${m[2]} <span class="st-team">${m[1]}</span>`;
  return entry.name || '';
}

// Race results / leaderboards store "Team / Driver" — show the driver first.
function resultName(r) {
  const parts = String(r.displayName || '').split(' / ');
  if (parts.length >= 2) {
    return `${parts[parts.length - 1]} <span class="st-team">${parts[0]}</span>`;
  }
  return r.displayName || '';
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
    const cls = e.isPlayer ? 'standing-row player-row'
              : e.isTeamCar ? 'standing-row team-row'
              : 'standing-row';
    return `<div class="${cls}">
      <span class="pos-num">${i + 1}</span>
      <span class="entry-name">${standingName(e)}</span>
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
      <span class="cmd-label">Next Race</span>
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
      <div class="team-stat"><span>Sponsors</span><span>${game.activeSponsors.length} / ${sponsorSlots()}</span></div>
      <div class="team-stat"><span>Staff</span><span>${game.staff.length + game.hiredDrivers.length} on payroll</span></div>
      ${totalDebt() > 0 ? `
        <div class="team-stat"><span>Bank Debt</span><span class="red">${fmt$(totalDebt())}</span></div>
        <a class="link mt" onclick="showTab('market')">Manage loans</a>`
      : game.money < 0 ? `<a class="link mt" onclick="showTab('market')">Visit the bank</a>` : ''}
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

  const maxUpgrades = UPGRADE_TIERS.length * MAX_PER_TIER;

  const carCards = game.cars.map(car => {
    const repairCost = Math.round((100 - car.condition) * cls.repairCostPerPoint * (game.staff.some(s=>s.typeId==='mechanic') ? 0.75 : 1));
    // Who is actually in this car: you, a hired driver, or nobody.
    const seat = hireForCar(car.id);
    const seatDrv = seat ? HIREABLE_DRIVERS.find(d => d.id === seat.driverId) : null;
    const driverName = seatDrv
      ? `${seatDrv.name} (Skill ${Math.floor(hiredDriverSkill(seat))})`
      : car.assignedDriverId === 'player'
        ? `${game.driverName || 'You'} (Skill ${Math.round(game.playerSkill)})`
        : 'No driver assigned';
    const noDriver = !seatDrv && car.assignedDriverId !== 'player';

    return `
    <div class="car-card" id="car-${car.id}">
      <div class="car-card-header">
        <span class="car-name"><span class="car-num">#${car.number || 1}</span> ${car.name}</span>
        <span class="car-class-badge">${cls.name}</span>
      </div>
      <div class="team-stat">
        <span>Car Number</span>
        <span><button class="btn btn-sm btn-ghost" onclick="handleSetCarNumber('${car.id}')">#${car.number || 1} — Change</button></span>
      </div>
      <div class="car-stats">
        ${statBar('Speed', car.speed)}
        ${statBar('Handling', car.handling)}
        ${statBar('Reliability', car.reliability)}
        ${condBar(car.condition)}
      </div>
      <div class="car-meta">
        <div class="team-stat"><span>Driver</span><span class="${noDriver ? 'red' : ''}">${driverName}</span></div>
        <div class="team-stat"><span>Races</span><span>${car.races}</span></div>
        <div class="team-stat"><span>Wins</span><span>${car.wins}</span></div>
        <div class="team-stat"><span>Upgrades</span><span>${car.appliedUpgrades.length}/${maxUpgrades}</span></div>
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
  <div class="car-grid">${carCards}</div>`;
}

function renderUpgradeModal(carId) {
  const car = game.cars.find(c => c.id === carId);
  if (!car) return '';
  const series = SERIES[game.currentSeries];
  const cls    = CAR_CLASSES[car.classId];

  const cap      = tierCapacity();          // 3 + one per Data Analyst
  const analysts = analystCount();

  const sections = UPGRADE_TIERS.map(t => {
    const parts    = cls.upgrades.filter(u => u.tier === t.tier);
    const fitted   = tierInstalled(car, t.tier, cls);
    const unlocked = tierUnlocked(car, t.tier, cls);
    const full     = fitted >= cap;

    const rows = parts.map(upg => {
      const installed = car.appliedUpgrades.includes(upg.id);
      const affordable = game.money >= upg.cost;
      const canBuy = !installed && unlocked && !full && affordable;
      const effectStr = Object.entries(upg.effect)
        .map(([k, v]) => `+${v} ${k.charAt(0).toUpperCase() + k.slice(1)}`).join(' · ');

      let action;
      if (installed)       action = `<span class="badge badge-green">Fitted</span>`;
      else if (!unlocked)  action = `<span class="badge badge-gray">Locked</span>`;
      else if (full)       action = `<span class="badge badge-gray">Tier Full</span>`;
      else if (!affordable)action = `<button class="btn btn-sm" disabled title="Not enough money">${fmt$(upg.cost)}</button>`;
      else                 action = `<button class="btn btn-sm btn-primary" onclick="handleUpgrade('${carId}','${upg.id}')">${fmt$(upg.cost)}</button>`;

      return `<div class="upgrade-row${installed ? ' installed' : ''}${!unlocked ? ' locked' : ''}">
        <div class="upgrade-info">
          <span class="upgrade-name">${upg.name}</span>
          <span class="upgrade-effect">${effectStr}</span>
        </div>
        <div class="upgrade-action">${action}</div>
      </div>`;
    }).join('');

    return `
      <div class="upgrade-tier${!unlocked ? ' is-locked' : ''}">
        <div class="upgrade-tier-head">
          <div>
            <span class="upgrade-tier-name">Tier ${t.tier} — ${t.name}</span>
            <span class="upgrade-tier-blurb">${unlocked ? t.blurb : `Fit ${MAX_PER_TIER} Tier ${t.tier - 1} parts to unlock.`}</span>
          </div>
          <span class="upgrade-tier-count${full ? ' is-full' : ''}">${fitted}/${cap}</span>
        </div>
        ${rows}
      </div>`;
  }).join('');

  const totalFitted = (car.appliedUpgrades || []).length;
  const analystNote = analysts > 0
    ? `<p class="muted-text small">${analysts} Data Analyst${analysts > 1 ? 's' : ''} on staff — ${analysts * ANALYST_TIER_SLOTS} extra slot${analysts * ANALYST_TIER_SLOTS > 1 ? 's' : ''} in every tier.</p>`
    : `<p class="muted-text small">Hire a Data Analyst to open an extra slot in every tier.</p>`;
  return `
  <div class="modal-overlay" id="upgrade-modal" onclick="closeUpgradeModal(event)">
    <div class="modal modal-wide" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3>Upgrades — #${car.number || 1} ${car.name}</h3>
        <button class="modal-close" onclick="closeUpgradeModal()">Close</button>
      </div>
      <div class="modal-body">
        <div class="upgrade-summary">
          <div><span class="upgrade-sum-label">Fitted</span><span class="upgrade-sum-val">${totalFitted} / ${UPGRADE_TIERS.length * cap}</span></div>
          <div><span class="upgrade-sum-label">Speed</span><span class="upgrade-sum-val">${car.speed}</span></div>
          <div><span class="upgrade-sum-label">Handling</span><span class="upgrade-sum-val">${car.handling}</span></div>
          <div><span class="upgrade-sum-label">Reliability</span><span class="upgrade-sum-val">${car.reliability}</span></div>
          <div><span class="upgrade-sum-label">Budget</span><span class="upgrade-sum-val gold">${fmt$(game.money)}</span></div>
        </div>
        ${analystNote}
        ${sections}
      </div>
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
    const skill = hiredDriverSkill(h);
    const start = h.startSkill != null ? h.startSkill : d.skill;
    const gained = Math.floor(skill) - Math.floor(start);
    const ceiling = h.potential != null ? h.potential : d.skill;
    const pct = Math.round((skill / Math.max(1, ceiling)) * 100);
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${d.name}</span>
        <div class="staff-meta">
          Skill ${Math.floor(skill)}${gained > 0 ? ` <span class="green">+${gained}</span>` : ''}
          • Aggression ${d.aggression} • ${fmt$(h.weeklyCost)}/week
        </div>
        <div class="staff-meta muted-text">
          Driving: ${car ? `#${car.number || 1} ${car.name}` : 'Unassigned'}
          • ${h.racesRun || 0} race${(h.racesRun || 0) === 1 ? '' : 's'}
          • potential ${ceiling}
        </div>
        <div class="driver-growth"><div class="driver-growth-fill" style="width:${clamp(pct,0,100)}%"></div></div>
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
  const openSeats = freeCarsForHire().length;
  const seatWarning = game.cars.length === 0
    ? `<p class="form-warning">No car — buy a car before hiring a driver.</p>`
    : openSeats === 0
      ? `<p class="form-warning">No free car — every car already has a driver. Buy another car to hire more.</p>`
      : '';

  const driverRows = availableDrivers.map(d => {
    const signingFee = d.weeklyCost * 4;
    const canAfford  = game.money >= signingFee;

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
        ${seatWarning}
        ${driverRows}
      </div>
      <div class="card mt">
        <div class="card-header">Hire Support Staff</div>
        ${staffHireRows}
      </div>
    </div>
  </div>`;
}

function renderHireDriverModal(driverId) {
  const d = HIREABLE_DRIVERS.find(dr => dr.id === driverId);
  if (!d) return '';
  const freeCars = freeCarsForHire();
  if (freeCars.length === 0) {
    return `<div class="modal-overlay" id="hire-modal" onclick="closeHireModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header"><h3>Hire ${d.name}</h3><button class="modal-close" onclick="closeHireModal()">Close</button></div>
        <div class="modal-body"><p>No free cars available. Buy another car or release an existing driver first.</p></div>
      </div>
    </div>`;
  }
  const carOpts = freeCars.map(c => `<option value="${c.id}">#${c.number || 1} ${c.name}</option>`).join('');
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
      ${game.activeSponsors.length < sponsorSlots()
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

  // ── Bank ────────────────────────────────────────────────
  const loans = getLoans();
  const debt  = totalDebt();
  const limit = creditLimit();
  const avail = creditAvailable();

  const loanRows = loans.map(l => {
    const late = l.racesLeft <= 0;
    return `<div class="loan-row${late ? ' is-late' : ''}">
      <div class="loan-info">
        <span class="loan-name">${l.name}${late ? ' — OVERDUE' : ''}</span>
        <div class="staff-meta">Owed ${fmt$(l.balance)} · borrowed ${fmt$(l.principal)}</div>
        <div class="staff-meta ${late ? 'red' : 'muted-text'}">
          ${late ? `Accruing ${Math.round(LOAN_LATE_RATE * 100)}% interest every race`
                 : `${l.racesLeft} race${l.racesLeft === 1 ? '' : 's'} left to repay`}
        </div>
      </div>
      <div class="loan-actions">
        <button class="btn btn-sm btn-primary" onclick="handleRepayLoan('${l.id}')"
          ${game.money <= 0 ? 'disabled' : ''}>Repay All</button>
        <button class="btn btn-sm btn-ghost" onclick="handleRepayLoan('${l.id}', ${Math.max(500, Math.round(l.balance / 2))})"
          ${game.money <= 0 ? 'disabled' : ''}>Pay Half</button>
      </div>
    </div>`;
  }).join('') || '<p class="muted-text">No outstanding loans.</p>';

  const offerRows = LOAN_OFFERS.map(o => {
    const principal = loanPrincipal(o);
    const owed = Math.round(principal * (1 + o.rate));
    const canTake = principal >= 500 && loans.length < 3;
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${o.name}</span>
        <div class="staff-meta">Borrow ${fmt$(principal)} · repay ${fmt$(owed)} within ${o.term} races</div>
        <div class="staff-meta muted-text">${o.blurb}</div>
      </div>
      ${canTake
        ? `<button class="btn btn-sm btn-primary" onclick="handleTakeLoan('${o.id}')">Borrow</button>`
        : `<button class="btn btn-sm" disabled>${loans.length >= 3 ? 'Max loans' : 'No credit'}</button>`}
    </div>`;
  }).join('');

  const creditPct = limit > 0 ? Math.round((debt / limit) * 100) : 0;
  const bankCard = `
    <div class="card mt">
      <div class="card-header">Bank</div>
      ${game.money < 0 ? `<p class="form-warning">You are in the red. Borrowing now buys time, but the balance must be cleared before the term runs out.</p>` : ''}
      <div class="team-stat"><span>Cash</span><span class="${game.money < 0 ? 'red' : 'highlight'}">${fmt$(game.money)}</span></div>
      <div class="team-stat"><span>Total Debt</span><span class="${debt > 0 ? 'red' : ''}">${fmt$(debt)}</span></div>
      <div class="team-stat"><span>Credit Limit</span><span>${fmt$(limit)}</span></div>
      <div class="team-stat"><span>Available</span><span class="green">${fmt$(avail)}</span></div>
      <div class="stat-row mt">
        <span class="stat-label">Credit Used</span>
        <div class="stat-bar-wrap"><div class="stat-bar ${creditPct >= 80 ? 'bar-red' : creditPct >= 50 ? 'bar-yellow' : 'bar-green'}" style="width:${clamp(creditPct,0,100)}%"></div></div>
        <span class="stat-value">${creditPct}%</span>
      </div>
      <div class="card-header mt">Your Loans</div>
      ${loanRows}
      <div class="card-header mt">Available Credit</div>
      <p class="muted-text small">Repay within the term or the balance starts compounding at ${Math.round(LOAN_LATE_RATE * 100)}% per race. Credit grows with your reputation.</p>
      ${offerRows}
    </div>`;

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
      ${bankCard}
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
    const cls = e.isPlayer ? 'standings-row player-standing'
              : e.isTeamCar ? 'standings-row team-standing'
              : 'standings-row';
    return `<div class="${cls}">
      <span class="st-pos">${pos}</span>
      <span class="st-name">${standingName(e)}</span>
      <span class="st-races">${e.races}</span>
      <span class="st-wins">${e.wins}</span>
      <span class="st-top5">${e.top5}</span>
      <span class="st-pts">${e.points}</span>
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
    // A car with a hired driver in it is not available for you to drive.
    const taken = new Map();
    (game.hiredDrivers || []).forEach(h => {
      const drv = HIREABLE_DRIVERS.find(d => d.id === h.driverId);
      if (drv) taken.set(h.carId, drv.name);
    });
    const openCars = cars.filter(c => !taken.has(c.id));
    const idleCars = cars.filter(c => taken.has(c.id) === false && c.assignedDriverId !== 'player');

    const driverCar = openCars.find(c => c.assignedDriverId === 'player') || openCars[0];
    carSection = `
      <p class="muted-text">Select which car you will drive:</p>
      ${openCars.map(c => `
        <label class="radio-row">
          <input type="radio" name="drive-car" value="${c.id}" ${c === driverCar ? 'checked' : ''}>
          <span>#${c.number || 1} ${c.name} — Speed ${c.speed}, Handling ${c.handling}, Condition ${Math.round(c.condition)}%</span>
        </label>`).join('') || '<p class="form-warning">Every car has a hired driver in it — release a driver to drive one yourself.</p>'}
      ${taken.size ? `
        <div class="card-header mt">Entered By Your Drivers</div>
        ${[...taken.entries()].map(([carId, nm]) => {
          const c = game.cars.find(x => x.id === carId);
          return `<div class="team-stat"><span>#${c?.number || 1} ${c?.name || 'Car'}</span><span>${nm}</span></div>`;
        }).join('')}` : ''}
      ${idleCars.length > 1 || (idleCars.length === 1 && idleCars[0] !== driverCar) ? `
        <p class="form-warning">Some cars have no driver assigned and will not be entered. Assign a driver in the Team tab.</p>` : ''}
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
      <button class="btn btn-ghost" onclick="showScreen('game')">Back</button>
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
      <span class="res-name">${resultName(r)}</span>
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
  const purse = (info.playerPayout || 0) + (info.teamPayout || 0);

  const payoutRows = (info.payouts || []).map(p => `
    <div class="result-row ${p.isPlayer ? 'player-result' : p.isTeamCar ? 'team-standing' : ''}">
      <span class="res-pos ${p.pos <= 3 ? 'podium' : ''}">${p.pos}</span>
      <span class="res-name">${p.isPlayer ? `<strong>${info.driver}</strong>` : p.name}</span>
      <span class="res-prize green">${fmt$(p.amount)}</span>
    </div>`).join('');

  // ── Champion: the big one ────────────────────────────────
  if (info.champion) {
    return `
    <div class="modal-overlay" id="end-season-modal">
      <div class="modal modal-wide champ-modal">
        <div class="champ-banner">
          <div class="champ-checker"></div>
          <div class="champ-eyebrow">${info.seriesName} · Season ${info.year}</div>
          <div class="champ-title">CHAMPION</div>
          <div class="champ-driver">${info.driver}</div>
          <div class="champ-checker"></div>
        </div>
        <div class="modal-body">
          <div class="champ-stats">
            <div><span class="champ-stat-num">${info.wins}</span><span class="champ-stat-label">Wins</span></div>
            <div><span class="champ-stat-num">${info.top5}</span><span class="champ-stat-label">Top 5</span></div>
            <div><span class="champ-stat-num">${info.points}</span><span class="champ-stat-label">Points</span></div>
            <div><span class="champ-stat-num">${info.races}</span><span class="champ-stat-label">Races</span></div>
            <div><span class="champ-stat-num">${info.titles}</span><span class="champ-stat-label">${info.titles === 1 ? 'Title' : 'Titles'}</span></div>
          </div>
          <div class="champ-purse">
            <span class="champ-purse-label">Championship Purse</span>
            <span class="champ-purse-val">${fmt$(purse)}</span>
          </div>
          <p class="highlight">${info.message}</p>
          ${info.promoted ? `<div class="achievement-badge">PROMOTED</div>` : ''}
          <div class="card-header mt">Season Payouts</div>
          <div class="results-list">${payoutRows}</div>
          ${info.totalEntrants > 10 ? `<p class="muted-text small">Every one of the ${info.totalEntrants} drivers is paid on final position.</p>` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary btn-lg" onclick="handleDismissEndSeason()">Start Next Season</button>
        </div>
      </div>
    </div>`;
  }

  // ── Everyone else ────────────────────────────────────────
  return `
  <div class="modal-overlay" id="end-season-modal">
    <div class="modal modal-wide">
      <div class="modal-header"><h3>Season Over — ${info.seriesName}</h3></div>
      <div class="modal-body">
        <p class="highlight">${info.message}</p>
        ${info.promoted ? `<div class="achievement-badge">PROMOTED</div>` : ''}
        ${info.relegated ? `<div class="achievement-badge rele">RELEGATED</div>` : ''}
        <div class="champ-purse mt">
          <span class="champ-purse-label">Season Payout</span>
          <span class="champ-purse-val">${fmt$(purse)}</span>
        </div>
        <div class="card-header mt">Season Payouts</div>
        <div class="results-list">${payoutRows}</div>
        ${info.totalEntrants > 10 ? `<p class="muted-text small">Every one of the ${info.totalEntrants} drivers is paid on final position.</p>` : ''}
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
      <div class="modal-header"><h3>Welcome to the Premier Cup Series</h3></div>
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

  // ── Career totals ────────────────────────────────────────
  const hist        = game.history || [];
  const seasonStand = getStandings();
  const me          = seasonStand.find(e => e.id === 'player');
  const seasonPos   = seasonStand.findIndex(e => e.id === 'player') + 1;

  const seasonWins  = me?.wins  || 0;
  const seasonTop5  = me?.top5  || 0;
  const seasonTop10 = me?.top10 || 0;
  const seasonRaces = me?.races || 0;
  const seasonPts   = me?.points || 0;

  // All-time = every completed season plus what is banked this year
  const pastWins  = hist.reduce((s, h) => s + (h.wins || 0), 0);
  const allWins   = pastWins + seasonWins;
  const allRaces  = game.cars.reduce((s, c) => s + (c.races || 0), 0);
  const titles    = game.titles || hist.filter(h => h.champion).length;
  const seasons   = hist.length;
  const earnings  = game.season.calendar
    .filter(r => r.status === 'completed')
    .reduce((s, r) => s + (r.earnings || 0), 0);
  const careerPayouts = hist.reduce((s, h) => s + (h.payout || 0), 0);

  const rep = game.reputation || 50;
  const repLabel = rep >= 80 ? 'Legend' : rep >= 60 ? 'Respected' : rep >= 40 ? 'Known' : rep >= 20 ? 'Rookie' : 'Unknown';
  const repCls   = rep >= 60 ? 'bar-green' : rep >= 40 ? 'bar-yellow' : 'bar-red';

  const winRate = allRaces > 0 ? Math.round(allWins / allRaces * 100) : 0;

  // ── Last season ──────────────────────────────────────────
  const last = hist.length ? hist[hist.length - 1] : null;
  const lastSeason = last ? `
    <div class="card mb">
      <div class="card-header">Last Season — ${last.series}, Year ${last.year}</div>
      <div class="card-body">
        <div class="champ-stats">
          <div><span class="champ-stat-num">${last.finalPos}${ordinal(last.finalPos)}</span><span class="champ-stat-label">Finish</span></div>
          <div><span class="champ-stat-num">${last.wins || 0}</span><span class="champ-stat-label">Wins</span></div>
          <div><span class="champ-stat-num">${last.champion ? 'YES' : 'NO'}</span><span class="champ-stat-label">Title</span></div>
          <div><span class="champ-stat-num">${fmt$(last.payout || 0)}</span><span class="champ-stat-label">Purse</span></div>
          <div><span class="champ-stat-num">${seasons}</span><span class="champ-stat-label">Seasons</span></div>
        </div>
      </div>
    </div>` : `
    <div class="card mb">
      <div class="card-header">Last Season</div>
      <div class="card-body"><p class="muted-text">You have not completed a season yet.</p></div>
    </div>`;

  const histRows = hist.slice().reverse().map(h => `
    <div class="result-row ${h.champion ? 'player-result' : ''}">
      <span class="res-pos ${h.finalPos <= 3 ? 'podium' : ''}">${h.finalPos}</span>
      <span class="res-name">Year ${h.year} <span class="st-team">${h.series}</span></span>
      <span class="res-pts">${h.wins || 0}W</span>
      <span class="res-prize green">${fmt$(h.payout || 0)}</span>
    </div>`).join('') || '<p class="muted-text">No completed seasons yet.</p>';

  return `
  <div class="page-header"><h2>Career — ${game.driverName || game.teamName}</h2></div>

  <div class="cmd-strip">
    <div class="cmd-cell">
      <span class="cmd-label">Career Wins</span>
      <span class="cmd-value gold">${allWins}</span>
      <span class="cmd-sub">${winRate}% of ${allRaces} starts</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Championships</span>
      <span class="cmd-value">${titles}</span>
      <span class="cmd-sub">${seasons} season${seasons === 1 ? '' : 's'} run</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Wins This Season</span>
      <span class="cmd-value">${seasonWins}</span>
      <span class="cmd-sub">${seasonTop5} top 5 · ${seasonTop10} top 10</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Championship</span>
      <span class="cmd-value">${seasonPos}${ordinal(seasonPos)}</span>
      <span class="cmd-sub">${seasonPts} points</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Reputation</span>
      <span class="cmd-value">${repLabel}</span>
      <span class="cmd-sub">${rep}/100</span>
    </div>
  </div>

  <div class="two-col-grid">
    <div>
      <div class="card mb">
        <div class="card-header">Standing</div>
        <div class="card-body">
          <div class="stat-row">
            <span class="stat-label">Reputation</span>
            <div class="stat-bar-wrap"><div class="stat-bar ${repCls}" style="width:${clamp(rep,0,100)}%"></div></div>
            <span class="stat-value">${rep}</span>
          </div>
          ${statBar('Driver Skill', Math.round(game.playerSkill))}
          <div class="team-stat"><span>Team</span><span>${game.teamName}</span></div>
          <div class="team-stat"><span>Series</span><span>${SERIES[game.currentSeries].name}</span></div>
          <div class="team-stat"><span>Role</span><span>${
            game.driverMode === 'hired' ? 'Hired Driver'
            : game.driverMode === 'manager' ? 'Team Manager' : 'Driver / Owner'}</span></div>
        </div>
      </div>

      <div class="card mb">
        <div class="card-header">This Season</div>
        <div class="card-body">
          <div class="team-stat"><span>Races Run</span><span>${seasonRaces}</span></div>
          <div class="team-stat"><span>Wins</span><span>${seasonWins}</span></div>
          <div class="team-stat"><span>Top 5 Finishes</span><span>${seasonTop5}</span></div>
          <div class="team-stat"><span>Top 10 Finishes</span><span>${seasonTop10}</span></div>
          <div class="team-stat"><span>Points</span><span>${seasonPts}</span></div>
          <div class="team-stat"><span>Prize Money</span><span class="green">${fmt$(earnings)}</span></div>
        </div>
      </div>
    </div>

    <div>
      ${lastSeason}
      <div class="card mb">
        <div class="card-header">All Time</div>
        <div class="card-body">
          <div class="team-stat"><span>Career Wins</span><span class="highlight">${allWins}</span></div>
          <div class="team-stat"><span>Career Starts</span><span>${allRaces}</span></div>
          <div class="team-stat"><span>Win Rate</span><span>${winRate}%</span></div>
          <div class="team-stat"><span>Championships</span><span class="gold">${titles}</span></div>
          <div class="team-stat"><span>Seasons Completed</span><span>${seasons}</span></div>
          <div class="team-stat"><span>Season Purses Won</span><span class="green">${fmt$(careerPayouts)}</span></div>
        </div>
      </div>
      <div class="card mb">
        <div class="card-header">Season History</div>
        <div class="card-body results-list">${histRows}</div>
      </div>
    </div>
  </div>`;
}

// ─── Settings ─────────────────────────────────────────────────
function renderSettings() {
  if (!game) return '';
  const curDiff = game.difficulty || DEFAULT_DIFFICULTY;
  const slotLabel = (typeof currentSlot === 'undefined' || currentSlot === null)
    ? 'Not saved yet' : `Slot ${currentSlot + 1}`;

  return `
  <div class="page-header"><h2>Settings</h2></div>
  <div class="two-col-grid">
    <div>
      <div class="card mb">
        <div class="card-header">Difficulty</div>
        <div class="card-body">
          <p class="muted-text small">Applies from your next race onward — change it any time.</p>
          <div class="difficulty-grid">
            ${DIFFICULTIES.map(d => `
              <div class="difficulty-card${d.id === curDiff ? ' selected' : ''}"
                   onclick="handleSetDifficulty('${d.id}')">
                <span class="difficulty-name">${d.name}</span>
                <span class="difficulty-blurb">${d.blurb}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <div>
      <div class="card mb">
        <div class="card-header">Save</div>
        <div class="card-body">
          <div class="team-stat"><span>Auto-saving to</span><span class="${slotLabel === 'Not saved yet' ? 'red' : ''}">${slotLabel}</span></div>
          <p class="muted-text small">Nothing is written to a slot until you pick one. After that the game keeps saving there automatically.</p>
          <div class="btn-row mt">
            <button class="btn btn-primary" onclick="handleSaveGame()">Save to Slot</button>
            <button class="btn btn-ghost" onclick="showLoadModal()">Load a Game</button>
          </div>
        </div>
      </div>
      <div class="card mb">
        <div class="card-header">Career</div>
        <div class="card-body">
          <div class="team-stat"><span>Team</span><span>${game.teamName}</span></div>
          <div class="team-stat"><span>Driver</span><span>${game.driverName || '—'}</span></div>
          <div class="team-stat"><span>Season</span><span>Year ${game.season.year}</span></div>
          <div class="btn-row mt">
            <button class="btn btn-danger" onclick="handleNewGamePrompt()">Start a New Career</button>
          </div>
        </div>
      </div>
    </div>
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
        <div class="card-header">Difficulty</div>
        <div class="difficulty-grid">
          ${DIFFICULTIES.map(d => `
            <div class="difficulty-card${d.id === quickRaceDifficulty ? ' selected' : ''}"
                 data-diff="${d.id}" onclick="setQuickRaceDifficulty('${d.id}')">
              <span class="difficulty-name">${d.name}</span>
              <span class="difficulty-blurb">${d.blurb}</span>
            </div>`).join('')}
        </div>
        <div class="card-header mt">Series</div>
        <div class="quick-series">
          ${SERIES.map(s => `
            <button class="quick-series-btn" onclick="handleStartQuickRace(${s.fieldSize})">
              <span class="quick-series-name" style="color:${s.color}">${s.name}</span>
              <span class="quick-series-meta">${s.fieldSize}-car field · ${s.description}</span>
            </button>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

// ─── Listeners wired after each tab render ───────────────────
function attachTabListeners(tabName) {
  // Nothing extra for most tabs; specific interactions are via onclick attributes
}
