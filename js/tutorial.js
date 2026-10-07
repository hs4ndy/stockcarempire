// Career onboarding is stored in each save. The current step stays in memory
// so an interrupted tutorial starts from the beginning on the next load.
const CAREER_TUTORIAL_STEPS = [
  {
    tab: 'dashboard', target: '.cmd-strip', title: 'Your command center',
    copy: 'This strip tracks your championship position, cash, series, and next race. The dashboard is where you check your team before each event.',
  },
  {
    tab: 'dashboard', target: '.dashboard-grid .card:nth-child(3)', title: 'Watch your budget',
    copy: 'The Finances card shows sponsor income and staff costs per race. Keep enough cash for entry fees, repairs, and the people you hire.',
  },
  {
    tab: 'garage', target: '.nav-btn[data-tab="garage"]', title: 'Build your garage',
    copy: 'Use Garage to inspect condition, repair and upgrade cars, and change their paint colors and numbers. Your first car is already assigned to you.',
  },
  {
    tab: 'team', target: '.nav-btn[data-tab="team"]', title: 'Hire your people',
    copy: 'Team is where you hire drivers for extra cars and support staff for your operation. Salaries become ongoing costs, so check your budget first.',
  },
  {
    tab: 'market', target: '.nav-btn[data-tab="market"]', title: 'Grow the operation',
    copy: 'Market lets you buy more cars, sign sponsors, and manage financing. You can drive a new car yourself or assign a hired driver to put both cars in the field.',
  },
  {
    tab: 'schedule', target: '.nav-btn[data-tab="schedule"]', title: 'Plan the season',
    copy: 'Schedule lists upcoming tracks and completed races. Track characteristics affect how valuable speed and handling are in the race simulation.',
  },
  {
    tab: 'standings', target: '.nav-btn[data-tab="standings"]', title: 'Follow the championship',
    copy: 'Standings shows how you and the rest of the field rank. Points across the season determine the championship and possible promotion.',
  },
  {
    tab: 'carstats', target: '.nav-btn[data-tab="carstats"]', title: 'Review your career',
    copy: 'Career keeps your longer-term record, including seasons, wins, and progress as a driver and team owner.',
  },
  {
    tab: 'settings', target: '.nav-btn[data-tab="settings"]', title: 'Set your challenge and save',
    copy: 'Settings lets you change racing difficulty before the next race. Choose a save slot here or with the Save button to enable automatic saving.',
  },
  {
    screen: 'race-setup', target: '#screen-race-setup .btn-row', title: 'Choose how to race',
    copy: 'Race Weekend shows the track, entry fee, and your car choice. Choose Drive Race for a 3D sprint or Simulate Race for an instant result. Next, you can practice without affecting your season.',
  },
  {
    tab: 'dashboard', target: '.dashboard-grid .card:first-child', title: 'Practice behind the wheel',
    copy: 'Try a short exhibition sprint. Steer with A and D, brake with S, and use the Draft meter and rear-view mirror to read the pack. Practice has no career consequences.',
    practice: true,
  },
  {
    tab: 'dashboard', target: '.cmd-strip', title: 'You are ready',
    copy: 'Your first official race is still ahead. Explore any tab, choose a save slot, and enter Race Weekend when you are ready.',
    finish: true,
  },
];

let careerTutorialStep = 0;
let careerTutorialPracticeDone = false;

function offerCareerTutorial() {
  const status = game?.tutorial?.status;
  if (status !== 'offered' && status !== 'in-progress') return;
  careerTutorialStep = 0;
  careerTutorialPracticeDone = false;
  if (status === 'offered') {
    renderCareerTutorialOffer();
  } else {
    renderCareerTutorialStep();
  }
}

