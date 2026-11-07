// ============================================================
// STOCK CAR EMPIRE - 3D Race Engine (Three.js r134)
// Straight-line superspeedway drafting sprint.
// Controls: A = steer left, D = steer right, S = brake (auto-throttle)
// ============================================================

const R3D = {
  // ── Track / world ──────────────────────────────────────────
  TRACK_LEN:      15000,  // long superspeedway sprint
  TRACK_W:        22,
  HALF_W:         11,
  WHEEL_R:        0.40,

  // ── Gameplay speed model (TUNED - preserved feel) ──────────
  SPEED_BASE:     210,    // restrained simulation pace; speed sensation is camera-driven
  SPEED_MAX:      270,    // enough headroom for draft and late-race runs
  RECOVERY_MAX:  290,    // shared hard ceiling, including rejoin speed and contact
  ACCEL:          1.6,    // forward accel lerp
  BRAKE_FORCE:    145,    // speed loss when braking (units/sec²)

  // ── Steering ───────────────────────────────────────────────
  LAT_ACC:        60,     // arcade-fast but bounded response; no position snapping
  LAT_MAX:        17.0,   // roughly double the prior lateral authority
  LAT_DAMP:       0.025,  // release damping base per second
  STEER_FALLOFF:  0.15,   // retain most steering authority at race speed

  // ── Perceived speed / chase camera ─────────────────────────
  CAMERA_FOV_MIN: 66,
  CAMERA_FOV_MAX: 86,
  CAMERA_NEAR_Z:  18,
  CAMERA_FAR_Z:   22,

  // ── Drafting: continuous wake, push and carried momentum ───
  DRAFT_Z:        120,     // useful tow range without linking the whole field
  DRAFT_X:        3.6,    // wake half-width at distance; narrower at the bumper
  DRAFT_BOOST:    30,
  PLAYER_DRAFT_STRENGTH: 1.15, // human-only gain over VERSION105 drafting
  DRAFT_BUILD:    1.8,    // exponential response rates, independent of frame rate
  DRAFT_RELEASE:  1.25,
  DRAFT_CARRY:    2.00,   // earned passing momentum, identical for every partner
  PUSH_Z:         6.5,    // push fades continuously from contact to this gap
  PUSH_X:         1.45,   // accurate bumper alignment earns the strongest push
  PUSH_BONUS:     8,
  CHAIN_MAX:      12,     // diminishing shared efficiency, including the lead car
  CHAIN_LINK_Z:   24,     // close, aligned cars contribute to the same working line
  AERO_MAX:       43,     // combined tow, received push and chain ceiling
  PACK_CATCHUP:   16,     // gradual recovery after losing the leading groups
  PACK_GAP_START: 160,
  PACK_GAP:       600,
  // A narrower lens keeps following cars large enough to read at a glance.
  // This remains a horizontal FOV so the view is stable at every mirror size.
  MIRROR_HFOV:    68,     // readable trailing cars, stable across aspect ratios

  // ── AI / race director ─────────────────────────────────────
  // Passing intent exists from the green flag and rises only moderately late.
  CALM_FRAC:      0.08,
  ENDGAME_FRAC:   0.82,
  RUBBER_BAND:    14,     // enough recovery for a skilled rear-to-front drive
  WRECK_FIRST:    42,
  WRECK_MIN:      48,
  WRECK_MAX:      85,
  MAX_WRECKS:     2,
  WRECK_NOTICE:   2.8,    // minimum seconds of forward travel before an incident
  BUMP_DEBOUNCE:  0.9,

  // ── AI lateral model ───────────────────────────────────────
  // Cars steer by accelerating a lateral velocity, never by snapping position.
  AI_LAT_ACC:     5.0,    // lateral acceleration (units/sec²) - low = smooth arcs
  AI_LAT_MAX:     2.6,    // top lateral speed (units/sec)
  AI_LAT_DAMP:    0.02,   // velocity damping base (per second)
  AI_STEER_GAIN:  0.9,    // desired lateral speed per unit of error
  LANE_STEP:      2.4,    // spacing of candidate lanes
  LANE_WIDTH:     2.6,    // how wide a "lane" is when scoring traffic
  LANE_COMMIT:    3.2,    // seconds a car holds a line before reconsidering
  LANE_GAIN_MIN:  0.09,   // racers act on a useful lane before a train forms
  LANE_INERTIA:   0.13,
  TOW_APPEAL:     1.05,   // seek a tow, then leave it when the run is earned
  STUCK_Z:        34,     // being this close behind a slower car counts as bottled up
  STUCK_PENALTY:  1.6,    // how badly a driver wants out of that
  TACTIC_COMMIT:  2.6,    // seconds a driver sticks with a tow/block decision
  BLOCK_Z:        20,     // how close behind before a driver starts defending
  BLOCK_MAX:      1.6,    // furthest a defender will shade across - no chopping

  // ── Physical separation ────────────────────────────────────
  // Contact is resolved with impulses and gentle correction, not teleports.
  SEP_Z_RATE:     34,     // max z correction per second (units/sec)
  SEP_X_RATE:     6,      // max x correction per second (units/sec)
  CONTACT_IMPULSE: 5,     // overlap pressure per second, not a kick each frame
  CAR_SEP_X:      2.15,
  CAR_SEP_Z:      4.6,
  GRID_SPACING:   28,
  PACE_SPEED:     65,
};

