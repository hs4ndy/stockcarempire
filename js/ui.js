// ============================================================
// STOCK CAR EMPIRE - UI Rendering
// ============================================================

// ─── Screen router ───────────────────────────────────────────
function showScreen(name) {
  document.body.dataset.screen = name;
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('screen-' + name)?.classList.remove('hidden');
}

function showTab(tabName) {
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.remove('active');
    b.removeAttribute('aria-current');
  });
  const active = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
  active?.classList.add('active');
  active?.setAttribute('aria-current', 'page');
  active?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  renderTab(tabName);
}

function renderTab(tabName) {
  const main = document.getElementById('main-content');
  main.dataset.tab = tabName;
  switch (tabName) {
    case 'dashboard':  main.innerHTML = renderDashboard();   break;
    case 'garage':     main.innerHTML = renderGarage();      break;
    case 'team':       main.innerHTML = renderTeam();        break;
    case 'schedule':   main.innerHTML = renderSchedule();    break;
    case 'sponsors': main.innerHTML = renderSponsors(); break;
    case 'market':     main.innerHTML = renderMarket();      break;
    case 'standings':  main.innerHTML = renderStandings();   break;
    case 'carstats':   main.innerHTML = renderCareerStats(); break;
    case 'trophies': main.innerHTML = renderTrophyCase(); break;
    case 'settings':   main.innerHTML = renderSettings();    break;
    default:           main.innerHTML = renderDashboard();
  }
  attachTabListeners(tabName);
}

// ─── Update header info ──────────────────────────────────────
function updateHeader() {
  if (!game) return;
  updateSponsorBadge();
  const cash = document.getElementById('header-cash');
  if (cash) cash.textContent = fmt$(game.money);
  // Flag an unsaved career - auto-save only runs once a slot is chosen.
  const saveBtn = document.getElementById('btn-hdr-save');
  if (saveBtn) {
    const unsaved = (typeof currentSlot === 'undefined' || currentSlot === null);
    saveBtn.textContent = unsaved ? 'Save *' : 'Save';
    saveBtn.title = unsaved
      ? 'Not saved yet - choose a slot to enable auto-save (Ctrl+S)'
      : `Auto-saving to Slot ${currentSlot + 1} (Ctrl+S)`;
    saveBtn.classList.toggle('btn-unsaved', unsaved);
  }
}

// ─── Notifications / toasts ──────────────────────────────────
function toast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.setAttribute('aria-atomic', 'true');
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
function standingIdentity(entry) {
 if(entry.isPlayer)return {driver:game.driverName||'You',team:game.teamName};
 if(entry.isTeamCar){const hire=hireForCar(entry.id),driver=HIREABLE_DRIVERS.find(d=>d.id===(entry.driverId||hire?.driverId));if(driver)return {driver:driver.name,team:game.teamName};const parts=String(entry.name||'').split(' / ');if(parts.length>1)return {driver:parts.at(-1),team:parts[0]};}
 const match=/^(.*?)\s*\(([^)]+)\)\s*$/.exec(entry.name||'');
 return match?{driver:match[2],team:match[1]}:{driver:entry.name||'',team:''};
}
function standingName(entry) {
 const identity=standingIdentity(entry),name=careerArchiveEscape(identity.driver);
 return `${entry.isPlayer?`<strong>${name}</strong>`:name}${identity.team?` <span class="st-team">${careerArchiveEscape(identity.team)}</span>`:''}`;
}

// Race results / leaderboards store "Team / Driver" - show the driver first.
function resultName(r) {
  const parts = String(r.displayName || '').split(' / ');
  if (parts.length >= 2) {
    return `${parts[parts.length - 1]} <span class="st-team">${parts[0]}</span>`;
  }
  return r.displayName || '';
}