function renderCareerTutorialOffer() {
  document.getElementById('career-tutorial')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div id="career-tutorial" class="career-tutorial is-offer">
      <div class="career-tutorial-shield"></div>
      <section class="career-tutorial-panel" role="dialog" aria-modal="true" aria-labelledby="career-tutorial-title" aria-describedby="career-tutorial-copy">
        <div class="career-tutorial-kicker">NEW CAREER</div>
        <h2 id="career-tutorial-title">Learn the ropes</h2>
        <p id="career-tutorial-copy">Take a quick tour of your team, money, cars, and races, then drive a short practice sprint. Your career begins either way.</p>
        <div class="career-tutorial-actions">
          <button class="btn btn-ghost" data-tutorial-action="skip">Skip Tutorial</button>
          <button class="btn btn-primary" data-tutorial-action="start">Start Tutorial</button>
        </div>
      </section>
    </div>`);
  wireCareerTutorialButtons();
  document.querySelector('#career-tutorial [data-tutorial-action="start"]')?.focus();
}

function startCareerTutorial() {
  if (!game?.tutorial) return;
  game.tutorial.status = 'in-progress';
  saveGame();
  careerTutorialStep = 0;
  renderCareerTutorialStep();
}

function skipCareerTutorial() {
  if (!game?.tutorial || game.tutorial.status !== 'offered') return;
  game.tutorial.status = 'skipped';
  saveGame();
  document.getElementById('career-tutorial')?.remove();
  showScreen('game');
  showTab('dashboard');
}

function renderCareerTutorialStep() {
  const step = CAREER_TUTORIAL_STEPS[careerTutorialStep];
  if (!step || game?.tutorial?.status !== 'in-progress') return;
  if (step.screen === 'race-setup') {
    handleOpenRaceWeekend();
  } else {
    showScreen('game');
    showTab(step.tab);
  }

  document.getElementById('career-tutorial')?.remove();
  const nextLabel = step.finish ? 'Finish Tutorial'
    : step.practice && !careerTutorialPracticeDone ? 'Start Practice' : 'Next';
  document.body.insertAdjacentHTML('beforeend', `
    <div id="career-tutorial" class="career-tutorial">
      <div class="career-tutorial-shield"></div>
      <div class="career-tutorial-spotlight" aria-hidden="true"></div>
      <section class="career-tutorial-panel" role="dialog" aria-modal="true" aria-labelledby="career-tutorial-title" aria-describedby="career-tutorial-copy">
        <div class="career-tutorial-kicker">CAREER GUIDE <span>${careerTutorialStep + 1} / ${CAREER_TUTORIAL_STEPS.length}</span></div>
        <h2 id="career-tutorial-title">${step.title}</h2>
        <p id="career-tutorial-copy">${step.copy}</p>
        <div class="career-tutorial-actions">
          <button class="btn btn-ghost" data-tutorial-action="save">Save Career</button>
          <button class="btn btn-ghost" data-tutorial-action="back" ${careerTutorialStep === 0 ? 'disabled' : ''}>Back</button>
          <button class="btn btn-primary" data-tutorial-action="next">${nextLabel}</button>
        </div>
      </section>
    </div>`);
  wireCareerTutorialButtons();
  const target = document.querySelector(step.target);
  target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  requestAnimationFrame(updateCareerTutorialSpotlight);
  setTimeout(updateCareerTutorialSpotlight, 220);
  document.querySelector('#career-tutorial [data-tutorial-action="next"]')?.focus();
}

function wireCareerTutorialButtons() {
  const root = document.getElementById('career-tutorial');
  root?.querySelector('[data-tutorial-action="start"]')?.addEventListener('click', startCareerTutorial);
  root?.querySelector('[data-tutorial-action="skip"]')?.addEventListener('click', skipCareerTutorial);
  root?.querySelector('[data-tutorial-action="back"]')?.addEventListener('click', () => {
    if (careerTutorialStep > 0) {
      careerTutorialStep--;
      renderCareerTutorialStep();
    }
  });
  root?.querySelector('[data-tutorial-action="next"]')?.addEventListener('click', advanceCareerTutorial);
  root?.querySelector('[data-tutorial-action="save"]')?.addEventListener('click', () => {
    if (!document.getElementById('save-slot-modal')) showSaveModal();
    document.querySelector('#save-slot-modal button')?.focus();
  });
}

function advanceCareerTutorial() {
  const step = CAREER_TUTORIAL_STEPS[careerTutorialStep];
  if (step.finish) {
    game.tutorial.status = 'completed';
    saveGame();
    document.getElementById('career-tutorial')?.remove();
    showScreen('game');
    showTab('dashboard');
    document.querySelector('.nav-btn[data-tab="dashboard"]')?.focus();
    return;
  }
  if (step.practice && !careerTutorialPracticeDone) {
    startCareerTutorialPractice();
    return;
  }
  careerTutorialStep++;
  renderCareerTutorialStep();
}

function startCareerTutorialPractice() {
  if (typeof THREE === 'undefined') {
    toast('The 3D race could not load. Check your connection and try again.', 'error');
    return;
  }
  document.getElementById('career-tutorial')?.remove();
  const car = game.cars[0];
  const colors = ['#d54b45', '#438ac0', '#d6a341', '#5aa786', '#9a71b8', '#d37d52'];
  const aiEntries = Array.from({ length: 11 }, (_, i) => ({
    entrantId: `tutorial-${i + 1}`,
    name: `Practice Driver ${i + 1}`,
    color: colors[i % colors.length],
    number: i + 2,
    power: 0.48 + (i % 4) * 0.055,
  }));
  showScreen('game-race');
  launch3DRace({
    playerColor: car.color,
    playerNumber: car.number,
    playerName: game.driverName,
    playerPower: 0.60,
    fieldSize: 12,
    seriesId: 'grassroots',
    difficulty: game.difficulty || DEFAULT_DIFFICULTY,
    aiEntries,
    finishDistance: 3500,
    practiceTips: true,
  }, () => {
    careerTutorialPracticeDone = true;
    careerTutorialStep++;
    renderCareerTutorialStep();
  });
}

function updateCareerTutorialSpotlight() {
  const overlay = document.getElementById('career-tutorial');
  if (!overlay || overlay.classList.contains('is-offer')) return;
  const spotlight = overlay.querySelector('.career-tutorial-spotlight');
  const panel = overlay.querySelector('.career-tutorial-panel');
  const target = document.querySelector(CAREER_TUTORIAL_STEPS[careerTutorialStep]?.target);
  if (!spotlight || !panel || !target) return;
  const rect = target.getBoundingClientRect();
  const left = Math.max(8, rect.left - 6);
  const top = Math.max(8, rect.top - 6);
  const right = Math.min(window.innerWidth - 8, rect.right + 6);
  const bottom = Math.min(window.innerHeight - 8, rect.bottom + 6);
  if (right <= left || bottom <= top) return;
  spotlight.style.left = `${left}px`;
  spotlight.style.top = `${top}px`;
  spotlight.style.width = `${right - left}px`;
  spotlight.style.height = `${bottom - top}px`;
  panel.classList.toggle('at-top', top > window.innerHeight * 0.45);
}

window.addEventListener('resize', updateCareerTutorialSpotlight);
window.addEventListener('scroll', updateCareerTutorialSpotlight, true);
document.addEventListener('keydown', e => {
  const root = document.getElementById('career-tutorial');
  if (!root || document.getElementById('save-slot-modal')) return;
  if (e.key === 'Escape') { e.preventDefault(); return; }
  if (e.key !== 'Tab') return;
  const buttons = [...root.querySelectorAll('button:not(:disabled)')];
  const first = buttons[0], last = buttons[buttons.length - 1];
  if (!buttons.includes(document.activeElement)) {
    e.preventDefault();
    first?.focus();
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last?.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first?.focus();
  }
});