// Continuous aerodynamic weights. Sample every car before applying received
// push so the result is independent of roster/iteration order.
function r3dSmooth(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function r3dWake(follower, leader) {
  const dz = leader.z - follower.z;
  const dx = Math.abs(leader.x - follower.x);
  if (dz <= 0 || dz >= R3D.DRAFT_Z) return { tow: 0, push: 0 };
  const width = 1.6 + (R3D.DRAFT_X - 1.6) * Math.sqrt(dz / R3D.DRAFT_Z);
  const tow = r3dSmooth(1 - dz / R3D.DRAFT_Z) * r3dSmooth(1 - dx / width);
  // A fast impact is a collision, not a free push bonus.
  const closing = Math.max(0, follower.speed - leader.speed);
  const push = r3dSmooth((R3D.PUSH_Z - dz) / (R3D.PUSH_Z - R3D.CAR_SEP_Z)) *
    r3dSmooth(1 - dx / R3D.PUSH_X) * (1 - r3dSmooth((closing - 6) / 12));
  return { tow, push };
}

// ============================================================
//  Canvas-texture helpers (flat, palette-consistent, no glow)
// ============================================================
function r3dTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 4;
  return t;
}
const r3dHex = v => '#' + (v & 0xffffff).toString(16).padStart(6, '0');

// Bold painted racing numbers with an outline that reads on any livery.
// Cached per number so a 30-car field doesn't allocate 30 identical canvases.
const _r3dRoundelCache = new Map();
function r3dRoundelTex(num,numberColor='#f2f3e9') {
  const key=String(num)+numberColor;
  if (_r3dRoundelCache.has(key)) return _r3dRoundelCache.get(key);
  const tex = r3dTex(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = numberColor;
    ctx.lineWidth = 14; ctx.strokeStyle = '#161b24'; ctx.lineJoin = 'round';
    ctx.font = 'italic 900 166px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText(String(num), 120, 139, 222);
    ctx.fillText(String(num), 120, 139, 222);
  });
  _r3dRoundelCache.set(key, tex);
  while(_r3dRoundelCache.size>128){const first=_r3dRoundelCache.keys().next().value;_r3dRoundelCache.get(first).dispose();_r3dRoundelCache.delete(first);}
  return tex;
}