// ─── Stat bar HTML ────────────────────────────────────────────
function statBar(label, value, max = 100, color = '', suffix = '') {
  const pct = Math.round((value / max) * 100);
  const cls = color || (pct >= 70 ? 'bar-green' : pct >= 40 ? 'bar-yellow' : 'bar-red');
  return `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <div class="stat-bar-wrap">
        <div class="stat-bar ${cls}" style="width:${pct}%"></div>
      </div>
      <span class="stat-value">${value}${suffix}</span>
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
  const repairCars = game.cars.filter(c => c.races > 0 && c.condition < 100);
  const series   = SERIES[game.currentSeries];
  const race     = currentRace();
  const track    = race ? TRACKS.find(t => t.id === race.trackId) : null;
  const pos      = getPlayerStandingPos();
  const sorted   = getStandings();
  const totalEntrants = sorted.length;
  const playerEntry  = sorted.find(e => e.id === 'player');
  const seasonOver   = isSeasonOver();
  const expenses     = weeklyExpenses();
  const income       = sponsorIncome();

  const topStandings = sorted.slice(0, 3).map((e, i) => {
    const cls = e.isPlayer ? 'standing-row player-row'
              : e.isTeamCar ? 'standing-row team-row'
              : 'standing-row';
    return `
  <div class="${cls}">
      <span class="pos-num">${i + 1}</span>
      <span class="entry-name">${standingName(e)}</span>
      <span class="pts-val">${e.points} pts</span>
    </div>`;
  }).join('');

  const racesCompleted = game.season.calendar.filter(r => r.status === 'completed').length;

  const net = income - expenses;
  const recentResults = game.season.calendar.filter(r => r.status === 'completed').slice(-5).reverse().map(r => {
    const t = TRACKS.find(tr => tr.id === r.trackId);
    const position = r.playerResult?.position;
    const color = position === 1 ? 'var(--gold)' : position <= 5 ? 'var(--green)' : 'var(--text-dim)';
    return `<div class="team-stat">
      <span>Race ${r.raceNum} · ${t?.name || '?'}</span>
      <span style="color:${color};font-weight:700">${position ? `P${position} · ${fmt$(r.earnings)}` : 'Skipped'}</span>
    </div>`;
  }).join('') || '<p class="muted-text small">Your results will appear here after your first race.</p>';

  return `
  <div class="page-header dashboard-heading">
    <h2>Dashboard</h2>
    <p>${series.name} <span>Season ${game.season.year}</span></p>
  </div>
  ${game.pendingSeasonNews?'<button class="btn btn-secondary mb" onclick="showCareerMilestoneNews(\'season\',game.pendingSeasonNews)">Read Season News</button>':''}
  ${renderSponsorNotice()}
  ${repairCars.length ? `<section class="card mb" id="dashboard-repair-reminder" role="status" aria-label="Repair reminder">
    <div class="card-header">Repair reminder</div>
    <div class="card-body"><p>${repairCars.length === 1 ? 'Your car needs repairs' : `${repairCars.length} cars need repairs`} before the next race. Restore vehicle condition in the Garage.</p>
      <div class="btn-row"><button class="btn btn-warning" onclick="showTab('garage')">Repair cars</button></div>
    </div>
  </section>` : ''}
  <div class="cmd-strip">
    <div class="cmd-cell">
      <span class="cmd-label">Championship</span>
      <span class="cmd-value">${pos}${ordinal(pos)}</span>
      <span class="cmd-sub">of ${totalEntrants} entries</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Points</span>
      <span class="cmd-value">${playerEntry?.points || 0}</span>
      <span class="cmd-sub">${playerEntry?.wins || 0} wins this season</span>
    </div>
    <div class="cmd-cell">
      <span class="cmd-label">Cash</span>
      <span class="cmd-value">${fmt$(game.money)}</span>
      <span class="cmd-sub">Available budget</span>
    </div>
  </div>

  <div class="dashboard-grid">

    <!-- Next Race / Season End -->
    <div class="card dashboard-card dashboard-race">
      <div class="card-header">${seasonOver ? 'Season Complete' : 'Next Race'}</div>
      ${seasonOver ? `
        <div class="dashboard-race-overview">
        <div class="race-spotlight">
          <span class="race-spotlight-name">Final Standing: ${pos}${ordinal(pos)}</span>
          <span class="race-spotlight-meta">${series.name} · Year ${game.season.year}</span>
        </div>
        ${pos <= series.promotionSpots && series.level < 2
          ? `<div><span class="badge badge-green">PROMOTION ELIGIBLE</span></div>` : ''}
        ${series.relegationSpots > 0 && pos > totalEntrants - series.relegationSpots
          ? `<div><span class="badge badge-red">RELEGATION ZONE</span></div>` : ''}
        </div>
        <div class="dashboard-card-footer">
        <button class="btn btn-primary" onclick="handleEndSeason()">Begin Off-Season</button>
        </div>
      ` : `
        <div class="dashboard-race-overview">
        <div class="event-round">Race <strong>${race.raceNum}</strong><span>/ ${game.season.calendar.length}</span></div>
        <div class="race-spotlight">
          <span class="race-spotlight-name">${track?.name || 'TBD'}</span>
        </div>
        <div class="dashboard-race-costs">
        <div class="team-stat"><span>Entry Fee per Car</span><span class="red">${fmt$(series.entryFee)}</span></div>
        <div class="team-stat"><span>1st Prize</span><span class="green">${fmt$(series.prize[0])}</span></div>
        </div>
        </div>
        <div class="dashboard-card-footer">
          <button class="btn btn-primary" onclick="handleOpenRaceWeekend()">Enter Race Weekend</button>
        </div>
      `}
    </div>

    <!-- Championship Standings -->
    <div class="card dashboard-card dashboard-standings">
      <div class="card-header">Championship Standings</div>
      <div class="dashboard-season-progress">
      <div class="season-progress-bar-wrap">
        <div class="season-progress-bar" style="width:${Math.round(racesCompleted / game.season.calendar.length * 100)}%"></div>
      </div>
      <p class="muted-text small">${racesCompleted} / ${game.season.calendar.length} races complete</p>
      </div>
      <div class="standings-mini">${topStandings}</div>
      <div class="dashboard-card-footer">
      ${sorted.length > 3 ? `<button class="btn btn-sm btn-ghost section-action" onclick="showTab('standings')">View Full Standings</button>` : ''}
      <details class="ui-details">
        <summary>Recent results</summary>
        <div class="ui-details-body">${recentResults}</div>
      </details>
      </div>
    </div>

    <!-- Finances -->
    <div class="card dashboard-card dashboard-finances">
      <div class="card-header">Finances</div>
      <div class="dashboard-finance-summary">
      <div class="team-stat"><span>Sponsor Income</span><span class="green">+${fmt$(income)}/race</span></div>
      <div class="team-stat"><span>Staff Costs</span><span class="red">-${fmt$(expenses)}/race</span></div>
      <div class="team-stat dashboard-net"><span>Net</span><span class="${net >= 0 ? 'green' : 'red'}">${net >= 0 ? '+' : ''}${fmt$(net)}/race</span></div>
      </div>
      <div class="dashboard-card-footer">
      <details class="ui-details">
        <summary>Budget details</summary>
        <div class="ui-details-body">
          <div class="team-stat"><span>Sponsors</span><span>${game.sponsorship.contracts.length} active</span></div>
          <div class="team-stat"><span>Staff</span><span>${game.staff.length + game.hiredDrivers.length} on payroll</span></div>
          <p class="section-copy">Entry fees and repairs are paid separately.</p>
        </div>
      </details>
      ${totalDebt() > 0 ? `
        <div class="team-stat"><span>Bank Debt</span><span class="red">${fmt$(totalDebt())}</span></div>
        <button class="btn btn-sm btn-ghost section-action" onclick="showTab('market')">Manage Loans</button>`
      : game.money < 0 ? `<button class="btn btn-sm btn-ghost section-action" onclick="showTab('market')">Visit the Bank</button>` : ''}
      </div>
    </div>

    <!-- Garage -->
    <div class="card dashboard-card dashboard-garage">
      <div class="card-header">Your Garage</div>
      <div class="dashboard-car-list">
      ${game.cars.map(car => {
        const condPct = Math.round(car.condition);
        const condColor = condPct >= 70 ? 'var(--green)' : condPct >= 40 ? 'var(--gold)' : 'var(--red)';
        return `<div class="car-mini-row">
          <span class="car-mini-name">${car.name}</span>
          <div class="dashboard-condition-bar">
            <div style="width:${condPct}%;height:100%;background:${condColor}"></div>
          </div>
          <span class="car-mini-score">${condPct}%</span>
        </div>`;
      }).join('')}
      </div>
      <div class="dashboard-card-footer">
      <button class="btn btn-sm btn-ghost section-action" onclick="showTab('garage')">Manage Cars</button>
      <details class="ui-details">
      <summary>Driver profile and history</summary>
      <div class="ui-details-body">
      <div class="team-stat"><span>Driver</span><span class="highlight">${game.driverName || game.teamName}</span></div>

      ${statBar('Driver Skill', Math.round(game.playerSkill))}
      <div class="team-stat"><span>Seasons Raced</span><span>${game.history.length}</span></div>
      ${game.history.length > 0 ? game.history.slice(-3).map(h => `
        <div class="team-stat">
          <span>Yr ${h.year} ${h.series.split(' ')[0]}</span>
          <span>${h.finalPos}${ordinal(h.finalPos)} · ${h.wins}W</span>
        </div>`).join('') : '<p class="section-copy">Finish your first season to start your career record.</p>'}
      </div>
      </details>
      </div>
    </div>

  </div>`;
}

// ─── Garage ──────────────────────────────────────────────────
function renderGarage() {
  const series = SERIES[game.currentSeries];
  const cls    = CAR_CLASSES[series.carClass];

  const maxUpgrades = UPGRADE_TIERS.length * MAX_PER_TIER;

  const carCards = game.cars.map(car => {
    const repairCost = carRepairCost(car);
    // Who is actually in this car: you, a hired driver, or nobody.
    const seat = hireForCar(car.id);
    const seatDrv = seat ? HIREABLE_DRIVERS.find(d => d.id === seat.driverId) : null;
    const driverName = seatDrv
      ? `${seatDrv.name} (Skill ${Math.floor(hiredDriverSkill(seat))})`
      : car.assignedDriverId === 'player'
        ? `${game.driverName || 'You'} (${Math.round(game.playerSkill)} OVR)`
        : 'No driver assigned';
    const noDriver = !seatDrv && car.assignedDriverId !== 'player';

    return `
    <div class="car-card" id="car-${car.id}">
      <div class="car-card-header">
        <span class="car-name" title="${careerArchiveEscape(car.name)}"><span class="car-num">#${car.number || 1}</span> ${careerArchiveEscape(car.name)}</span>

      </div>
      <div class="team-stat"><span>Driver</span><span class="${noDriver ? 'red' : ''}">${driverName}</span></div>
      <div class="car-actions">
        ${car.condition < 100 ? `<button class="btn btn-sm btn-warning" onclick="handleRepair('${car.id}', ${repairCost})">Repair (${fmt$(repairCost)})</button>` : `<span class="badge badge-green">Full Condition</span>`}
        ${carFullyUpgraded(car)?'<span class="btn btn-sm btn-complete" role="status">Fully Upgraded</span>':`<button class="btn btn-sm btn-primary" onclick="showUpgradeModal('${car.id}')">Upgrade Car</button>`}
      </div>
      <button class="btn btn-primary car-studio-open" onclick="openCarStudio('career','${car.id}')">Customize Car</button>
      <div class="car-stats">
        ${condBar(car.condition)}
        ${raceFeatureRules(game.difficulty,game.raceRules).damage ? statBar("Lifetime health (permanent)", Math.ceil((car.lifetimeHealth ?? 100)*10)/10,100,'','%') : ""}
      </div>
      <details class="ui-details">
        <summary>Performance and race record</summary>
        <div class="ui-details-body">
        ${statBar('Speed', car.speed)}
        ${statBar('Handling', car.handling)}
        ${statBar('Reliability', car.reliability)}
      <div class="car-meta">
        <div class="team-stat"><span>Races</span><span>${car.races}</span></div>
        <div class="team-stat"><span>Wins</span><span>${car.wins}</span></div>
        <div class="team-stat"><span>Upgrades</span><span>${car.appliedUpgrades.length}/${maxUpgrades}</span></div>
      </div>
        </div>
      </details>
        <div class="car-disposal-actions"><button class="btn btn-sm btn-danger" onclick="handleSellCar('${car.id}')" ${game.cars.length === 1 ? 'disabled title="You must keep at least one car."' : ''}>Sell</button><button class="btn btn-sm btn-danger" onclick="handleRetireCar('${car.id}')">Retire Car</button></div>
    </div>`;
  }).join('');

  return `
  <div class="page-header">
    <div class="btn-row" style="margin:0"><h2>Garage</h2><button class="btn btn-warning btn-repair-all" onclick="handleRepairAll()" ${game.cars.some(c=>c.condition<100)?'':'disabled'}>Repair All</button></div>
    <button class="btn btn-secondary" onclick="showVehicleGraveyard()">Vehicle Graveyard (${(game.retiredCars||[]).length})</button>
    <button class="btn btn-primary" onclick="showTab('market')">Browse Cars</button>
  </div>
  ${game.cars.length ? '' : '<div class="card"><p>No active cars. Buy a replacement in Market. Loans are available if you need funds.</p></div>'}
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
      else if (!affordable)action = `<button class="btn btn-sm" disabled title="You need ${fmt$(upg.cost)} to buy this part">Buy (${fmt$(upg.cost)})</button>`;
      else                 action = `<button class="btn btn-sm btn-primary" onclick="handleUpgrade('${carId}','${upg.id}')">Buy (${fmt$(upg.cost)})</button>`;

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
            <span class="upgrade-tier-name">Tier ${t.tier} - ${t.name}</span>
            <span class="upgrade-tier-blurb">${unlocked ? t.blurb : `Fit ${MAX_PER_TIER} Tier ${t.tier - 1} parts to unlock.`}</span>
          </div>
          <span class="upgrade-tier-count${full ? ' is-full' : ''}">${fitted}/${cap}</span>
        </div>
        ${rows}

    </div>`;
  }).join('');

  const totalFitted = (car.appliedUpgrades || []).length;
  const analystNote = analysts > 0
    ? `<p class="muted-text small">${analysts} Data Analyst${analysts > 1 ? 's' : ''} on staff - ${staffTotal('upgradeSlots')} extra slot${staffTotal('upgradeSlots') > 1 ? 's' : ''} in every tier.</p>`
    : `<p class="muted-text small">Hire a Data Analyst to open an extra slot in every tier.</p>`;
  return `
  <div class="modal-overlay" id="upgrade-modal" onclick="closeUpgradeModal(event)">
    <div class="modal modal-wide" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3>Upgrades - #${car.number || 1} ${car.name}</h3>
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
let teamView = 'drivers';
let staffRoleFilter = 'all';
function showStaffRole(role) {
  staffRoleFilter = STAFF_TYPES.some(t=>t.id===role) ? role : 'all';
  renderTab('team');
  document.getElementById('staff-role-filter')?.focus({preventScroll:true});
}

function showTeamView(view) {
  teamView = view === 'staff' ? 'staff' : 'drivers';
  renderTab('team');
  document.querySelector(`[data-team-view="${teamView}"]`)?.focus({ preventScroll: true });
}

let driverRecruitSort='rating';
function sortDriverRecruitment(value){driverRecruitSort=value;renderTab('team');document.getElementById('driver-sort')?.focus();}
function filterDriverRecruitment(value){const query=value.trim().toLowerCase();let count=0;document.querySelectorAll('[data-driver-candidate]').forEach(el=>{el.hidden=!el.dataset.driverName.includes(query);if(!el.hidden)count++;});document.getElementById('driver-results').textContent=`${count} drivers available`;}
function renderTeam() {
  const hiredIds = new Set(game.hiredDrivers.map(h => h.driverId));
  const playerCar = game.cars.find(c => c.assignedDriverId === 'player');
  const playerRow = playerCar ? `<div class="staff-row">
    <div class="staff-info"><span class="staff-name">${game.driverName} <span class="muted-text small">(You)</span></span>
      <span class="staff-meta">#${playerCar.number || 1} ${playerCar.name}</span>
      <span class="staff-meta">${Math.round(game.playerSkill)} OVR</span>
    </div>
  </div>` : '';

  const yourDriverRows = game.hiredDrivers.map(h => {
    const d   = HIREABLE_DRIVERS.find(dr => dr.id === h.driverId);
    const car = game.cars.find(c => c.id === h.carId);
    if (!d) return '';
    const skill = hiredDriverSkill(h);
    const start = h.startSkill != null ? h.startSkill : d.skill;
    const gained = Math.floor(skill) - Math.floor(start);
    const ceiling = h.potential != null ? h.potential : d.skill;
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${d.name}</span>
        <div class="staff-meta">
          ${Math.floor(skill)} OVR${gained > 0 ? ` <span class="green">+${gained}</span>` : ''}
          · ${fmt$(h.weeklyCost)} per race
        </div>
        <div class="staff-meta muted-text">
          ${car ? `#${car.number || 1} ${car.name}` : 'Unassigned'}
          ${!car ? `<select class="form-select" aria-label="Assign car to ${d.name}" onchange="handleAssignDriverCar('${d.id}',this.value)"><option value="">Assign another car</option>${game.cars.filter(c=>c.assignedDriverId!=='player'&&!hireForCar(c.id)).map(c=>`<option value="${c.id}">#${c.number} ${c.name}</option>`).join('')}</select>` : ''}
        </div>
        <details class="driver-development"><summary>Development</summary>
          <p>Aggression ${d.aggression} · Potential ${ceiling} · ${h.racesRun || 0} races run</p>
        </details>
      </div>
      <button class="btn btn-sm btn-danger" onclick="handleFireDriver('${d.id}')">Release</button>
    </div>`;
  }).join('');
  const driverRoster = playerRow + yourDriverRows || '<p class="team-empty">No drivers assigned. Recruit a driver for an available car.</p>';

  const staffRows = game.staff.map(s => {
    const type = STAFF_TYPES.find(t => t.id === s.typeId);
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${String(s.name).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))} <span class="staff-ovr">${s.overall || 79} OVR</span></span>
        <div class="staff-meta">${type?.name || 'Support Staff'}</div>
        <div class="staff-meta">${staffBenefitText(s)}</div>
        <div class="staff-meta muted-text">${fmt$(s.weeklyCost)} per race</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="handleFireStaff('${s.id}')">Release Staff</button>
    </div>`;
  }).join('') || '<p class="team-empty">No support staff yet. Recruit a specialist to improve your team.</p>';

  const availableDrivers = HIREABLE_DRIVERS.filter(d => !hiredIds.has(d.id)).sort((a,b)=>driverRecruitSort==='price'?a.weeklyCost-b.weeklyCost:b.skill-a.skill);
  const openSeats = freeCarsForHire().length;
  const seatWarning = game.cars.length === 0
    ? `<p class="form-warning">No car - buy a car before hiring a driver.</p>`
    : openSeats === 0
      ? `<p class="form-warning">Every car has a driver. <button class="link" onclick="showTab('market')">Buy another car</button> to recruit.</p>`
      : '';

  const driverRows = availableDrivers.map(d => {
    const signingFee = d.weeklyCost * 4;
    const canAfford  = game.money >= signingFee;
    const disabledReason = game.hiredDrivers.length >= MAX_HIRED_DRIVERS ? 'Driver Limit Reached'
      : openSeats === 0 ? 'No Free Car' : (game.reputation || 0) < (d.minReputation || 0) ? `Requires ${d.minReputation} Reputation` : !canAfford ? 'Not Enough Cash' : '';

    return `<div class="staff-row" data-driver-candidate="${d.id}" data-driver-name="${careerArchiveEscape(d.name.toLowerCase())}">
      <div class="staff-info">
        <span class="staff-name">${d.name} <span class="staff-ovr">${d.skill} OVR</span></span>
        <div class="staff-meta">${d.aggression>=75?'Aggressive racer':d.aggression<=50?'Measured racer':'Balanced racer'}</div>
      </div>
      <div class="recruit-cost"><strong><span class="recruit-cost-label">Signing fee </span>${fmt$(signingFee)}</strong><span>${fmt$(d.weeklyCost)} per race</span></div>
      ${!disabledReason ? `<button class="btn btn-sm btn-primary" aria-label="Hire ${d.name}" onclick="openHireDriverModal('${d.id}')">Hire</button>`
                  : `<button class="btn btn-sm" disabled>${disabledReason}</button>`}
    </div>`;
  }).join('');

  const availableStaff = STAFF_CANDIDATES.filter(c=>!game.staff.some(s=>s.candidateId===c.id));
  const filteredStaff = availableStaff.filter(c=>staffRoleFilter==='all' || c.typeId===staffRoleFilter);
  const staffHireRows = filteredStaff.map(candidate => {
    const type = STAFF_TYPES.find(t=>t.id===candidate.typeId);
    const current = game.staff.filter(s=>s.typeId===type.id).length;
    const cost = staffSalary(candidate), sigFee = cost * 4;
    const reason = current >= type.max ? 'Staff Limit Reached' : game.money < sigFee ? 'Not Enough Cash' : '';
    return `<div class="staff-row" data-staff-candidate="${candidate.id}">
      <div class="staff-info">
        <span class="staff-name">${candidate.name} <span class="staff-ovr">${candidate.overall} OVR</span></span>
        <div class="staff-meta">${type.name}</div>
        <div class="staff-meta">${staffBenefitText(candidate)}</div>
        <div class="staff-meta muted-text">${current}/${type.max} ${type.name.toLowerCase()}${type.max>1?'s':''} hired</div>
      </div>
      <div class="recruit-cost"><strong><span class="recruit-cost-label">Signing fee </span>${fmt$(sigFee)}</strong><span>${fmt$(cost)} per race</span></div>
      ${reason ? `<button class="btn btn-sm" disabled>${reason}</button>` : `<button class="btn btn-sm btn-primary" aria-label="Hire ${candidate.name}" onclick="handleHireStaff('${candidate.id}')">Hire</button>`}
    </div>`;
  }).join('') || '<p class="team-empty">No available specialists in this role.</p>';

  return `
  <div class="page-header"><h2>Team</h2><p>${openSeats} open seat${openSeats===1?'':'s'} · ${fmt$(game.money)} available</p></div>
  <div class="team-toolbar">
    <div class="team-views" role="group" aria-label="Manage team members">
      <button class="btn ${teamView === 'drivers' ? 'team-view-active' : 'btn-ghost'}" data-team-view="drivers" aria-pressed="${teamView === 'drivers'}" onclick="showTeamView('drivers')">Drivers</button>
      <button class="btn ${teamView === 'staff' ? 'team-view-active' : 'btn-ghost'}" data-team-view="staff" aria-pressed="${teamView === 'staff'}" onclick="showTeamView('staff')">Support Staff</button>
    </div>
    <p class="team-budget">Available cash <strong>${fmt$(game.money)}</strong></p>
  </div>
  <div class="team-workspace">
    <section class="card team-roster" aria-labelledby="team-roster-title">
      <h3 class="card-header" id="team-roster-title">${teamView === 'drivers' ? 'Your Drivers' : 'Your Support Staff'}</h3>
      ${teamView === 'drivers' ? driverRoster : staffRows}
    </section>
    <section class="card team-recruitment" aria-labelledby="team-recruitment-title">
      <h3 class="card-header" id="team-recruitment-title">${teamView === 'drivers' ? 'Recruit Drivers' : 'Recruit Support Staff'}</h3>
      <p class="section-copy">One signing fee upfront. Salary each race.</p>
      ${teamView === 'drivers' ? seatWarning : ''}
      <p class="recruitment-caption"><span>${teamView === 'drivers' ? `${availableDrivers.length} available · ${game.hiredDrivers.length}/${MAX_HIRED_DRIVERS} hired` : `${filteredStaff.length} specialists available`}</span><span>${teamView==='drivers'?'OVR reflects driving skill':'Specialists improve your team'}</span></p>
      ${teamView === 'staff' ? `<div class="staff-filter"><label for="staff-role-filter">Staff role</label><select class="form-select" id="staff-role-filter" onchange="showStaffRole(this.value)"><option value="all">All roles</option>${STAFF_TYPES.map(t=>`<option value="${t.id}" ${staffRoleFilter===t.id?'selected':''}>${t.name}</option>`).join('')}</select></div>` : ''}
      ${teamView==='drivers'?`<div class="driver-browse"><label>Find a driver<input type="search" placeholder="Search by name" oninput="filterDriverRecruitment(this.value)"></label><label>Sort by<select id="driver-sort" class="form-select" onchange="sortDriverRecruitment(this.value)"><option value="rating" ${driverRecruitSort==='rating'?'selected':''}>Highest OVR</option><option value="price" ${driverRecruitSort==='price'?'selected':''}>Lowest signing fee</option></select></label></div><p id="driver-results" class="small muted-text">${availableDrivers.length} drivers available</p>`:''}
      <div class="recruitment-columns" aria-hidden="true"><span>${teamView === 'drivers' ? 'Driver' : 'Specialist'}</span><span>Signing fee / salary</span><span></span></div>
      <div class="recruitment-list" tabindex="0" aria-label="${teamView === 'drivers' ? 'Available drivers' : 'Available support staff'}">${teamView === 'drivers' ? driverRows : staffHireRows}</div>
    </section>
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
        <p>${d.skill} OVR · Aggression ${d.aggression}</p>
        <p>${fmt$(d.weeklyCost)} per race | Signing fee: ${fmt$(d.weeklyCost*4)}</p>
        <label class="form-label" for="hire-car-select">Assign to car</label>
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
  <div class="page-header"><h2>${series.name} - Year ${game.season.year} Schedule</h2></div>
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
let marketView='cars';
function showMarketView(view){marketView=['cars','loans','charity'].includes(view)?view:'cars';renderTab('market');document.querySelector(`[data-market-view="${marketView}"]`)?.focus({preventScroll:true});}
function renderMarket() {
  const series   = SERIES[game.currentSeries];
  const cls      = CAR_CLASSES[series.carClass];
  const canBuy   = game.money >= cls.buyCost;
  // ── Bank ────────────────────────────────────────────────
  const loans = getLoans();
  const debt  = totalDebt();
  const limit = creditLimit();
  const avail = creditAvailable();

  const loanRows = loans.map(l => {
    const late = l.racesLeft <= 0;
    return `<div class="loan-row${late ? ' is-late' : ''}">
      <div class="loan-info">
        <span class="loan-name">${l.name}${late ? ' - OVERDUE' : ''}</span>
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
        : `<button class="btn btn-sm" disabled>${loans.length >= 3 ? 'Loan Limit Reached' : 'No Credit Available'}</button>`}
    </div>`;
  }).join('');

  const creditPct = limit > 0 ? Math.round((debt / limit) * 100) : 0;
  const bankCard = `
    <div class="card mt">
      <div class="card-header" id="market-loans">Loans and Financing</div>
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
      <section aria-label="Loan options">
      <h3>Take out a loan</h3>
      <div>
      <p class="section-copy">Repay on time to avoid ${Math.round(LOAN_LATE_RATE * 100)}% interest per race on the remaining balance. Your reputation affects your credit limit.</p>
      ${offerRows}
      </div>
      </section>
    </div>`;

  // ── Charity ─────────────────────────────────────────────
  const rep = game.reputation != null ? game.reputation : 50;
  const canGive = canDonate();
  const charityRows = CHARITY_CAUSES.map(c => {
    const cost = charityCost(c, game.currentSeries);
    const gain = charityRepGain(c, rep);
    const afford = game.money >= cost;
    return `<div class="staff-row">
      <div class="staff-info">
        <span class="staff-name">${c.name}</span>
        <div class="staff-meta">${fmt$(cost)} · <span class="green">+${gain} reputation</span></div>
        <div class="staff-meta muted-text">${c.blurb}</div>
      </div>
      ${canGive && afford
        ? `<button class="btn btn-sm btn-primary" onclick="handleDonate('${c.id}')">Donate</button>`
        : `<button class="btn btn-sm" disabled>${!canGive ? 'Already Donated' : 'Not Enough Cash'}</button>`}
    </div>`;
  }).join('');

  const charityCard = `
    <div class="card mt">
      <div class="card-header">Charity</div>
      <p class="muted-text small">Giving back builds your standing in the sport. One pledge per race weekend${
        game.charityGiven ? ` · ${fmt$(game.charityGiven)} given so far` : ''}.</p>
      ${!canGive ? `<p class="form-warning">You have already given this race weekend.</p>` : ''}
      <div class="stat-row">
        <span class="stat-label">Reputation</span>
        <div class="stat-bar-wrap"><div class="stat-bar ${rep >= 60 ? 'bar-green' : rep >= 40 ? 'bar-yellow' : 'bar-red'}" style="width:${clamp(rep,0,100)}%"></div></div>
        <span class="stat-value">${rep}</span>
      </div>
      <details class="ui-details">
        <summary>Choose a cause</summary>
        <div class="ui-details-body">${charityRows}</div>
      </details>
    </div>`;

  const buyCard=`<div class="card">
        <div class="card-header">Buy a Car</div>
        <p class="section-copy">${cls.description}</p>
        <div class="team-stat"><span>Cost</span><span class="highlight">${fmt$(cls.buyCost)}</span></div>
        <div class="team-stat"><span>Your Cars</span><span>${game.cars.length} / ${MAX_TEAM_CARS}</span></div>
        <details class="ui-details">
        <summary>Car specifications and resale</summary>
        <div class="ui-details-body">
        <div class="team-stat"><span>Sell Value</span><span>${fmt$(cls.sellValue)}</span></div>
        <div class="team-stat"><span>Base Speed</span><span>${cls.baseStats.speed}</span></div>
        <div class="team-stat"><span>Base Handling</span><span>${cls.baseStats.handling}</span></div>
        <div class="team-stat"><span>Base Reliability</span><span>${cls.baseStats.reliability}</span></div>
        </div>
        </details>
        ${game.cars.length >= MAX_TEAM_CARS
          ? `<button class="btn mt" disabled>Team full (${MAX_TEAM_CARS} cars)</button>`
          : canBuy
            ? `<button class="btn btn-primary mt" onclick="handleBuyCar()">Buy Car (${fmt$(cls.buyCost)})</button>`
            : `<button class="btn mt" disabled>Not enough money (need ${fmt$(cls.buyCost)})</button>`}
      </div>`;
  return `<div class="page-header"><h2>Market</h2><p>${series.name}</p></div><nav class="market-tabs team-views" aria-label="Market sections">${[['cars','Cars'],['loans','Financing'],['charity','Charity']].map(([id,label])=>`<button class="btn ${marketView===id?'team-view-active':'btn-ghost'}" data-market-view="${id}" aria-pressed="${marketView===id}" onclick="showMarketView('${id}')">${label}</button>`).join('')}</nav><div class="market-workspace">${marketView==='cars'?`<div class="market-cars">${buyCard}<aside class="market-finance-summary"><h3>Room for your next car</h3><p class="section-copy">${game.cars.length} of ${MAX_TEAM_CARS} garage spaces used.</p><div class="team-stat"><span>Available credit</span><strong class="green">${fmt$(avail)}</strong></div><div class="team-stat"><span>Outstanding debt</span><strong>${fmt$(debt)}</strong></div><button class="btn btn-secondary" onclick="showMarketView('loans')">View loan options</button></aside></div>`:marketView==='loans'?bankCard:charityCard}</div>`;

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
    return `<button type="button" class="${cls} standing-driver" onclick="showDriverSeasonStats('${e.id}')" aria-label="View season stats for ${careerArchiveEscape(standingIdentity(e).driver)}">
      <span class="st-pos">${pos}</span>
      <span class="st-name">${standingName(e)}${(game.rivalries||[]).includes(e.id)?' <span class="red">Rival</span>':''}</span>
      <span class="st-races">${e.races}</span>
      <span class="st-wins">${e.wins}</span>
      <span class="st-top5">${e.top5}</span>
      <span class="st-pts">${e.points} <span class="points-gap ${i===0?'green':'red'}" aria-label="${i===0?'Points ahead of second':'Points behind leader'}">${i===0?'+'+(e.points-(sorted[1]?.points??e.points)):'-'+(sorted[0].points-e.points)}</span></span>
    </button>`;
  }).join('');

  return `
  <div class="page-header"><h2>Standings</h2><p>${series.name}</p></div>
  <div class="standings-table">
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
  const weightTotal = Math.max(0.01, track.speedW + track.handW);
  const speedEmphasis = Math.round(track.speedW / weightTotal * 100);
  const handlingEmphasis = 100 - speedEmphasis;

  // Which cars can the player enter?
  const cars = game.cars;
  // A car with a hired driver in it is not available for you to drive.
  const taken = new Map();
  (game.hiredDrivers || []).forEach(h => {
    const drv = HIREABLE_DRIVERS.find(d => d.id === h.driverId);
    if (drv) taken.set(h.carId, drv.name);
  });
  const openCars = cars.filter(c => !taken.has(c.id));
  const idleCars = cars.filter(c => taken.has(c.id) === false && c.assignedDriverId !== 'player');

  const driverCar = openCars.find(c => c.assignedDriverId === 'player') || openCars[0];
  const carSection = `
    <p class="muted-text">Select which car you will drive:</p>
    ${openCars.map(c => `
      <label class="radio-row">
        <input type="radio" name="drive-car" value="${c.id}" ${c === driverCar ? 'checked' : ''}>
        <span class="race-car-choice"><strong>#${c.number || 1} ${c.name}</strong><span>Speed ${c.speed} · Handling ${c.handling} · Condition ${Math.round(c.condition)}%</span></span>
      </label>`).join('') || '<p class="form-warning">Every car has a hired driver in it - release a driver to drive one yourself.</p>'}
    ${taken.size ? `
      <div class="card-header mt">Entered By Your Drivers</div>
      ${[...taken.entries()].map(([carId, nm]) => {
        const c = game.cars.find(x => x.id === carId);
        return `<div class="team-stat"><span>#${c?.number || 1} ${c?.name || 'Car'}</span><span>${nm}</span></div>`;
      }).join('')}` : ''}
    ${idleCars.length > 1 || (idleCars.length === 1 && idleCars[0] !== driverCar) ? `
      <p class="form-warning">Some cars have no driver assigned and will not be entered. Assign a driver in the Team tab.</p>` : ''}
  `;
  return `
  <div class="race-setup-page">
    <div class="card">
      <div class="card-header">Race Weekend</div>
      <div class="race-info-box big">
        <span class="race-track-name big">${track.name}</span>
      </div>
      <div class="race-details-grid">
        <div class="team-stat"><span>Entry Fee per Car</span><span>${fmt$(series.entryFee)}</span></div>
        <div class="team-stat"><span>1st Prize</span><span>${fmt$(series.prize[0])}</span></div>
      </div>
      <details class="ui-details">
        <summary>Simulation car setup</summary>
        <div class="ui-details-body race-details-grid">
        <div class="team-stat"><span>Speed Emphasis</span><span>${speedEmphasis}%</span></div>
        <div class="team-stat"><span>Handling Emphasis</span><span>${handlingEmphasis}%</span></div>
        </div>
      </details>
    </div>
    <div class="card mt">
      <div class="card-header">Car Selection</div>
      ${carSection}
    </div>
    <div class="race-choice-group">
      <p class="section-copy">Drive a 3D sprint yourself, or simulate this event for an instant result. Both count toward your season.</p>
      <div class="btn-row">
      <button class="btn btn-primary btn-lg" id="btn-start-race" onclick="handleStartRace()">Drive Race</button>
      <button class="btn btn-ghost btn-lg" onclick="handleSimulateRace()">Simulate Race</button>
      <button class="btn btn-ghost" onclick="showScreen('game')">Back to Dashboard</button>
      </div>
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
  if (!playerResult?.isPlayer) throw new Error('Race results require the player driving for their team.');
  const topRows = results.slice(0, 10).map(r => `
    <div class="result-row ${r.isPlayer ? 'player-result' : ''}">
      <span class="res-pos ${r.position === 1 ? 'podium' : ''}">${r.position}</span>
      <span class="res-name">${resultName(r)}</span>
      <span class="res-pts">${r.points}pts</span>
      <span class="res-prize green">${fmt$(r.prize)}</span>
      ${r.dnf ? '<span class="badge badge-red">DNF</span>' : ''}
    </div>`).join('');

  const isWinner = playerResult.position === 1;
  let playerSection = '';
  const pos = playerResult.position;
  if (isWinner) {
    const nameParts = String(playerResult.displayName || '').split(' / ');
    const winnerDriver = nameParts[nameParts.length - 1] || game.driverName || 'You';
    const winnerTeam = nameParts.length > 1 ? nameParts[0] : game.teamName;
    playerSection = `
      <div class="race-win-banner">
        <div class="race-win-rail"></div>
        <h3 class="race-win-title" id="race-win-title">Race Winner</h3>
        <div class="race-win-driver">${winnerDriver}</div>
        <div class="race-win-team">${winnerTeam}</div>
        <div class="race-win-stats">
          <div class="race-win-stat"><strong>${fmt$(playerResult.prize)}</strong><span>Race Purse</span></div>
          <div class="race-win-stat"><strong>${playerResult.points}</strong><span>Championship Points</span></div>
        </div>
      </div>`;
  } else {
    playerSection = `
      <div class="player-result-hero">
        <div>
          <div class="big-pos">${pos}${ordinal(pos)} place ${playerResult.dnf ? '<span class="badge badge-red">DNF</span>' : ''}</div>
          <div class="big-prize green">${fmt$(playerResult.prize)} earned</div>
          <div class="muted-text">${playerResult.points} championship points</div>
        </div>
      </div>`;
  }
  return `
  <div class="modal-overlay" id="results-modal" role="dialog" aria-modal="true" aria-labelledby="${isWinner ? 'race-win-title' : 'race-results-title'}">
    <div class="modal modal-wide${isWinner ? ' race-win-modal' : ''}">
      ${isWinner ? '' : `<div class="modal-header"><h3 id="race-results-title">Race Results</h3></div>`}
      ${isWinner ? playerSection : ''}
      <div class="modal-body">
        ${isWinner ? '' : playerSection}
        <div class="card-header mt">Top 10 Finishers</div>
        <div class="results-list">${topRows}</div>
        ${results.length > 10 ? `<p class="muted-text small">${results.length - 10} more finishers...</p>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="btn-close-results" onclick="handleCloseResults()">Next</button>
      </div>
    </div>
  </div>`;
}

// ─── End of Season ──────────────────────────────────────────
function renderEndSeasonModal(info) {
  const purse = (info.playerPayout || 0) + (info.teamPayout || 0);

  const payoutRows = (info.payouts || []).map(p => `
    <div class="result-row ${p.isPlayer ? 'player-result' : p.isTeamCar ? 'team-standing' : ''}">
      <span class="res-pos ${p.pos === 1 ? 'podium' : ''}">${p.pos}</span>
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
          <div class="champ-title">CHAMPION</div>
          <div class="champ-eyebrow">${info.seriesName} · Season ${info.year}</div>
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
      <div class="modal-header"><h3>Season Over - ${info.seriesName}</h3></div>
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
  const allRaces  = [...game.cars,...(game.retiredCars||[])].reduce((s, c) => s + (c.races || 0), 0);
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
      <div class="card-header">Last Season - ${last.series}, Year ${last.year}</div>
      <div class="card-body">
        <div class="champ-stats">
          <div><span class="champ-stat-num">${last.finalPos}${ordinal(last.finalPos)}</span><span class="champ-stat-label">Championship Finish</span></div>
          <div><span class="champ-stat-num">${last.wins || 0}</span><span class="champ-stat-label">Wins</span></div>
          <div><span class="champ-stat-num">${fmt$(last.payout || 0)}</span><span class="champ-stat-label">Cash Earned</span></div>
        </div>
      </div>
    </div>` : `
    <div class="card mb">
      <div class="card-header">Last Season</div>
      <div class="card-body"><p class="muted-text">You have not completed a season yet.</p></div>
    </div>`;

  const histRows = hist.slice().reverse().map(h => `
    <div class="result-row ${h.champion ? 'player-result' : ''}">
      <span class="res-pos ${h.finalPos === 1 ? 'podium' : ''}" style="color:${h.finalPos === 1 ? 'var(--warn)' : 'var(--text)'}">${h.finalPos}</span>
      <span class="res-name">Year ${h.year} <span class="st-team">${h.series}</span></span>
      <span class="res-pts">${h.wins || 0}W</span>
      <span class="res-prize green">${fmt$(h.payout || 0)}</span>
    </div>`).join('') || '<p class="muted-text">No completed seasons yet.</p>';

  return `
  <div class="page-header"><h2>Career</h2><button class="btn btn-danger" onclick="showCareerRetirement()">Retire</button></div>

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
        <div class="card-header">Credentials</div>
        <div class="card-body">
          <div class="stat-row">
            <span class="stat-label">Reputation</span>
            <div class="stat-bar-wrap"><div class="stat-bar ${repCls}" style="width:${clamp(rep,0,100)}%"></div></div>
            <span class="stat-value">${rep}</span>
          </div>
          ${statBar('Driver Skill', Math.round(game.playerSkill))}
          <div class="team-stat"><span>Team</span><span>${game.teamName}</span></div>
          <div class="team-stat"><span>Series</span><span>${SERIES[game.currentSeries].name}</span></div>

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
          <div class="team-stat"><span>Cash Earned</span><span class="green">${fmt$(earnings)}</span></div>
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
          <div class="team-stat"><span>Total Cash Earned</span><span class="green">${fmt$(careerPayouts)}</span></div>
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
  const unsaved = (typeof currentSlot === 'undefined' || currentSlot === null);
  const slotLabel = unsaved ? 'Not saved yet' : `Slot ${currentSlot + 1}`;

  return `
  <div class="page-header"><h2>Settings</h2></div>

  <div class="card mb">
    <div class="card-header">Difficulty</div>
    <div class="card-body">
      <p class="muted-text small">Choose how strongly the AI races you. Changes apply to your next race.</p>
      <div class="difficulty-grid lg">
        ${DIFFICULTIES.map(d => `
          <button type="button" class="difficulty-card${d.id === curDiff ? ' selected' : ''}"
               data-diff="${d.id}" aria-pressed="${d.id === curDiff}" onclick="handleSetDifficulty('${d.id}')">
            <span class="difficulty-name">${d.name} <span class="difficulty-wins">${game.winsByDifficulty?.[d.id] || 0} ${(game.winsByDifficulty?.[d.id] || 0) === 1 ? 'win' : 'wins'}</span></span>
            <span class="difficulty-blurb">${d.blurb}</span>
          </button>`).join('')}
      </div>
    </div>
  </div>

  <div class="card mb"><div class="card-header">Crashes and Vehicle Health</div><div class="card-body">${renderRaceRuleControls(curDiff,game.raceRules,'career')}</div></div>
  <div class="card mb">
    <div class="card-header">Auto Save</div>
    <div class="card-body">
      <div class="team-stat"><span>Auto-saving to</span><span class="${unsaved ? 'red' : 'green'}">${slotLabel}</span></div>
      <p class="muted-text small">${unsaved ? 'Choose a slot to save this career and enable automatic saving.' : 'Career changes and race results are saved to this slot automatically.'}</p>
      <div class="btn-row mt">
        <button class="btn btn-primary" onclick="handleSaveGame()">${unsaved ? 'Choose Save Slot' : 'Save Career'}</button>
        <button class="btn btn-ghost" onclick="showLoadModal()">Load Career</button>
      </div>
    </div>
  </div>
  <div class="card mb">
    <div class="card-header">Start over</div>
    <p class="section-copy">${unsaved ? 'Starting a new career discards this unsaved career.' : `Starting a new career deletes the current career from Slot ${currentSlot + 1}. Other slots are kept.`}</p>
    <button class="btn btn-danger" onclick="handleNewGamePrompt()">New Career</button>
  </div>
  <div class="card mb">
    <div class="card-header">Career Backup</div>
    <p class="section-copy">Download a JSON copy of this career, including your trophies, race history, and team.</p>
    <button class="btn btn-secondary" onclick="handleExportCareer()">Export this career</button>
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
        <button class="btn btn-sm btn-primary" onclick="handleSaveToSlot(${i})">Save to Slot ${i + 1}</button>
        ${filled ? `<button class="btn btn-sm btn-danger" onclick="handleDeleteSlot(${i})">Delete</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
  <div class="modal-overlay" id="save-slot-modal">
    <div class="modal">
      <div class="modal-header">
        <h3>Save Career</h3>
        <button class="modal-close" onclick="closeSaveModal()">Close</button>
      </div>
      <div class="modal-body save-slots"><p>Saving to an occupied slot replaces the career in it.</p>${slots}</div>
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
        <h3>Load Career</h3>
        <button class="modal-close" onclick="closeSaveModal()">Close</button>
      </div>
      <div class="modal-body save-slots">
        ${!hasAnySave ? '<p class="muted-text">No saved careers. Start a new career, then choose a save slot.</p>' : slots}
      </div>
      <div class="modal-footer"><button class="btn btn-ghost btn-lg hall-of-fame-button" onclick="showHallOfFame()">Hall of Fame</button></div>
    </div>
  </div>`;
}

// ─── Quick Race modal ─────────────────────────────────────────
// Shared career/Quick Race paint-and-number controls.
function renderCarCustomizer(car, i, career = false) {
  const id = career ? `career-custom-${car.id}` : `quick-player-${i+1}`;
  const prefix = career ? `setCareerCarAppearance('${car.id}',` : `setQuickRaceCar(${i},`;
  const color = car.color || '#e8001d', number = car.number || 1;
  if(!career)return `<section class="quick-car-editor" id="${id}" ${i===1&&quickRacePlayers===1?'hidden':''}><h4>Player ${i+1}</h4><div class="quick-car-preview" style="--car-color:${color}" aria-hidden="true"><strong style="color:${carAppearance(car).numberColor}">${String(number).padStart(2,'0')}</strong></div><p class="muted-text small">Number, paint and stripes.</p><button class="btn btn-primary car-studio-open" onclick="openCarStudio('quick',${i})">Customize Car</button></section>`;
  return `<section class="quick-car-editor" id="${id}" ${!career && i === 1 && quickRacePlayers === 1 ? 'hidden' : ''}>
    <h4>${career ? 'Car appearance' : `Player ${i+1}`}</h4>
    ${!career?`<button class="btn btn-primary" onclick="openCarStudio('quick',${i})">Customize Car</button>`:''}
    <div class="quick-car-controls">
      <div class="quick-car-preview" style="--car-color:${color}" aria-hidden="true"><strong>${String(number).padStart(2,'0')}</strong></div>
      <div><label for="${career ? id+'-number' : 'quick-number-'+i}">Car number</label>
        <input id="${career ? id+'-number' : 'quick-number-'+i}" type="number" min="1" max="99" step="1" value="${number}" aria-label="${career ? car.name : 'Player '+(i+1)} car number" onchange="${prefix}'number',this.value)">
      </div>
    </div>
    <div class="quick-paint" role="group" aria-label="${career ? car.name : 'Player '+(i+1)} color">
      ${QUICK_COLORS.map((c,n) => `<button type="button" class="quick-swatch${career ? ' color-swatch' : ''}" style="--paint:${c}" data-color="${c}" aria-label="${['Red','Blue','Green','Gold','White','Purple','Orange','Graphite'][n]}" aria-pressed="${color === c}" onclick="${prefix}'color','${c}')"></button>`).join('')}
      <label class="quick-custom-paint">Custom<input type="color" value="${color}" aria-label="${career ? car.name : 'Player '+(i+1)} custom color" oninput="${prefix}'color',this.value)"></label>
    </div>
  </section>`;
}

function renderQuickRaceModal() {
 const summaries={beginner:'Learn the draft.',amateur:'Find your rhythm.',semipro:'Keep the tow.',pro:'Earn every position.',allout:'Maximum competition.'};
 return `<div class="modal-overlay" id="quick-race-modal"><div class="modal quick-setup-modal quick-wizard" role="dialog" aria-modal="true" aria-labelledby="quick-title">
 <div class="modal-header"><div><h3 id="quick-title">Quick Race</h3><p class="small muted-text" id="quick-step-label">Race setup · Step 1 of 2</p></div><button class="modal-close" onclick="document.getElementById('quick-race-modal')?.remove()">Close</button></div>
 <div class="modal-body quick-setup-body"><div id="quick-stage-race" class="quick-race-stage">
 <section><h4>Difficulty</h4><div class="difficulty-grid">${DIFFICULTIES.map(d=>`<button type="button" class="difficulty-card${d.id===quickRaceDifficulty?' selected':''}" data-diff="${d.id}" aria-pressed="${d.id===quickRaceDifficulty}" onclick="setQuickRaceDifficulty('${d.id}')"><span class="difficulty-name">${d.name}</span></button>`).join('')}</div><p id="quick-difficulty-hint" class="small muted-text">${summaries[quickRaceDifficulty]}</p></section>
 <section><h4>Series</h4><div class="quick-series">${SERIES.map(s=>`<button type="button" class="quick-series-btn" data-field-size="${s.fieldSize}" aria-pressed="false" onclick="selectQuickRaceSeries(${s.fieldSize})"><span class="quick-series-name" style="--series-color:${s.color}">${s.name}</span><span class="quick-series-meta">${s.fieldSize} cars</span></button>`).join('')}</div></section>
 <section><h4>Race settings</h4><div id="quick-race-rules">${renderRaceRuleControls(quickRaceDifficulty,quickRaceRules,'quick')}</div></section></div>
 <div id="quick-stage-cars" hidden><div class="quick-player-toolbar"><h4>Players and cars</h4><div class="quick-player-mode" role="group" aria-label="Player mode"><button class="btn" data-players="1" aria-pressed="${quickRacePlayers===1}" onclick="setQuickRacePlayers(1)">Single player</button><button class="btn" data-players="2" aria-pressed="${quickRacePlayers===2}" onclick="setQuickRacePlayers(2)">Dual player</button></div></div>
 <div class="quick-setup-cars">${quickRaceCars.map((car,i)=>renderCarCustomizer(car,i)).join('')}</div><p class="small muted-text quick-key-help">Player 1: A / S / D · Player 2: J / K / L · Middle key brakes</p><p class="form-warning" id="quick-number-warning" hidden>Choose a different number for each player.</p></div></div>
 <div class="modal-footer quick-race-footer"><button type="button" class="btn btn-secondary" id="quick-back" onclick="setQuickRaceStep(1)" hidden>Back</button><button type="button" class="btn btn-primary btn-lg" id="quick-next" onclick="setQuickRaceStep(2)" disabled>Next: Players and cars</button><button type="button" class="btn btn-primary btn-lg" id="btn-quick-race-confirm" onclick="confirmQuickRace()" hidden disabled>Confirm Race</button></div></div></div>`;
}

// ─── Listeners wired after each tab render ───────────────────
function attachTabListeners(tabName) {
  // Nothing extra for most tabs; specific interactions are via onclick attributes
}

function renderRaceRuleControls(difficulty,preferences={},scope='career') {
  const eligible=['semipro','pro','allout'].includes(difficulty);
  if(scope==='quick')return `<div class="race-rule-controls compact-rules"><p class="small muted-text">${eligible?'Recoverable contact and damage.':'Available on Semi-Pro and above.'}</p>${[['crashes','Contact crashes'],['damage','Vehicle damage']].map(([key,label])=>`<label class="radio-row"><input type="checkbox" data-race-rule="${key}" ${eligible&&preferences[key]!==false?'checked':''} ${eligible?'':'disabled'} onchange="handleRaceRule('${key}',this.checked,'quick')"><span>${label}</span></label>`).join('')}</div>`;

  return `<div class="race-rule-controls"><p class="section-copy">${eligible ? 'Crashes recover at reduced performance. Normal front/rear drafting does not trigger side-contact crashes.' : 'Crashes and vehicle health are unavailable on Beginner and Amateur. Your preferences return on higher difficulties.'}</p>
    <label class="radio-row"><input type="checkbox" data-race-rule="crashes" ${eligible&&preferences?.crashes!==false?'checked':''} ${eligible?'':'disabled'} onchange="handleRaceRule('crashes',this.checked,'${scope}')"><span>Contact crashes<span class="form-hint">Repeated aggressive side contact can cause recoverable wrecks. Off also prevents zero-health spinouts.</span></span></label>
    <label class="radio-row"><input type="checkbox" data-race-rule="damage" ${eligible&&preferences?.damage!==false?'checked':''} ${eligible?'':'disabled'} onchange="handleRaceRule('damage',this.checked,'${scope}')"><span>Vehicle damage${scope==='career'?' and lifetime wear':''}<span class="form-hint">Hits lower race health and performance.${scope==='career'?' Repairs restore condition, not lifetime health. A typical car is intended to last about 40 races; rough treatment shortens its life.':''}</span></span></label></div>`;
}
function renderVehicleGraveyard() {
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cars=(game.retiredCars||[]).map(c=>`<article class="graveyard-car"><h4>#${esc(c.number)} ${esc(c.name)}</h4><p class="muted-text">${esc(CAR_CLASSES[c.classId]?.name || c.classId)} · Retired in Year ${esc(c.retiredYear)}, race ${esc(c.retiredRace)}</p><div class="team-stat"><span>Last driver</span><span>${esc(c.lastDriver||'Not recorded')}</span></div><div class="team-stat"><span>Lifetime health</span><span>${esc(Math.round(c.lifetimeHealth??0))}%</span></div>${['speed','handling','reliability','condition','races','wins','totalPoints'].map(k=>`<div class="team-stat"><span>${{totalPoints:'Career points',speed:'Speed',handling:'Handling',reliability:'Reliability',condition:'Final condition',races:'Races',wins:'Wins'}[k]}</span><span>${esc(Math.round(c[k]||0))}</span></div>`).join('')}<p>Upgrades: ${(c.appliedUpgrades||[]).map(id=>esc(CAR_CLASSES[c.classId]?.upgrades.find(u=>u.id===id)?.name || id)).join(', ') || 'None'}</p></article>`).join('');
 return `<div class="modal-overlay" id="graveyard-modal" role="dialog" aria-modal="true" aria-labelledby="graveyard-title"><div class="modal modal-wide"><div class="modal-header"><h3 id="graveyard-title">Vehicle Graveyard</h3><button class="btn btn-ghost" onclick="closeVehicleModal('graveyard-modal')">Close</button></div><div class="modal-body">${cars || '<p>No retired vehicles. Cars that reach zero lifetime health will be remembered here.</p>'}</div></div></div>`;
}

function careerArchiveEscape(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showCareerRetirement() {
  if(!game)return;
  document.getElementById('career-retire-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-overlay" id="career-retire-modal" role="dialog" aria-modal="true" aria-labelledby="retire-title"><div class="modal"><div class="modal-header"><h3 id="retire-title">Retire ${careerArchiveEscape(game.driverName)}?</h3></div><div class="modal-body"><p>This permanently ends your career and frees its save slot. A career recap will be kept in the Hall of Fame on this browser. You cannot resume a retired career.</p></div><div class="modal-footer"><button class="btn btn-secondary" onclick="document.getElementById('career-retire-modal').remove()">Cancel</button><button class="btn btn-danger" onclick="confirmCareerRetirement()">Confirm Retirement</button></div></div></div>`);
  document.querySelector('#career-retire-modal .btn-secondary')?.focus();
}
function confirmCareerRetirement() {
  const result=retireCareer();
  if(!result.ok){toast(result.msg,'error');return;}
  document.getElementById('career-retire-modal')?.remove();
  showScreen('intro');showCareerMilestoneNews('retirement',getHallOfFame().at(-1));
}
function showHallOfFame(index=null) {
  let records;try{records=getHallOfFame();}catch(e){toast('Hall of Fame could not be read. No records were changed.','error');return;}
  closeSaveModal();document.getElementById('hall-of-fame-modal')?.remove();
  const esc=careerArchiveEscape,r=index===null?null:records[index];
  const stat=(label,value)=>`<div class="team-stat"><span>${label}</span><span>${esc(value)}</span></div>`;
  const body=r?`<h4>${esc(r.driverName)}</h4><p>${esc(r.teamName)} · ${esc(r.series)} · Year ${r.year}</p>${r.sponsors?stat('Sponsorship Earnings',fmt$(r.sponsors.totalEarned))+stat('Final Partners',r.sponsors.partners.join(', ')||'None'):''}${stat('Career Wins',r.wins)}${stat('Championships',r.titles)}${stat('Seasons Completed',r.seasons)}${stat('Final Reputation',r.reputation)}${stat('Cash at Retirement',fmt$(r.money))}${r.trophies?`<button class="btn btn-secondary" onclick="showArchivedTrophies(${index})">Trophy Case (${r.trophies.length})</button>`:''}${r.vehicles?`<h4 class="mt">Vehicle Graveyard</h4>${renderArchivedVehicles(r.vehicles)}`:'<p class="muted-text">Vehicle records were not stored with this older recap.</p>'}<button class="btn btn-ghost" onclick="showCareerMilestoneNews('retirement',getHallOfFame()[${index}])">Retirement News</button><h4 class="mt">Final Season</h4>${stat('Starts',r.season.races)}${stat('Points',r.season.points)}${stat('Top 5 Finishes',r.season.top5)}${stat('Top 10 Finishes',r.season.top10)}<h4 class="mt">Season History</h4>${r.history.map(h=>stat(`${h.series} · Year ${h.year}`,`${ordinal(h.finalPos)} · ${h.wins||0} wins`)).join('')||'<p>No completed seasons.</p>'}`:records.map((r,i)=>`<div class="save-slot"><div class="save-slot-info"><strong>${esc(r.driverName)}</strong><p>${esc(r.teamName)} · ${r.wins} wins · ${r.titles} championships</p></div><button class="btn btn-primary" onclick="showHallOfFame(${i})">View Recap</button></div>`).join('')||'<p>No retired drivers yet. Retire a career to preserve its recap here.</p>';
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-overlay" id="hall-of-fame-modal" role="dialog" aria-modal="true" aria-labelledby="hof-title"><div class="modal"><div class="modal-header"><h3 id="hof-title">${r?'Career Recap':'Hall of Fame'}</h3><button class="modal-close" onclick="document.getElementById('hall-of-fame-modal').remove()">Close</button></div><div class="modal-body">${body}</div><div class="modal-footer"><button class="btn btn-secondary" onclick="${r?'showHallOfFame()':"document.getElementById('hall-of-fame-modal').remove();showLoadModal()"}">${r?'Back to Hall of Fame':'Back to Load Career'}</button></div></div></div>`);
  document.querySelector('#hall-of-fame-modal .modal-close')?.focus();
}

async function handleRetireCar(id){const car=game.cars.find(c=>c.id===id);if(!car||!await gameConfirm(`Permanently retire ${car.name}? No cash is paid. Its stats will remain in the Vehicle Graveyard.${game.cars.length===1?' You must buy a replacement before racing.':''}`))return;const r=retireOwnedCar(id);if(!r.ok){toast(r.msg,'error');return;}renderTab('garage');toast('Car retired to the Vehicle Graveyard.','success');}
function renderArchivedVehicles(cars){return cars.map(c=>`<details class="ui-details"><summary>#${careerArchiveEscape(c.number)} ${careerArchiveEscape(c.name)}</summary><div class="ui-details-body"><p>${careerArchiveEscape(c.retirementReason||'Lifetime retirement')}</p>${['speed','handling','reliability','condition','lifetimeHealth','races','wins','totalPoints'].map(k=>`<div class="team-stat"><span>${{totalPoints:'Points',lifetimeHealth:'Lifetime health'}[k]||k}</span><span>${careerArchiveEscape(c[k]??'Not recorded')}</span></div>`).join('')}<p>Upgrades: ${(c.appliedUpgrades||[]).map(id=>careerArchiveEscape(CAR_CLASSES[c.classId]?.upgrades.find(u=>u.id===id)?.name||id)).join(', ')||'None'}</p></div></details>`).join('')||'<p>No vehicle records.</p>';}

function showDriverSeasonStats(id){
 const rows=getStandings(),entry=rows.find(e=>e.id===id);if(!entry)return;
 document.getElementById('driver-season-modal')?.remove();
 const identity=standingIdentity(entry);
 const rival=(game.rivalries||[]).includes(id),eligible=!entry.isPlayer&&!entry.isTeamCar&&game.season.aiTeams.some(t=>t.cars.some(c=>c.id===id));
 document.body.insertAdjacentHTML('beforeend',`<div class="modal-overlay" id="driver-season-modal" role="dialog" aria-modal="true" aria-labelledby="driver-season-title"><div class="modal"><div class="modal-header"><h3 id="driver-season-title">${careerArchiveEscape(identity.driver)}</h3><button class="modal-close" onclick="document.getElementById('driver-season-modal').remove()">Close</button></div><div class="modal-body"><p>${careerArchiveEscape(identity.team)}</p><p>Season ${game.season.year} · ${careerArchiveEscape(SERIES[game.currentSeries].name)}</p>${[['Position',rows.indexOf(entry)+1],['Points',entry.points],['Starts',entry.races],['Wins',entry.wins],['Top 5 Finishes',entry.top5],['Top 10 Finishes',entry.top10]].map(([k,v])=>`<div class="team-stat"><span>${k}</span><span>${v||0}</span></div>`).join('')}${eligible?'<p class="section-copy">Rivalries last for this season. Rivals race more assertively near you and display red names and banners. You can have multiple rivals.</p>':''}</div>${eligible?`<div class="modal-footer"><button class="btn ${rival?'btn-secondary':'btn-danger'}" onclick="handleRivalry('${id}')">${rival?'End Rivalry':'Declare Rivalry'}</button></div>`:''}</div></div>`);
 document.querySelector('#driver-season-modal .modal-close').focus();
}
function handleRivalry(id){const r=toggleRivalry(id);if(!r.ok){toast(r.msg,'error');return;}renderTab('standings');showDriverSeasonStats(id);}