// ─── Public launcher ─────────────────────────────────────────
function launch3DRace(config, onComplete) {
  config = {...config, graphicsMode:'auto'};
  config={...config,raceRules:config.raceRules || {crashes:true,damage:true}};
  const container = document.getElementById('race-3d-container');
  if (!container) { console.error('race-3d-container not found'); return; }

  if (window._r3d) { try { window._r3d.destroy(); } catch (_) {} window._r3d = null; }

  container.innerHTML = `
    <canvas id="r3d-canvas" style="display:block;width:100%;height:100%"></canvas>
    <div id="r3d-hud">
      <button class="r3d-pause-btn" id="r3d-pause-btn" title="Pause (Esc)">PAUSE</button>

      <div id="r3d-mirror-wrap"></div>

      <div class="r3d-order" id="r3d-order"></div>

      <div class="r3d-map" id="r3d-map">
        <div class="r3d-map-head">FIELD</div>
        <div class="r3d-map-track" id="r3d-map-track">
          <div class="r3d-map-finish"></div>
        </div>
      </div>

      <div class="r3d-telemetry">
        <div class="r3d-tele-head">RACE DATA</div>
        <div class="r3d-tele-grid">
          <div>
            <span class="r3d-data-label">POSITION</span>
            <div class="r3d-tele-pos">
              <span class="r3d-tele-pos-num" id="r3d-pos">1</span>
              <span class="r3d-tele-pos-of" id="r3d-pos-of">/ 20</span>
            </div>
          </div>
          <div>
            <span class="r3d-data-label">SPEED</span>
            <div class="r3d-tele-speed">
              <span id="r3d-speed">0</span><span class="r3d-tele-unit">MPH</span>
            </div>
          </div>
        </div>
        <div class="r3d-draft">
          <div class="r3d-draft-label" id="r3d-draft">Draft</div>
          <div class="r3d-draft-meter"><div class="r3d-draft-fill" id="r3d-draft-fill"></div></div>
        </div>
      ${!config.practiceTips && raceFeatureRules(config.difficulty,config.raceRules).damage ? '<div class="r3d-health" id="r3d-health" role="progressbar" aria-label="Vehicle condition" aria-valuemin="0" aria-valuemax="100"><span>Vehicle condition <strong id="r3d-health-value">100%</strong></span><div><i id="r3d-health-fill"></i></div></div>' : ''}
      </div>

      <div class="r3d-progress-wrap">
        <div class="r3d-progress-fill" id="r3d-prog-fill"></div>
        <div class="r3d-progress-label"><span>Start</span><span>Finish</span></div>
      </div>

      <div class="r3d-warning hidden" id="r3d-warn"></div>
      ${config.practiceTips ? '<div class="r3d-practice-tip" id="r3d-practice-tip" role="status" aria-live="polite">A and D steer. S brakes. The car accelerates automatically.</div>' : ''}
      <div class="r3d-countdown" id="r3d-countdown"></div>
      <div class="r3d-finish" id="r3d-finish" style="display:none"></div>

      <div id="r3d-pause-overlay">
        <div class="r3d-pause-panel">
          <div class="r3d-pause-title">PAUSED</div>
          <button class="r3d-pause-resume" id="r3d-pause-resume">RESUME</button>
          <button class="r3d-pause-resume" id="r3d-quit">${config.quitWithDNF ? 'QUIT RACE WITH DNF' : 'QUIT RACE'}</button>
        </div>
      </div>
    </div>
    <div class="r3d-controls-hint" id="r3d-hint">
      <span>A</span> Steer Left &nbsp;|&nbsp; <span>D</span> Steer Right &nbsp;|&nbsp; <span>S</span> Brake
    </div>
  `;

  let quitting = false;
  document.getElementById('r3d-quit').addEventListener('click', async () => {
    const engine = window._r3d;
    if (!engine || engine.done || quitting) return;
    quitting = true;
    try {
      if (config.quitWithDNF) {
        const confirmed = await gameConfirm('Are you sure you want to quit this race? It will result in a last-place finish.', 'Yes', 'No');
        if (confirmed && window._r3d === engine && !engine.done) window._r3dFinish(engine.cars.length, true);
        return;
      }
      engine.destroy(); window._r3d = null;
      window._r3dFinish = () => {};
      if (config.onQuit) config.onQuit(); else showScreen('intro');
    } finally {
      quitting = false;
    }
  });
  container.classList.toggle('dual-race', !!config.dualPlayer);
  if (config.dualPlayer) {
    document.getElementById('r3d-hud').insertAdjacentHTML('beforeend', `<div class="dual-views">${[1,2].map(n => `
      <section class="dual-view" id="dual-view-${n}" aria-label="Player ${n} race view">
        <div class="dual-player-label">Player ${n} · ${n === 1 ? 'A / S / D' : 'J / K / L'}</div>
        <div class="dual-mirror" id="dual-mirror-${n}"></div>
        ${n === 1 ? '<div class="r3d-order dual-order" id="dual-order-1"></div>' : ''}
        <div class="dual-data">${raceFeatureRules(config.difficulty,config.raceRules).damage ? `<span class="dual-health" id="dual-health-${n}">Vehicle condition 100%</span>` : ''}<span id="dual-pos-${n}"></span><span><strong id="dual-speed-${n}">0</strong> MPH</span><span>Draft <strong id="dual-draft-${n}">0</strong>%</span></div>
      </section>`).join('')}</div><div class="dual-progress" aria-label="Race progress for both players"><span>Start</span><span>Finish</span><div>${[1,2].map(n=>`<i id="dual-progress-${n}" aria-label="Player ${n} progress"></i>`).join('')}</div></div>`);
    document.getElementById('r3d-hint').textContent = 'P1: A / S / D     P2: J / K / L     Esc: Pause';
  }
  const canvas = document.getElementById('r3d-canvas');

  requestAnimationFrame(() => {
    const w = container.clientWidth  || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    canvas.width  = w;
    canvas.height = h;
    window._r3d = new Race3DEngine(canvas, config, onComplete);
  });

  let completionHandled = false;
  window._r3dFinish = (pos, quitDNF = false) => {
    if (completionHandled) return;
    completionHandled = true;
    // Grab the real on-track order before tearing the engine down, so the
    // results table reflects what actually happened - team-mates included.
    let order = [];
    let photo = null;
    const startingPosition = window._r3d?._startingPos ?? null;
    const startingPositions = {...window._r3d?._newsGrid};
    if (window._r3d) {
      try { order = window._r3d.finalOrder(); } catch (_) {}
      photo = window._r3d.finishPhoto || null;
      try { window._r3d.destroy(); } catch (_) {}
      window._r3d = null;
    }
    onComplete(pos, order, quitDNF ? null : photo, quitDNF, {startingPosition, startingPositions});
  };
}

// ─── Race Engine ──────────────────────────────────────────────
class Race3DEngine {
  constructor(canvas, config, onComplete) {
    this.canvas       = canvas;
    this.config       = config;
    const seriesId = config.seriesId || SERIES.find(s => s.fieldSize === config.fieldSize)?.id;
    const fullDistance = R3D.TRACK_LEN * (seriesId === 'premier' ? 1.25 : 1.15);
    this.raceLength   = Number.isFinite(config.finishDistance) &&
      config.finishDistance >= 1000 && config.finishDistance <= fullDistance
      ? config.finishDistance : fullDistance;
    this.isGrassroots = (config.seriesId || SERIES.find(s => s.fieldSize === config.fieldSize)?.id) === 'grassroots';
    this.speedScale = this.isGrassroots ? 0.9 : 1;
    this.trackHalfWidth = R3D.HALF_W * (this.isGrassroots ? .94 : 1);
    this.carModel = this.isGrassroots ? SC_LEGACY_STOCK_CAR_MODEL : SC_STOCK_CAR_MODEL;
    this.onComplete   = onComplete;
    this.keys         = { a: false, d: false, s: false };
    this.keys2 = { a: false, d: false, s: false };
    this.paused       = false;
    this.cars         = [];
    this.player       = null;
    this.wrecks       = [];
    this.wreckCount   = 0;
    this.wreckCooldown = R3D.WRECK_FIRST;
    this.camShake     = 0;
    this.racing       = false;
    this.paceMode     = false;
    this.done         = false;
    this.finishOrder  = [];
    this._raf         = null;
    this._warnTimeout = null;
    this._orderAcc    = 0;   // throttle accumulator for the order tower
    this._mapAcc      = 0;
    this._physicsAcc  = 0;
    this._dummy       = new THREE.Object3D();
    // Difficulty scales AI pace and aggression, and how much the draft gives you
    this.diff = (typeof difficultyById === 'function')
      ? difficultyById(config.difficulty || DEFAULT_DIFFICULTY)
      : { aiSpeed: 1, aiPower: 1, aiAggro: 1, playerDraft: 1, playerCatchup: 1, racecraft: 0 };

    this._init();
  }

  // ── Scene setup ──────────────────────────────────────────────
  _init() {
    const c = this.canvas;
    const w = c.width  || window.innerWidth;
    const h = c.height || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SC_ENVIRONMENT.sky.horizon);
    this.scene.fog = new THREE.FogExp2(SC_ENVIRONMENT.sky.horizon, 0.00085);

    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.5, 4000);
    this.camera.position.set(0, 5, -12);

    // Far plane matches the main camera so the track doesn't visibly end
    // partway down the mirror.
    this.mirrorCam = new THREE.PerspectiveCamera(72, 3.5, 0.5, 4000);
    this.mirrorCam.position.set(0, 4, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
    // Budget rendering work rather than multiplying every screen pixel by four.
    this._configureGraphics();
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    this.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x4a6a3a, 0.45));

    const sun = new THREE.DirectionalLight(0xfff3df, 1.05);
    sun.position.set(90, 220, 120);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -320; sun.shadow.camera.right = 320;
    sun.shadow.camera.top = 320;   sun.shadow.camera.bottom = -320;
    sun.shadow.camera.far = 2400;
    this.scene.add(sun);

    // Max anisotropy keeps the heavily-tiled asphalt/grass sharp at distance
    // instead of shimmering - most visible in the mirror.
    this._maxAniso = Math.min(this.lowPower ? 2 : 4, this.renderer.capabilities?.getMaxAnisotropy?.() || 1);

    this._initGeometries();
    this._buildTrack();
    this._buildEnvironment();
    this._buildCars();
    if (this.player2) this.camera2 = this.camera.clone();
    if (!this.player2) this._buildMinimap();

    // Apply the real anisotropy limit to every texture now in the scene
    this.scene.traverse(o => {
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const m of mats) {
        if (m && m.map) { m.map.anisotropy = this._maxAniso; m.map.needsUpdate = true; }
      }
    });

    // Input
    this._kd = e => {
      const k = e.key.toLowerCase();
      if (k === 'j') this.keys2.a = true;
      if (k === 'l') this.keys2.d = true;
      if (k === 'k') this.keys2.s = true;
      if (['a','s','d','j','k','l'].includes(k)) e.preventDefault();
      if (k === 'a') this.keys.a = true;
      if (k === 'd') this.keys.d = true;
      if (k === 's') this.keys.s = true;
      if (e.key === 'Escape') this._togglePause();
    };
    this._ku = e => {
      const k = e.key.toLowerCase();
      if (k === 'j') this.keys2.a = false;
      if (k === 'l') this.keys2.d = false;
      if (k === 'k') this.keys2.s = false;
      if (k === 'a') this.keys.a = false;
      if (k === 'd') this.keys.d = false;
      if (k === 's') this.keys.s = false;
    };
    document.addEventListener('keydown', this._kd);
    document.addEventListener('keyup',   this._ku);
    this._onBlur = () => {
      this.keys.a = this.keys.d = this.keys.s = false;
    if (this.keys2) this.keys2.a = this.keys2.d = this.keys2.s = false;
      if (!this.paused && !this.done) this._togglePause();
    };
    window.addEventListener('blur', this._onBlur);

    const pauseBtn  = document.getElementById('r3d-pause-btn');
    const resumeBtn = document.getElementById('r3d-pause-resume');
    if (pauseBtn)  pauseBtn.addEventListener('click',  () => this._togglePause());
    if (resumeBtn) resumeBtn.addEventListener('click', () => this._togglePause());

    this._onResize = () => {
      const el = this.canvas.parentElement;
      if (!el) return;
      const nw = el.clientWidth  || window.innerWidth;
      const nh = el.clientHeight || window.innerHeight;
      this._setGraphicsQuality(this.lowPower);
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this._onResize);

    this.clock = new THREE.Clock();
    this._loop();
    this._countdown();
  }

  // Second-player context
  _withSecond(callback) {
    const player = this.player, keys = this.keys, camera = this.camera;
    try { this.player = this.player2; this.keys = this.keys2; this.camera = this.camera2 || camera; return callback(); }
    finally { this.player = player; this.keys = keys; this.camera = camera; }
  }

  // Rolling start
  _countdown() {
    const el   = document.getElementById('r3d-countdown');
    const hint = document.getElementById('r3d-hint');
    this.paceMode = true;

    const setMsg = (txt, big = false) => {
      if (!el) return;
      el.textContent = txt;
      el.style.opacity = '1';
      el.style.fontSize = big ? '1.5rem' : '';
      el.style.letterSpacing = big ? '0.12em' : '';
      el.classList.remove('go');
    };

    setMsg(`FORMATION LAP  -  P${this._startingPos} START`, true);
    setTimeout(() => {
      if (this.done) return;
      setMsg('3');
      setTimeout(() => {
        if (this.done) return;
        setMsg('2');
        setTimeout(() => {
          if (this.done) return;
          setMsg('1');
          setTimeout(() => {
            if (this.done) return;
            if (el) {
              el.textContent = 'GREEN FLAG';
              el.style.fontSize = ''; el.style.letterSpacing = '';
              el.classList.add('go');
            }
            this.paceMode = false;
            this.racing = true;
            if (hint) hint.style.opacity = '0';
            setTimeout(() => { if (el) el.style.opacity = '0'; }, 1100);
          }, 1000);
        }, 1000);
      }, 1000);
    }, 3000);
  }

  // ── Main update ──────────────────────────────────────────────
  _update(dt) {
    if (this.paused) return;

    if (this.paceMode) {
      this._updatePaceLap(dt);
      this._animateCars(dt);
      if (!this.player2) this._updateCamera(dt);
      this._updateHUD(dt);
      return;
    }
    if (!this.racing || this.done) return;

    for (const car of this.cars) car._frameStartX = car.x;

    // NOTE: _pushLocked is cleared inside _separateCars, not here. It is set
    // by the contact solver which runs AFTER _updateAI, so clearing it here
    // meant _updateAI always saw false and cars in a pack kept making lane
    // decisions while locked bumper-to-bumper - a big source of the twitching.
    // Both humans read the same pre-step traffic state, regardless of update order.
    this._playerTraffic = this.player2 ? this.cars.filter(c => !c.dnf && !c.finished).map(c => ({ car:c,z:c.z,speed:c.speed })) : null;
    this._stepContactState(dt);
    this._updatePlayer(dt);
    if (this.player2) this._withSecond(() => this._updatePlayer(dt));
    this._playerTraffic = null;
    this._updateAI(dt);
    this._calcDraft(dt);
    this._separateCars(dt);
    this._checkCollisions();
    if (this.player2) this._withSecond(() => this._checkCollisions());
    this._resolveWalls(dt);
    this._stepWallSparks(dt);
    this._checkFinish();
    this._animateCars(dt);
    if (!this.player2) this._updateCamera(dt);
    this._updateHUD(dt);

  }

  _updatePaceLap(dt) {
    for (const [p, keys] of [[this.player,this.keys], ...(this.player2 ? [[this.player2,this.keys2]] : [])]) {
      const hw = (this.trackHalfWidth ?? R3D.HALF_W) - 1.2;
      const desired = (Number(keys.a)-Number(keys.d))*R3D.LAT_MAX*.6;
      p.lv = (p.lv || 0) + clamp((desired-(p.lv || 0))*(1-Math.exp(-4*dt)),-R3D.LAT_ACC*dt,R3D.LAT_ACC*dt);
      p.lv=clamp(p.lv,-R3D.LAT_MAX*.6,R3D.LAT_MAX*.6);
      p.x=clamp(p.x+p.lv*dt,-hw,hw);
    }
    for (const car of this.cars) {
      // Every row advances together on the formation lap. Letting each car
      // converge from its power-based race speed changed the live order before
      // the green flag, so the HUD could disagree with the announced grid spot.
      car.speed = R3D.PACE_SPEED * (this.speedScale ?? 1);
      car.z += car.speed * dt;
      car.mesh.position.set(car.x, 0, car.z);
    }
  }

  // Pause
  _togglePause() {
    if (this.done) return;
    this.paused = !this.paused;
    this.keys.a = this.keys.d = this.keys.s = false;
    if (this.keys2) this.keys2.a = this.keys2.d = this.keys2.s = false;
    this._physicsAcc = 0;
    const overlay  = document.getElementById('r3d-pause-overlay');
    const pauseBtn = document.getElementById('r3d-pause-btn');
    if (overlay)  overlay.classList.toggle('active', this.paused);
    if (pauseBtn) pauseBtn.textContent = this.paused ? 'RESUME' : 'PAUSE';
    if (!this.paused && this.clock) this.clock.getDelta();
  }

  // Frame scheduling
  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    const elapsed = this.clock.getDelta();
    this._sampleGraphics(elapsed);
    const dt = Math.min(elapsed, 0.1);
    // Fixed steps keep contact and steering consistent at 30/60/120Hz.
    this._physicsAcc += dt;
    while (this._physicsAcc >= 1 / 120) {
      this._update(1 / 120);
      this._physicsAcc -= 1 / 120;
    }
    if (this.renderer && this.scene && this.camera) {
      if (this.player2) { this._renderDual(dt); return; }
      this.renderer.autoClear = true;
      this.renderer.render(this.scene, this.camera);
      this.renderer.autoClear = false;
      this._renderMirror();
      this.renderer.autoClear = true;
    }
  }

  destroy() {
    this._disposed = true;
    cancelAnimationFrame(this._raf);
    this._raf = null;
    clearTimeout(this._warnTimeout);
    document.removeEventListener('keydown', this._kd);
    document.removeEventListener('keyup',   this._ku);
    window.removeEventListener('resize',    this._onResize);
    window.removeEventListener('blur',      this._onBlur);

    // Release GPU resources - without this, every race leaks its track,
    // car geometry and canvas textures for the life of the page.
    if (this.scene && this.scene.traverse) {
      const shared = new Set([..._r3dRoundelCache.values(),...(typeof _hoodLogoTextures==='undefined'?[]:_hoodLogoTextures.values())]); // reused across races - keep
      const seen = new Set();
      this.scene.traverse(obj => {
        if (obj.geometry && !seen.has(obj.geometry)) {
          seen.add(obj.geometry);
          obj.geometry.dispose && obj.geometry.dispose();
        }
        const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
        for (const m of mats) {
          if (!m || seen.has(m)) continue;
          seen.add(m);
          if (m.map && m.map.dispose && !shared.has(m.map)) m.map.dispose();
          m.dispose && m.dispose();
        }
      });
    }
    if (this.mirrorRT) { this.mirrorRT.dispose(); this.mirrorRT = null; }
    if (this.mirrorQuadMat) { this.mirrorQuadMat.dispose(); this.mirrorQuadMat = null; }
    if (this.mirrorQuad) { this.mirrorQuad.geometry.dispose(); this.mirrorQuad = null; }
    this.mirrorScene = null;
    if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
    this.scene  = null;
    this.camera = null;
    this.cars   = [];
    this.done   = true;
  }
}
