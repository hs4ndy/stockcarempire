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
function r3dRoundelTex(num) {
  if (_r3dRoundelCache.has(num)) return _r3dRoundelCache.get(num);
  const tex = r3dTex(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#f2f3e9';
    ctx.lineWidth = 14; ctx.strokeStyle = '#161b24'; ctx.lineJoin = 'round';
    ctx.font = 'italic 900 166px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText(String(num), 120, 139, 222);
    ctx.fillText(String(num), 120, 139, 222);
  });
  _r3dRoundelCache.set(num, tex);
  return tex;
}

// ─── Public launcher ─────────────────────────────────────────
function launch3DRace(config, onComplete) {
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
      ${!config.practiceTips && raceFeatureRules(config.difficulty,config.raceRules).damage ? '<div class="r3d-health" id="r3d-health" role="progressbar" aria-label="Vehicle health" aria-valuemin="0" aria-valuemax="100"><span>Vehicle health <strong id="r3d-health-value">100%</strong></span><div><i id="r3d-health-fill"></i></div></div>' : ''}
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
          <button class="r3d-pause-resume" id="r3d-quit">QUIT RACE</button>
        </div>
      </div>
    </div>
    <div class="r3d-controls-hint" id="r3d-hint">
      <span>A</span> Steer Left &nbsp;|&nbsp; <span>D</span> Steer Right &nbsp;|&nbsp; <span>S</span> Brake
    </div>
  `;

  document.getElementById('r3d-quit').addEventListener('click', () => {
    if (!window._r3d || window._r3d.done) return;
    window._r3d.destroy(); window._r3d = null;
    window._r3dFinish = () => {};
    if (config.onQuit) config.onQuit(); else showScreen('intro');
  });
  container.classList.toggle('dual-race', !!config.dualPlayer);
  if (config.dualPlayer) {
    document.getElementById('r3d-hud').insertAdjacentHTML('beforeend', `<div class="dual-views">${[1,2].map(n => `
      <section class="dual-view" id="dual-view-${n}" aria-label="Player ${n} race view">
        <div class="dual-player-label">Player ${n} · ${n === 1 ? 'A / S / D' : 'J / K / L'}</div>
        <div class="dual-mirror" id="dual-mirror-${n}"></div>
        ${n === 1 ? '<div class="r3d-order dual-order" id="dual-order-1"></div>' : ''}
        <div class="dual-data">${raceFeatureRules(config.difficulty,config.raceRules).damage ? `<span class="dual-health" id="dual-health-${n}">Vehicle health 100%</span>` : ''}<span id="dual-pos-${n}"></span><span><strong id="dual-speed-${n}">0</strong> MPH</span><span>Draft <strong id="dual-draft-${n}">0</strong>%</span></div>
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

  window._r3dFinish = (pos) => {
    // Grab the real on-track order before tearing the engine down, so the
    // results table reflects what actually happened - team-mates included.
    let order = [];
    let photo = null;
    if (window._r3d) {
      try { order = window._r3d.finalOrder(); } catch (_) {}
      photo = window._r3d.finishPhoto || null;
      try { window._r3d.destroy(); } catch (_) {}
      window._r3d = null;
    }
    onComplete(pos, order, photo);
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
    this.lowPower = !!this.config.dualPlayer || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4)
      || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
    this._pixelRatio = Math.min(window.devicePixelRatio || 1, this.lowPower ? 1 : 1.5,
      Math.sqrt((this.lowPower ? 1000000 : 2000000) / (w * h)));
    this.renderer.setPixelRatio(this._pixelRatio);
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = !this.lowPower;
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
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowPower ? 1 : 1.5,
        Math.sqrt((this.lowPower ? 1000000 : 2000000) / (nw * nh))));
      this.renderer.setSize(nw, nh, false);
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this._onResize);

    this.clock = new THREE.Clock();
    this._loop();
    this._countdown();
  }

  // Shared geometries (reused across all cars for memory/perf)
  _initGeometries() {
    // Blender exports local, indexed geometry. Decode once per race; every car
    // shares these GPU buffers. No asynchronous model loading during a start.
    const decode = data => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
      if (data.color) geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.color, 3));
      if (data.uv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
      geometry.setIndex(data.index);
      geometry.computeBoundingSphere();
      return geometry;
    };
    this.G = {
      parts: Object.fromEntries(Object.entries(this.carModel.parts)
        .map(([name, data]) => [name, decode(data)])),
      wheel: decode(this.carModel.wheel),
      decalDoor: new THREE.PlaneGeometry(0.80, this.isGrassroots ? 0.58 : 0.48),
      decalRoof: this.isGrassroots ? new THREE.PlaneGeometry(1.04, 1.04) : decode(this.carModel.roofDecal),
      teamBand: this.isGrassroots ? new THREE.BoxGeometry(1.48, .012, .12) : decode(this.carModel.teamBand),
    };
    // The track uses intentionally bright arcade lighting. A paint-only
    // reflectance layer keeps saturated liveries from clipping into flat neon,
    // so the new hood and fender normals remain readable without relighting
    // the track or changing the entrant's actual team color.
    const paint = this.G.parts.paint;
    const reflectance = new Float32Array(paint.attributes.position.count * 3);
    for (let i = 0; i < paint.attributes.position.count; i++) {
      const y = paint.attributes.position.getY(i);
      const value = 0.56 + 0.10 * clamp((y - 0.15) / 0.9, 0, 1);
      reflectance.set([value, value, value], i * 3);
    }
    paint.setAttribute('color', new THREE.BufferAttribute(reflectance, 3));
    this.M = {
      trim: new THREE.MeshLambertMaterial({ color: 0x191d23, side: THREE.DoubleSide }),
      glass: new THREE.MeshPhongMaterial({ color: 0x233e50, shininess: 65, side: THREE.DoubleSide }),
      metal: new THREE.MeshPhongMaterial({ color: 0x8d989e, shininess: 48, side: THREE.DoubleSide }),
      headlight: new THREE.MeshBasicMaterial({ color: 0xe5ece3, side: THREE.DoubleSide }),
      taillight: new THREE.MeshBasicMaterial({ color: 0x9c1223, side: THREE.DoubleSide }),
      wheel: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    };
  }

  // ── Track ────────────────────────────────────────────────────
  _loadSurfaceTexture(source, fallbackColor, cutout = false) {
    // A valid tiny image is present before decode, and remains on failure.
    // Empty/failed GPU textures otherwise multiply the pavement to black.
    const tex = r3dTex(2, 2, ctx => { ctx.fillStyle = cutout ? 'rgba(0,0,0,0)' : fallbackColor; ctx.fillRect(0, 0, 2, 2); });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = this._maxAniso;
    tex.userData.loadState = 'loading';
    const image = new Image();
    image.onload = () => {
      if (this._disposed) return;
      const limit = Math.min(this.renderer.capabilities.maxTextureSize, this.lowPower ? 1024 : 2048);
      const scale = Math.min(1, limit / Math.max(image.width, image.height));
      let decoded = image;
      if (scale < 1) {
        decoded = document.createElement('canvas');
        // Power-of-two dimensions keep repeat/mipmaps valid on WebGL 1 too.
        decoded.width = 2 ** Math.floor(Math.log2(image.width * scale));
        decoded.height = 2 ** Math.floor(Math.log2(image.height * scale));
        decoded.getContext('2d').drawImage(image, 0, 0, decoded.width, decoded.height);
      }
      tex.image = decoded; tex.needsUpdate = true; tex.userData.loadState = 'loaded';
    };
    image.onerror = () => { if (!this._disposed) tex.userData.loadState = 'fallback'; };
    image.src = source || '';
    return tex;
  }

  _positionTrack() {
    if (!this.lowPower || !this._trackLayout) return;
    const {length, count} = this._trackLayout;
    const center = Math.floor((this.player?.z || 0) / length);
    if (center === this._trackCenter) return;
    this._trackCenter = center;
    const reach = Math.ceil(4200 / length);
    for (const mesh of this.trackGroup.children) {
      mesh.count = Math.min(count, reach * 2 + 1);
      for (let i = 0; i < mesh.count; i++) {
        this._dummy.position.set(0, 0, (center + i - reach) * length);
        this._dummy.rotation.set(0, 0, 0); this._dummy.scale.set(1, 1, 1); this._dummy.updateMatrix();
        mesh.setMatrixAt(i, this._dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  _buildTrack() {
    const s  = this.scene;
    const TL = Math.max(this.raceLength, R3D.TRACK_LEN);
    const d  = this._dummy;

    // Blender-authored straight selected by series. Grassroots has a narrower
    // worn surface, plain retaining walls and shorter catch fencing.
    // One shared indexed buffer per material, repeated in 60-unit modules.
    const track = this.isGrassroots ? SC_GRASSROOTS_TRACK_MODEL : SC_TRACK_MODEL;
    const textures = this.isGrassroots ? SC_GRASSROOTS_TRACK_TEXTURES : SC_TRACK_TEXTURES;
    const load = name => {
      // Data URLs remain valid WebGL sources when index.html is opened via
      // file://. Neighboring file images are rejected by Chrome's CORS rules.
      return this._loadSurfaceTexture(textures[name], name === 'speedway-asphalt' ? '#777777' : '#deded8', name === 'speedway-mesh');
    };
    const trackMaterials = {
      asphalt: new THREE.MeshLambertMaterial({ map: load('speedway-asphalt'), color: 0xbdbdbd, side: THREE.DoubleSide }),
      wall: new THREE.MeshLambertMaterial({ map: load('speedway-wall'), side: THREE.DoubleSide }),
      concrete: new THREE.MeshLambertMaterial({ color: 0x858984, side: THREE.DoubleSide }),
      steel: new THREE.MeshLambertMaterial({ color: 0x505b60, side: THREE.DoubleSide }),
      absorber: new THREE.MeshLambertMaterial({ color: 0x252a28, side: THREE.DoubleSide }),
      paint: new THREE.MeshLambertMaterial({ color: 0xe2dfcf, side: THREE.DoubleSide }),
      fence: new THREE.MeshLambertMaterial({ map: load('speedway-mesh'), side: THREE.DoubleSide,
        alphaTest: 0.35, alphaToCoverage: true }),
    };
    // Visual runout extends past the cameras' 4,000-unit far plane at both
    // endpoints, including the longer series-specific racing distances.
    const runoutModules = Math.ceil(4200 / track.moduleLength);
    const moduleCount = Math.ceil(TL / track.moduleLength) + 2 * runoutModules;
    this._trackLayout = {length: track.moduleLength, count: moduleCount};
    this.trackGroup = new THREE.Group();
    this.trackGroup.name = track.name;
    this.wallInnerX = track.wallInnerX;
    this.trackGroup.userData = { width: track.trackWidth, wallInnerX: track.wallInnerX, fenceHeight: track.fenceHeight };
    const buildGeometry = data => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
      geometry.setIndex(data.index);
      geometry.computeBoundingSphere();
      return geometry;
    };
    for (const [name, data] of Object.entries(track.parts)) {
      const geometry = buildGeometry(data);
      const mesh = new THREE.InstancedMesh(geometry, trackMaterials[name], moduleCount);
      mesh.name = 'track:' + name;
      mesh.receiveShadow = name === 'asphalt' || name === 'wall' || name === 'concrete';
      for (let i = 0; i < moduleCount; i++) {
        d.position.set(0, 0, (i - runoutModules) * track.moduleLength);
        d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      // Three r134 cannot calculate aggregate InstancedMesh bounds.
      mesh.frustumCulled = false;
      this.trackGroup.add(mesh);
    }
    s.add(this.trackGroup);

    // One Blender-authored finish: dark steel truss, two-sided mesh lettering
    // and flush checkered paint centered on this race's finish plane.
    this.finishGroup = new THREE.Group();
    this.finishGroup.name = 'track:finish';
    this.finishGroup.position.z = this.raceLength;
    for (const [name, data] of Object.entries(track.finishParts)) {
      const mesh = new THREE.Mesh(buildGeometry(data), trackMaterials[name]);
      mesh.name = 'finish:' + name;
      mesh.receiveShadow = true;
      this.finishGroup.add(mesh);
    }
    s.add(this.finishGroup);
    // Starting positions remain unchanged; the old yellow grid stripes are gone.
  }

  // ── Environment ──────────────────────────────────────────────
  _buildEnvironment() {
    this._buildGrandstands();
    const asset = SC_ENVIRONMENT, model = asset.models[this._grandstandModel.id];
    this.environmentGroup = new THREE.Group();
    this.environmentGroup.name = 'environment:ground';
    this.environmentGroup.userData = { seriesId: this._grandstandModel.id, frontX: model.frontX, backX: model.backX };
    const runout = Math.ceil(4200 / asset.moduleLength);
    const count = Math.ceil(Math.max(this.raceLength, R3D.TRACK_LEN) / asset.moduleLength) + runout * 2;
    for (const [name, data] of Object.entries(model.parts)) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
      geometry.setIndex(data.index);
      const map = this._loadSurfaceTexture(asset.textures[name], name === 'grass' ? '#567745' : '#858984');
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ map }), count);
      mesh.name = 'ground:' + name; mesh.receiveShadow = true; mesh.frustumCulled = false;
      for (let i = 0; i < count; i++) {
        this._dummy.position.set(0, 0, (i - runout) * asset.moduleLength);
        this._dummy.rotation.set(0, 0, 0); this._dummy.scale.set(1, 1, 1); this._dummy.updateMatrix();
        mesh.setMatrixAt(i, this._dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true; this.environmentGroup.add(mesh);
    }
    this.scene.add(this.environmentGroup);
    // Direction-only background: no translation, clouds, extra sun disc or
    // finite skybox edges. The same shader covers the chase and mirror views.
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.ShaderMaterial({
      uniforms: { horizon: { value: new THREE.Color(asset.sky.horizon) }, zenith: { value: new THREE.Color(asset.sky.zenith) } },
      vertexShader: 'varying vec3 direction; void main(){ direction=position; vec4 p=projectionMatrix*vec4(mat3(viewMatrix)*position,1.0); gl_Position=p.xyww; }',
      fragmentShader: 'uniform vec3 horizon; uniform vec3 zenith; varying vec3 direction; void main(){ float t=smoothstep(0.0,0.65,normalize(direction).y); gl_FragColor=vec4(mix(horizon,zenith,t),1.0); }',
      side: THREE.BackSide, depthWrite: false, toneMapped: false
    }));
    this.sky.name = 'environment:clear-midday'; this.sky.frustumCulled = false; this.sky.renderOrder = -100;
    this.scene.add(this.sky);
  }

  _buildGrandstands() {
    const asset = SC_GRANDSTANDS;
    const seriesId = this.config.seriesId || SERIES.find(s => s.fieldSize === this.config.fieldSize)?.id;
    const model = asset.models[seriesId] || asset.models.grassroots;
    const crowd = new THREE.TextureLoader().load(asset.crowdTexture);
    crowd.wrapS = crowd.wrapT = THREE.RepeatWrapping;
    const materials = {};
    for (const [name, color] of Object.entries(asset.materials)) {
      materials[name] = new THREE.MeshLambertMaterial({ color: new THREE.Color(...color),
        side: name === 'crowd' ? THREE.DoubleSide : THREE.FrontSide,
        ...(name === 'crowd' ? { map: crowd, alphaTest: 0.45, alphaToCoverage: true } : {}) });
    }
    this.grandstandGroup = new THREE.Group();
    this.grandstandGroup.name = 'grandstands:' + model.id;
    this.grandstandGroup.userData = { seriesId: model.id, decks: model.deckCount, height: model.height, frontX: model.frontX };
    this._grandstandModel = model;
    this._grandstandBands = [];
    // A bounded pool follows both cameras. Far modules retain the architecture
    // but omit individual benches/spectators. Nothing is rebuilt each frame.
    const reach = Math.ceil(2400 / model.pitch);
    for (const [lod, parts] of [['near', model.parts], ['far', model.distantParts]]) {
      const meshes = [];
      for (const [name, data] of Object.entries(parts)) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
        geometry.setIndex(data.index); geometry.computeBoundingSphere();
        const mesh = new THREE.InstancedMesh(geometry, materials[name], (reach * 2 + 1) * 2);
        mesh.name = 'grandstand:' + lod + ':' + name;
        // Three r134 has no aggregate instanced bounds. The bounded pool is
        // manually placed around the player, including the rear-view direction.
        mesh.frustumCulled = false;
        this.grandstandGroup.add(mesh); meshes.push(mesh);
      }
      this._grandstandBands.push({ lod, meshes });
    }
    this.scene.add(this.grandstandGroup);
    this._positionGrandstands();
  }

  _positionGrandstands() {
    if (!this._grandstandModel) return;
    const model = this._grandstandModel;
    const center = Math.floor((this.player?.z || 0) / model.pitch);
    if (center === this._grandstandCenter) return;
    this._grandstandCenter = center;
    const reach = Math.ceil(2400 / model.pitch), d = this._dummy;
    for (const { lod, meshes } of this._grandstandBands) {
      let index = 0;
      for (let offset = -reach; offset <= reach; offset++) {
        const near = Math.abs(offset * model.pitch) <= 300;
        if (near !== (lod === 'near')) continue;
        for (const side of [-1, 1]) {
          // Rotate rather than use a negative instance scale (unsupported by Three).
          d.position.set(side * model.frontX, 0, (center + offset) * model.pitch + (side < 0 ? SC_GRANDSTANDS.moduleLength : 0));
          d.rotation.set(0, side < 0 ? Math.PI : 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
          for (const mesh of meshes) mesh.setMatrixAt(index, d.matrix);
          index++;
        }
      }
      for (const mesh of meshes) { mesh.count = index; mesh.instanceMatrix.needsUpdate = true; }
    }
  }

  // ── Cars ─────────────────────────────────────────────────────
  _buildCars() {
    const { config } = this;
    const fieldSize  = Math.min(config.aiEntries.length + 1, config.fieldSize);

    // Grid slots ordered POLE FIRST. +Z is the direction of travel, so row 0
    // must sit at the highest z - building them the other way round made the
    // announced starting position the exact inverse of the real one.
    const slots = [];
    const rows  = Math.ceil(fieldSize / 2);
    for (let r = 0; r < rows; r++) {
      const baseZ = (rows - 1 - r) * R3D.GRID_SPACING;
      slots.push({ x: -3.5, z: baseZ });         // inside line
      slots.push({ x:  3.5, z: baseZ - 1.6 });   // outside line, staggered back
    }
    slots.length = fieldSize;                    // never draw a slot past the field

    // Qualifying draw. Normally anywhere in the field, but a Data Analyst
    // biases it toward the front - take the best of N draws, one extra draw
    // per analyst on staff.
    const draws = 1 + (config.qualifyBoost || 0);
    let playerSlotIdx = Math.floor(Math.random() * slots.length);
    for (let i = 1; i < draws; i++) {
      playerSlotIdx = Math.min(playerSlotIdx, Math.floor(Math.random() * slots.length));
    }
    playerSlotIdx = Math.min(slots.length - 1, playerSlotIdx + 2);
    this._startingPos = playerSlotIdx + 1;     // two-place qualifying setback, bounded by field size
    const ps = slots[playerSlotIdx];
    this.player = this._makeCar(ps.x, ps.z, {
      entrantId:  'player',
      color:      config.playerColor || '#e8001d',
      number:     config.playerNumber || 1,
      power:      config.playerPower,
      isPlayer:   true,
      isTeammate: false,
      label:      config.playerName || 'YOU',
      carId:      config.playerCarId || null,
    });
    this.player.raceHealth=clamp(config.playerHealth ?? 100,0,100);
    this.cars.push(this.player);

    const aiEntries = config.aiEntries.slice(0,fieldSize-1);
    if (config.qualifyAI) {
      const ranked = aiEntries.map(entry => ({entry,score:entry.power+(Math.random()-.5)*(entry.isContender ? .10 : .24)}));
      ranked.sort((a,b) => b.score-a.score);
      aiEntries.splice(0,aiEntries.length,...ranked.map(r=>r.entry));
    }
    let aiIdx = 0;
    for (let i = 0; i < slots.length && aiIdx < aiEntries.length; i++) {
      if (i === playerSlotIdx) continue;
      const entry = aiEntries[aiIdx++];
      const slot  = slots[i];
      this.cars.push(this._makeCar(slot.x, slot.z, {
        entrantId:  entry.entrantId || null,
        color:      entry.color,
        number:     entry.number || (aiIdx + 1),
        power:      clamp(entry.power, 0.25, 0.99),
        isPlayer:   !!entry.isSecondPlayer,
        isTeammate: !!entry.isTeammate,
        label:      entry.name,
        teamName:   entry.teamName || null,
        carId:      entry.carId || null,
        raceNerve:  entry.raceNerve,
        isContender: entry.isContender,
      }));
      this.cars[this.cars.length-1].raceHealth=clamp(entry.health ?? 100,0,100);
    }
    if (config.dualPlayer) {
      this.player2 = this.cars.find(c => c.entrantId === 'player2');
      // Give the two humans adjacent grid slots without adding an extra car.
      const neighbor = this.cars.filter(c => c !== this.player && c !== this.player2).sort((a,b) =>
        Math.abs(a.z-this.player.z) - Math.abs(b.z-this.player.z))[0];
      if (neighbor && this.player2) {
        const x = this.player2.x, z = this.player2.z;
        this.player2.x = neighbor.x; this.player2.z = neighbor.z;
        neighbor.x = x; neighbor.z = z;
        for (const c of [neighbor,this.player2]) c.mesh.position.set(c.x,0,c.z);
      }
    }
    this._newsGrid = Object.fromEntries([...this.cars].sort((a,b)=>b.z-a.z).map((c,i)=>[c.entrantId,i+1]));
  }

  _withSecond(callback) {
    const player = this.player, keys = this.keys, camera = this.camera;
    try { this.player = this.player2; this.keys = this.keys2; this.camera = this.camera2 || camera; return callback(); }
    finally { this.player = player; this.keys = keys; this.camera = camera; }
  }

  _makeCar(x, z, { entrantId, color, number, power, isPlayer, isTeammate, label, teamName, carId, raceNerve, isContender }) {
    const hex = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
    const G = this.G, M = this.M;
    const g = new THREE.Group();

    g.name = this.carModel.name;
    const bodyMat = new THREE.MeshPhongMaterial({ color: hex, vertexColors: true,
      shininess: 70, specular: 0x30343a, side: THREE.DoubleSide });
    // Keep player/team colors exact; high-contrast accents remain readable
    // on light liveries, and gold continues to identify teammates.
    const luminance = (((hex >> 16) & 255) * 0.2126 +
      ((hex >> 8) & 255) * 0.7152 + (hex & 255) * 0.0722) / 255;
    const accent = isTeammate ? 0xe0a800 : (luminance > 0.65 ? 0x202630 : 0xe8ece2);
    const accMat = new THREE.MeshLambertMaterial({ color: accent, side: THREE.DoubleSide });
    for (const [name, geometry] of Object.entries(G.parts)) {
      const mesh = new THREE.Mesh(geometry, name === 'paint' ? bodyMat : name === 'accent' ? accMat : M[name]);
      mesh.name = name;
      mesh.castShadow = name === 'paint' || name === 'trim';
      mesh.receiveShadow = true;
      g.add(mesh);
    }

    const wheels = this.carModel.wheelPositions.map(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(G.wheel, M.wheel);
      wheel.name = 'Rolling stock-car wheel';
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      g.add(wheel);
      return wheel;
    });

    const decalMat = new THREE.MeshBasicMaterial({
      map: r3dRoundelTex(number), transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
    });
    const roofDecal = new THREE.Mesh(G.decalRoof, decalMat);
    // Generated overlay already conforms to the Gen-7 roof in car coordinates.
    if (this.isGrassroots) {
      roofDecal.position.set(0, 1.334, -.20);
      roofDecal.rotation.x = -Math.PI / 2;
    }
    roofDecal.name = 'Roof number';
    g.add(roofDecal);
    // Outward-facing normals on both doors prevent mirrored or invisible numbers.
    [[-(this.isGrassroots ? 1.045 : 1.023), -Math.PI / 2], [this.isGrassroots ? 1.045 : 1.023, Math.PI / 2]].forEach(([sx, ry]) => {
      const door = new THREE.Mesh(G.decalDoor, decalMat);
      door.position.set(sx, this.isGrassroots ? .58 : .55, .04);
      door.rotation.y = ry;
      door.name = 'Door number';
      g.add(door);
    });

    if (isTeammate) {
      const roofBand = new THREE.Mesh(G.teamBand, accMat);
      if (this.isGrassroots) roofBand.position.set(0, 1.33, .34);
      g.add(roofBand);
    }

    // Fit the historical 5.06 x 2.34 body inside today's 4.6 x 2.15 contact envelope.
    if (this.isGrassroots) g.scale.set(.91, 1, .9);
    g.position.set(x, 0, z);
    this.scene.add(g);

    const bounds = new THREE.Box3().setFromObject(g);
    const wallHalfX = (bounds.max.x-bounds.min.x)/2;
    const wallHalfZ = (bounds.max.z-bounds.min.z)/2;
    const wallBounds={minX:bounds.min.x-x,maxX:bounds.max.x-x,minY:bounds.min.y,maxY:bounds.max.y,minZ:bounds.min.z-z,maxZ:bounds.max.z-z};
    return {
      wallHalfX, wallHalfZ, wallBounds,
      wallHull: typeof SC_WALL_HULLS==='undefined' ? null : SC_WALL_HULLS[this.isGrassroots?'grassroots':'gen7'],
      mesh: g, wheels, isTeammate, carId, entrantId, teamName, isContender: !!isContender,
      isPlayer, power, label, hex, number, x, z,
      lv: 0,
      lvx: 0,          // AI lateral velocity (inertia)
      speed: R3D.SPEED_BASE * (0.78 + power * 0.22) * (this.speedScale ?? 1),
      targetX: x,
      spinning: false, spinTimer: 0, spinDir: 1,
      finished: false, dnf: false,
      draftBoost: 0, draftMomentum: 0, towStrength: 0, pushStrength: 0,
      receivedPush: 0, chainLen: 1,
      raceNerve: raceNerve === undefined ? 0.85 + Math.random() * 0.3 : clamp(raceNerve,.85,1.15),
      laneTimer: Math.random() * 4,
      contactCooldown: 0,
      tilt: 0,
    };
  }

  // ── Minimap dots (DOM) ───────────────────────────────────────
  _buildMinimap() {
    const track = document.getElementById('r3d-map-track');
    if (!track) return;
    for (const car of this.cars) {
      const dot = document.createElement('div');
      dot.className = 'r3d-map-dot';
      if (car.isPlayer) dot.classList.add('is-player');
      else dot.style.background = r3dHex(car.hex);
      track.appendChild(dot);
      car._dot = dot;
    }
  }

  // ── Rolling start sequence ───────────────────────────────────
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

  _updatePlayer(dt) {
    const p  = this.player;
    if (p.finished || p.dnf) return;
    if (this._advanceCrash(p,dt)) return;
    // Steering authority falls off slightly with speed (less twitchy at top speed)
    const spdFrac = clamp((p.speed - R3D.SPEED_BASE) / (R3D.SPEED_MAX - R3D.SPEED_BASE), 0, 1);
    const steerAuth = 1 - spdFrac * R3D.STEER_FALLOFF;
    // A = left = +X (world), D = right = -X (world); camera looks +Z so world +X = screen left
    const input = Number(this.keys.a) - Number(this.keys.d);
    const desired = input * R3D.LAT_MAX * steerAuth;
    const rate = input ? 10.0 : -Math.log(R3D.LAT_DAMP);
    p.lv += clamp((desired - p.lv) * (1 - Math.exp(-rate * dt)), -R3D.LAT_ACC * dt, R3D.LAT_ACC * dt);

    p.lv = clamp(p.lv, -R3D.LAT_MAX, R3D.LAT_MAX);
    p.x += p.lv * dt;

    const traffic = this._playerTraffic || this.cars.filter(c => !c.dnf && !c.finished);
    const startZ = this._playerTraffic?.find(c => c.car === p)?.z ?? p.z;
    const activeCount = traffic.length;
    const aheadCount  = traffic.filter(c => c.z > startZ).length;
    const posFrac     = activeCount > 1 ? aheadCount / (activeCount - 1) : 0;
    const leadZ = traffic.reduce((z,c) => Math.max(z,c.z), startZ);
    const recovery = clamp((leadZ-startZ-R3D.PACK_GAP_START) / (R3D.PACK_GAP-R3D.PACK_GAP_START),0,1);
    const rubberBand = posFrac * R3D.RUBBER_BAND * (this.diff.playerCatchup ?? 1) * (this.diff.inPackHelp ?? 1)
      + (this.diff.inPackHelp === undefined ? recovery * R3D.PACK_CATCHUP : 0)
      + Math.pow(posFrac, 8) * (this.diff.lastPlaceBoost || 0);

    // Only an isolated follower gets extra rejoin help; leaders and cars
    // already attached to traffic do not gain a permanent pace advantage.
    const nextCar = traffic.reduce((next,c) => c.z > startZ && (!next || c.z < next.z) ? c : next, null);
    const gap = nextCar ? nextCar.z - startZ : 0;
    const basePace = R3D.SPEED_BASE * (0.83 + p.power * 0.28);
    const normalPace = Math.min(R3D.SPEED_MAX, basePace + this._aeroPace(p) + rubberBand);
    const tgt = this._playerRecoveryTarget(normalPace, nextCar, gap) * (this.speedScale ?? 1) * this._healthPace(p);
    let braking = false;
    if (this.keys.s) {
      p.speed = Math.max(tgt * 0.38, p.speed - R3D.BRAKE_FORCE * dt);
      braking = true;
    } else {
      const accel = 2.2 + (R3D.ACCEL - 2.2) * clamp((p.speed - 180) / 30, 0, 1);
      p.speed += (tgt - p.speed) * (1 - Math.exp(-accel * dt));
    }

    p.z += p.speed * dt;
    p.mesh.position.set(p.x, 0, p.z);

    // Body roll (steer) + squat/dive (throttle/brake)
    const roll = -p.lv / R3D.LAT_MAX * 0.045;
    p.mesh.rotation.z += (roll - p.mesh.rotation.z) * (1 - Math.exp(-5 * dt));
    const yaw = Math.atan2(p.lv, Math.max(60, p.speed));
    p.mesh.rotation.y += (yaw - p.mesh.rotation.y) * (1 - Math.exp(-5 * dt));
    const pitch = braking ? 0.035 : (p.speed < tgt - 4 ? -0.025 : 0);
    p.mesh.rotation.x += (pitch - p.mesh.rotation.x) * (1 - Math.exp(-4 * dt));
  }

  _naturalAIPace(car) {
    return R3D.SPEED_BASE * (.845 + car.power * .215) * this.diff.aiSpeed;
  }

  _aeroPace(car) {
    // Developing Career cars can retain a tow; upgrades still improve their
    // own clean-air pace. Same equipment-based rule for humans and every AI.
    const efficiency = this.config?.qualifyAI ? 1+.25*clamp((.85-car.power)/.28,0,1) : 1;
    return car.draftBoost*efficiency;
  }

  _playerRecoveryTarget(normalPace, nextCar, gap) {
    const p = this.player;
    if (!nextCar || gap <= 18) p._rejoining = false;
    else if (gap >= 80) p._rejoining = true;
    if (!p._rejoining) return Math.min(R3D.SPEED_MAX,normalPace);
    // Match traffic first, then taper only the closing speed. Interpolating
    // from weak-car pace could equal traffic speed outside a useful wake.
    const closing = clamp(gap/8,12,30) * r3dSmooth(clamp((gap-18)/32,0,1));
    const floor = nextCar.speed / (this.speedScale ?? 1) + closing;
    return Math.min(R3D.RECOVERY_MAX,Math.max(normalPace,floor));
  }

  // One snapshot per AI update. Recovery is excluded from every reference,
  // so one assisted group cannot ratchet all following groups toward the cap.
  _racingGroups() {
    const active = this.cars.filter(c => !c.dnf && !c.finished && !c.spinning).sort((a,b) => b.z-a.z);
    const groups = [], membership = new Map();
    for (const c of active) {
      let group = groups[groups.length-1];
      if (!group || group.tail.z-c.z > 60) {
        group = { front:c, tail:c, pace:0, ahead:groups[groups.length-1] || null };
        groups.push(group);
      }
      group.tail=c;
      const natural = c.isPlayer ? R3D.SPEED_BASE*(.83+c.power*.28) : this._naturalAIPace(c);
      group.pace=Math.max(group.pace, Math.min(R3D.SPEED_MAX, natural+this._aeroPace(c)));
      membership.set(c,group);
    }
    return {groups,membership};
  }

  _updateAI(dt) {
    // Where the race leader is, so stragglers know how much ground to make up
    this._leadZ = this.cars.reduce(
      (m, c) => (!c.dnf && !c.finished && c.z > m ? c.z : m), -Infinity);
    if (!isFinite(this._leadZ)) this._leadZ = this.player.z;
    const naturalLeaderPace = Math.min(R3D.SPEED_MAX, this.cars.reduce((pace,c) => !c.dnf && !c.finished && !c.spinning && c.z >= this._leadZ - 60
      ? Math.max(pace, (c.isPlayer ? R3D.SPEED_BASE * (.83 + c.power * .28) : this._naturalAIPace(c)) + this._aeroPace(c)) : pace, 0));
    const {membership} = this._racingGroups();

    for (const car of this.cars) {
      if (car.isPlayer) continue;
      if (car.contactCooldown > 0) car.contactCooldown -= dt;
      if (car.finished) continue;

      if (car.dnf) { car.mesh.rotation.y += 0.35 * dt; continue; }
      if (this._advanceCrash(car,dt)) continue;
      const aggro = this._raceAggression(car);
      const aggroMul = this.diff.aiAggro;
      const mix = (calm, wild) => calm + (wild - calm) * aggro;
      this._chooseAILine(car, aggro, dt);
      this._shoulderRace(car,dt);

      // Difficulty lifts both the AI's pace and its ceiling. Individual power
      // creates natural separation; bounded recovery helps detached cars
      // reconnect without changing their positions or slowing the leaders.
      const lead = this._leadZ || car.z;
      const pressure = this.diff.packPressure || 0;
      const gapStart = this.diff.recoveryStart ?? R3D.PACK_GAP_START * (1 - pressure * 0.8);
      const gapFull = this.diff.recoveryFull ?? gapStart + (R3D.PACK_GAP - R3D.PACK_GAP_START) * (1 - pressure * 0.6);
      const back = clamp((lead - car.z - gapStart) /
        (gapFull - gapStart), 0, 1);
      const basePace = this._naturalAIPace(car);
      // Recover through acceleration, never position snapping or leader braking.
      const leaderPace = Math.max(basePace, naturalLeaderPace);
      const catchUp = back * (this.diff.packRecovery ?? 1) * (R3D.PACK_CATCHUP * (1 + pressure * 0.5)
        + Math.max(0, Math.min(leaderPace, R3D.SPEED_MAX) - basePace) * pressure);
      const normalPace = Math.min(R3D.SPEED_MAX, basePace + this._aeroPace(car));
      const group = membership.get(car), ahead = group?.ahead;
      const next = car._pursuing && !ahead ? this.cars.reduce((n,c) => c!==car && !c.dnf && !c.finished && !c.spinning && c.z>car.z && (!n || c.z<n.z) ? c : n,null) : null;
      const pursuitGap = ahead ? ahead.tail.z-group.front.z : next ? next.z-car.z : 0;
      car._pursuing = !!this.diff.pursuitMargin && (pursuitGap>120 || (!!car._pursuing && pursuitGap>18));
      // Keep pursuing after the60-unit group merge, until an actual close tow
      // can sustain the run. Capping the reference at normal pace prevents
      // assisted cars from recursively accelerating every follower.
      const pursuitReference = ahead ? ahead.pace : next ? Math.min(R3D.SPEED_MAX,next.speed/(this.speedScale ?? 1)) : 0;
      const pursuit = car._pursuing
        ? Math.max(normalPace,pursuitReference+this.diff.pursuitMargin*r3dSmooth(clamp((pursuitGap-18)/42,0,1))) : 0;
      // Ordinary pack pressure cannot consume the headroom reserved for
      // detached groups. In-pack humans no longer receive the same free pace.
      const ordinary = Math.min(normalPace+catchUp,Math.max(normalPace,leaderPace+6),ahead ? R3D.RECOVERY_MAX : R3D.SPEED_MAX);
      const tgt = Math.min(Math.max(ordinary,pursuit), R3D.RECOVERY_MAX) * (this.speedScale ?? 1) * this._healthPace(car);
      car.speed += (tgt - car.speed) * (1 - Math.exp(-2.2 * dt));   // frame-rate independent

      // ── Lateral motion with inertia ─────────────────────────
      // A stock car has mass: it cannot reverse direction instantly. Steering
      // sets a DESIRED lateral velocity, and real velocity is accelerated
      // toward it under a hard limit, so every line change is a smooth arc and
      // a bump is absorbed rather than teleporting the car sideways.
      const maxLat  = mix(R3D.AI_LAT_MAX * 0.75, R3D.AI_LAT_MAX) * aggroMul;
      const latAcc  = mix(R3D.AI_LAT_ACC * 0.7, R3D.AI_LAT_ACC) * aggroMul;
      const err     = car.targetX - car.x;
      // Ease into the target so cars settle instead of overshooting and hunting
      const desired = clamp(err * R3D.AI_STEER_GAIN, -maxLat, maxLat);
      car.lvx = car.lvx || 0;
      car.lvx += clamp(desired - car.lvx, -latAcc * dt, latAcc * dt);
      car.lvx *= Math.pow(R3D.AI_LAT_DAMP, dt);
      car.x += car.lvx * dt;
      car.z += car.speed * dt;
      car.mesh.position.set(car.x, 0, car.z);
      // Subtle AI body roll based on lateral movement
      const aiRoll = clamp((car.lvx / R3D.AI_LAT_MAX) * 0.055, -0.055, 0.055);
      car.mesh.rotation.z += (aiRoll - car.mesh.rotation.z) * (1 - Math.exp(-6 * dt));
    }
  }

  _raceAggression(car) {
    const calm = R3D.CALM_FRAC / Math.max(0.5, this.diff.aiAggro);
    const phase = r3dSmooth((car.z / (this.raceLength || R3D.TRACK_LEN) - calm) /
      Math.max(0.01, R3D.ENDGAME_FRAC - calm));
    const temperament = clamp(((car.raceNerve || 1) - 1) * 0.45, -0.08, 0.08);
    return clamp(0.38 + phase * 0.44 + temperament, 0.3, 0.9);
  }

  _wantsTrain(car) {
    const lead = this._leadZ ?? Math.max(...this.cars.filter(c => !c.dnf && !c.finished).map(c => c.z));
    // Cooperation is a way to catch the leaders. Drivers contest the finish,
    // and drivers already in the leading group take their own opportunities.
    return lead - car.z > 65 - (this.diff.packPressure || 0) * 35 && car.z / (this.raceLength || R3D.TRACK_LEN) < 0.80 + (this.diff.racecraft || 0) * 0.07;
  }

  _laneSafe(car, x) {
    if (Math.abs(x) > (this.trackHalfWidth ?? R3D.HALF_W) - 1.4) return false;
    // Check the swept lane corridor, including a car closing from behind.
    return !this.cars.some(other => {
      if (other === car || other.dnf || other.finished) return false;
      const dz = other.z - car.z;
      // Pulling away from an overlapping lane increases clearance, including
      // at bumper contact. Do not mistake the car being passed for a blocker
      // in the destination lane, or the move will be cancelled halfway out.
      // Tiny alignment offsets at opposite bumpers must not veto both exits.
      if (Math.abs(other.x - car.x) < R3D.CAR_SEP_X &&
          Math.abs(x - other.x) > R3D.CAR_SEP_X + 0.4 &&
          ((x - car.x) * (car.x - other.x) >= 0 ||
            (Math.abs(other.x - car.x) < 0.35 && Math.abs(dz) > R3D.CAR_SEP_Z * 0.8))) return false;
      const nearPath = other.x > Math.min(car.x, x) - R3D.CAR_SEP_X - 0.25 &&
        other.x < Math.max(car.x, x) + R3D.CAR_SEP_X + 0.25;
      const future = dz + (other.speed - car.speed) * 0.9;
      return nearPath && ((dz > -9 && dz < 9) || (future > -9 && future < 9));
    });
  }

  _chooseAILine(car, aggro, dt) {
    const hw = (this.trackHalfWidth ?? R3D.HALF_W) - 1.4;
    const step = R3D.LANE_STEP + 0.6;
    const alternatives = [car.x - step, car.x + step].filter(x => this._laneSafe(car, x));
    const hazard = [...this.wrecks, ...this.cars.filter(c => c !== car && c.spinning)]
      .find(w => w.z > car.z && w.z - car.z < Math.max(90, car.speed * 2) &&
        Math.abs(w.x - car.x) < 3.5);
    car.laneTimer = (car.laneTimer || 0) - dt;
    car.tacticTimer = (car.tacticTimer || 0) - dt;
    if (hazard) {
      const safe = alternatives.filter(x => Math.abs(x - hazard.x) > 3);
      if (safe.length) {
        car.targetX = safe.sort((a, b) => Math.abs(b - hazard.x) - Math.abs(a - hazard.x))[0];
        car._tactic = 'avoid';
        car.tacticTimer = 1.4;
      }
      return;
    }

    // A prolonged bumper partnership is useful, but not a permanent escort.
    // Break into clear racing room before the pusher banks a free late pass.
    // This applies to rivals and teammates, with earlier responses on Pro.
    // Race-local memory survives brief separations and swaps of the leading car.
    const partners = car._partnerships || (car._partnerships = new Map());
    let rideTime = 0;
    for (const other of this.cars) {
      if (other === car) continue;
      const close = !other.dnf && !other.finished && !other.spinning &&
        Math.abs(car.z-other.z) < R3D.PUSH_Z+3 && Math.abs(car.x-other.x) < R3D.PUSH_X;
      let record = partners.get(other);
      if (close) {
        if (!record) { record={time:0,apart:0}; partners.set(other,record); }
        record.time += dt; record.apart=0;
        rideTime = Math.max(rideTime,record.time);
      } else if (record) {
        record.apart += dt;
        if (record.apart > 2) record.time = Math.max(0,record.time-dt*.25);
        if (!record.time) partners.delete(other);
      }
    }
    car._rideTime = rideTime;
    if (car._rideTime >= (this.diff.rideLimit ?? 6) && alternatives.length &&
        !(car._tactic === 'breakaway' && car.tacticTimer > 0)) {
      car.targetX = alternatives.sort((a,b) => this._scoreLane(car,b,aggro)-this._scoreLane(car,a,aggro))[0];
      car._tactic = 'breakaway';
      car.tacticTimer = car.laneTimer = 2.6;
      return;
    }
    if (car._tactic === 'breakaway' && car.tacticTimer > 0) {
      if (!this._laneSafe(car, car.targetX)) {
        car.targetX = car.x; car._tactic = null; car.tacticTimer = car.laneTimer = 0;
      } else return;
    }

    // Any driver will work with any useful partner, including the player.
    // Let an existing passing/avoidance move finish before seeking a new line.
    if (this._wantsTrain(car) && !(['pass', 'avoid', 'defend'].includes(car._tactic) && car.tacticTimer > 0)) {
      const candidates = this.cars.filter(c => c !== car && !c.dnf && !c.finished && !c.spinning &&
        c.z > car.z && c.z - car.z < R3D.DRAFT_Z * 1.4 && Math.abs(c.x - car.x) < 6);
      const soloPace = this._naturalAIPace(car) * (this.speedScale ?? 1);
      const partner = candidates.filter(c => c.speed > soloPace-8 && car.speed-c.speed < 10 &&
        (Math.abs(c.x-car.x)<.35 || this._laneSafe(car,c.x))).sort((a,b) =>
        (a.z-car.z+Math.abs(a.x-car.x)*12-Math.min(12,a.speed-soloPace)*2) -
        (b.z-car.z+Math.abs(b.x-car.x)*12-Math.min(12,b.speed-soloPace)*2))[0];
      if (partner) {
        car.targetX = clamp(partner.x, -hw, hw);
        car._tactic = partner.z - car.z < R3D.PUSH_Z + 3 ? 'push' : 'join';
        car.tacticTimer = car.laneTimer = 0.8;
        return;
      }
      const pusher = this.cars.find(c => c !== car && !c.dnf && !c.finished && !c.spinning &&
        car.z - c.z > 0 && car.z - c.z < 28 && Math.abs(c.x-car.x) < 2.5 && c.speed >= car.speed - 2);
      if (pusher) {
        car.targetX = car.x;
        car._tactic = 'receive';
        car.tacticTimer = car.laneTimer = 0.8;
        return;
      }
    }

    if (car._tactic && car.tacticTimer > 0) {
      // Safety can cancel a move; drafting appeal cannot cancel a committed pass.
      if (Math.abs(car.targetX - car.x) > 0.2 && !this._laneSafe(car, car.targetX)) {
        car.targetX = car.x;
        car._tactic = null;
        car.laneTimer = 0.65;
      }
      return;
    }
    car._tactic = null;
    if (car.laneTimer > 0) return;

    const ahead = this.cars.filter(c => c !== car && !c.dnf && !c.finished && !c.spinning &&
      c.z > car.z && Math.abs(c.x - car.x) < R3D.CAR_SEP_X)
      .sort((a, b) => a.z - b.z)[0];
    const craft = this.diff.racecraft || 0;
    const gap = ahead ? ahead.z - car.z : Infinity;
    const closing = ahead ? car.speed - ahead.speed : 0;
    const nerve = car.raceNerve || 1;
    // A racer with a real run contests the leading group and the finish.
    const runNeeded = (3.05 - aggro * 1.45 - craft * 0.45) / nerve;
    const hasRun = closing > runNeeded ||
      (car.draftMomentum > 15 && closing > -0.7 && aggro > 0.32);
    // A long pullout with no closing speed spends the carried run before the
    // car reaches its rival. Stay in the tow until the move is achievable.
    const passingReach = clamp(8+Math.max(0,closing)*(R3D.DRAFT_CARRY+1.2),12,28);
    if (gap < passingReach && hasRun && alternatives.length) {
      car.targetX = alternatives.sort((a, b) =>
        this._scoreLane(car, b, aggro) - this._scoreLane(car, a, aggro))[0];
      car._tactic = 'pass';
      car.tacticTimer = 3.8 - aggro * 0.8;
      car.laneTimer = car.tacticTimer;
      return;
    }

    const chaser = this.cars.filter(c => c !== car && !c.dnf && !c.finished && !c.spinning &&
      car.z - c.z > R3D.CAR_SEP_Z && car.z - c.z < R3D.BLOCK_Z * (1 + craft * 0.5) &&
      c.speed > car.speed + 2 - craft && Math.abs(c.x - car.x) > 0.7 &&
      this._laneSafe(car,clamp(car.x+clamp(c.x-car.x,-R3D.BLOCK_MAX,R3D.BLOCK_MAX),-hw,hw)))
      .sort((a,b) => (car.z-a.z)/(a.speed-car.speed) - (car.z-b.z)/(b.speed-car.speed))[0];
    if (chaser && aggro * nerve + craft * 0.25 > 0.7) {
      const target = clamp(car.x + clamp(chaser.x - car.x, -R3D.BLOCK_MAX, R3D.BLOCK_MAX), -hw, hw);
      if (this._laneSafe(car, target)) {
        car.targetX = target;
        car._tactic = 'defend';
        car.tacticTimer = R3D.TACTIC_COMMIT;
        car.laneTimer = R3D.TACTIC_COMMIT;
        return;
      }
    }

    // Hold contact briefly, but allow an earned passing run to leave a push.
    if (car._pushLocked) {
      car.targetX = car.x;
      car.laneTimer = 0.6;
      return;
    }
    const stay = this._scoreLane(car, car.x, aggro);
    const best = alternatives.sort((a, b) =>
      this._scoreLane(car, b, aggro) - this._scoreLane(car, a, aggro))[0];
    const move = best !== undefined &&
      this._scoreLane(car, best, aggro) > stay + R3D.LANE_GAIN_MIN;
    car.targetX = move ? best : car.x;
    car._tactic = move ? 'rejoin' : null;
    car.laneTimer = (R3D.LANE_COMMIT * (1.2 - aggro * 0.45)) / nerve;
    car.tacticTimer = car.laneTimer;
  }

  // ── Lane judgement ───────────────────────────────────────────
  // Score how good a piece of track would be for this car right now. Higher is
  // better. This is what gives the AI race IQ: it moves for a reason (clear
  // air, a tow, avoiding someone alongside) instead of drifting at random.
  _scoreLane(car, laneX, aggro) {
    const hw = (this.trackHalfWidth ?? R3D.HALF_W) - 1.4;
    if (Math.abs(laneX) > hw) return -100;

    let score      = 0;
    let nearestAhead = Infinity;   // gap to the next car in this lane
    let aheadCar   = null;         // whoever that is
    let towGap     = Infinity;     // gap to a car close enough to tow off
    let towCar     = null;         // the car providing that tow
    let blocked    = false;        // someone occupying that space right now

    for (const other of this.cars) {
      if (other === car || other.dnf || other.finished) continue;
      const dz  = other.z - car.z;
      const adx = Math.abs(other.x - laneX);
      if (adx > R3D.LANE_WIDTH) continue;

      // Anyone level with us there makes the move unsafe
      if (Math.abs(dz) < R3D.CAR_SEP_Z * 1.6 && adx < R3D.CAR_SEP_X * 1.25) blocked = true;

      if (dz > 0) {
        if (dz < nearestAhead) { nearestAhead = dz; aheadCar = other; }
        if (dz > R3D.PUSH_Z && dz < R3D.DRAFT_Z && dz < towGap) { towGap = dz; towCar = other; }
      }
    }

    // Clear air ahead is worth a lot - this is what makes a car pull out of a
    // queue and go, rather than sitting in dirty air forever.
    score += Math.min(nearestAhead, 140) / 140 * (1 + aggro * 0.6);

    // Chasing drivers value a connected line; leaders value a passing lane.
    if (towGap < Infinity) {
      const towQuality = r3dWake({ ...car, x: laneX }, towCar).tow;
      const trainLen = (towCar && towCar.chainLen) || 1;
      score += towQuality * R3D.TOW_APPEAL * (this._wantsTrain(car) ? 2.2 + Math.min(trainLen,8)*.12 : .85);
    }

    // Stuck behind someone slower is the thing a racer most wants to fix, so
    // a lane that has you bottled up scores badly and the way past looks good.
    if (aheadCar && nearestAhead < R3D.STUCK_Z && aheadCar.speed < car.speed - 1) {
      const howStuck = 1 - (nearestAhead / R3D.STUCK_Z);
      score -= howStuck * R3D.STUCK_PENALTY;
    }

    // Never move into a car
    if (blocked) score -= 3.0;

    // Prefer to keep off the wall
    score -= Math.pow(Math.abs(laneX) / hw, 3) * 0.5;

    // Sticking to your current line has value; late in the race, less so
    if (Math.abs(laneX - car.x) < 0.05) score += R3D.LANE_INERTIA * (1 - aggro * 0.6);

    return score;
  }

  _calcDraft(dt) {
    const active = this.cars.filter(c => !c.dnf && !c.finished && !c.spinning)
      .slice().sort((a, b) => b.z - a.z);
    for (const car of this.cars) {
      car.towStrength = 0;
      car.pushStrength = 0;
      car.receivedPush = 0;
      car.chainLen = 1;
      car._wakeLeader = null;
      car._pushTarget = 0;
      car._draftDepth = 1;
      if (car.dnf || car.finished || car.spinning) {
        car.draftBoost = car.draftMomentum = 0;
        car._draftCarryMomentum = car._draftCarryTimer = 0;
      }
    }

    const trains = new Map();
    // Forward-only links cannot cycle. A distant or offset wake still gives
    // a tow, but only close aligned cars share a train's efficiency benefit.
    for (const car of active) {
      for (const other of active) {
        if (other === car) continue;
        const wake = r3dWake(car, other);
        if (wake.tow > car.towStrength) {
          car.towStrength = wake.tow;
          car._wakeLeader = other;
        }
        const bonus = R3D.PUSH_BONUS;
        car.pushStrength = Math.max(car.pushStrength, wake.push);
        car._pushTarget = Math.max(car._pushTarget, wake.push * bonus);
        // Direct push only; do not recirculate accumulated aero through a pair.
        other.receivedPush = Math.max(other.receivedPush, wake.push * bonus * .75);
      }
      car._draftDepth = car._wakeLeader ? (car._wakeLeader._draftDepth || 1) + 1 : 1;
      const leader = car._wakeLeader;
      car._trainRoot = leader && leader.z-car.z < R3D.CHAIN_LINK_Z && car.towStrength > .55
        ? leader._trainRoot : car;
      const members = trains.get(car._trainRoot) || [];
      members.push(car);
      trains.set(car._trainRoot,members);
    }

    for (const members of trains.values()) for (const car of members) car.chainLen = members.length;
    // Every additional linked car helps the whole line, with diminishing gains.
    // Two cars no longer get an advantage that a larger chasing line cannot earn.
    for (const car of active) {
      const chain = R3D.CHAIN_MAX * (1 - Math.exp(-(car.chainLen-1) / 3));
      const rawTarget = car.towStrength * R3D.DRAFT_BOOST + car._pushTarget + chain + car.receivedPush;
      const draftGain = car.isPlayer ? R3D.PLAYER_DRAFT_STRENGTH : 1;
      let target = Math.min(R3D.AERO_MAX * draftGain * (car.isPlayer ? 1 : (this.diff.aiDraft ?? 1)),
        rawTarget * draftGain * (car.isPlayer ? this.diff.playerDraft : (this.diff.aiDraft ?? 1)));
      const before = car.draftMomentum || 0;
      const activeDraft = car.towStrength > 0.12 || car.pushStrength > 0.12 || car.receivedPush > 1;
      if (activeDraft) {
        car._draftCarryMomentum = before;
        car._draftCarryDuration = R3D.DRAFT_CARRY;
        car._draftCarryTimer = car._draftCarryDuration;
      } else if ((car._draftCarryTimer || 0) > 0 && (car._draftCarryMomentum || 0) > 8) {
        car._draftCarryTimer = Math.max(0, car._draftCarryTimer - dt);
        const carryFrac = car._draftCarryTimer / (car._draftCarryDuration || R3D.DRAFT_CARRY);
        target = Math.max(target, car._draftCarryMomentum * (0.72 + carryFrac * 0.28));
      }
      const rate = target > before ? R3D.DRAFT_BUILD : R3D.DRAFT_RELEASE;
      car.draftMomentum = before + (target - before) * (1 - Math.exp(-rate * dt));
      car.draftBoost = car.draftMomentum;
    }
  }

  // ── Contact resolution ───────────────────────────────────────
  // Cars are pushed apart at a bounded RATE and nudged with velocity impulses,
  // never snapped to a new position. That is the difference between a stock car
  // leaning on another one and a car teleporting sideways when you touch it.
  _separateCars(dt) {
    const step = Math.max(dt || 0.016, 0.001);
    const active = this.cars.filter(c => !c.finished && !c.dnf && !c.spinning);
    const startX = new Map(active.map(c => [c,
      Number.isFinite(c._frameStartX) ? c._frameStartX : c.x]));
    // Cleared here so _updateAI (which runs first) reads last frame's value
    for (const c of this.cars) c._pushLocked = false;

    // Two passes so a shunt propagates down a queue in the same frame
    for (let pass = 0; pass < 2; pass++) {
      active.sort((a, b) => b.z - a.z);
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const A = active[i], B = active[j];      // A ahead, B behind
          const dz = A.z - B.z, dx = B.x - A.x, adx = Math.abs(dx);
          if (dz >= R3D.CAR_SEP_Z || adx >= R3D.CAR_SEP_X) continue;

          A._pushLocked = true; B._pushLocked = true;

          // Blend from bumper compression to door contact as overlap changes.
          // A car pulling away sideways must not receive a fresh fixed kick
          // every solver pass or be held back behind the old bumper plane.
          const bumper = 1 - r3dSmooth((adx - 0.8) / 0.7);
          if (bumper > 0) {
            const overlapZ = R3D.CAR_SEP_Z - dz;
            B.z -= Math.min(overlapZ, R3D.SEP_Z_RATE * step * 0.5) * bumper;
            const floorZ = A.z - R3D.CAR_SEP_Z * 0.82;
            if (adx < 0.8 && B.z > floorZ) B.z = floorZ;
            B.mesh.position.z = B.z;
            const diff = B.speed - A.speed;
            if (diff > 0) {
              const give = Math.min(diff, 60) * (1 - Math.exp(-2.6 * step)) * bumper;
              const transfer = Math.min(give, Math.max(0,R3D.RECOVERY_MAX*(this.speedScale ?? 1)-A.speed), Math.max(0,B.speed-40));
              A.speed += transfer;
              B.speed -= transfer;
            }
          }

          if (adx > 0.8) {
            const dir = dx > 0 ? 1 : -1;
            const av = A.isPlayer ? (A.lv || 0) : (A.lvx || 0);
            const bv = B.isPlayer ? (B.lv || 0) : (B.lvx || 0);
            const closing = Math.max(0, (av - bv) * dir);
            const overlap = (R3D.CAR_SEP_X - adx) / R3D.CAR_SEP_X;
            const side = r3dSmooth((adx - 0.8) / 0.7);
            // Pressure and damping scale with elapsed time; separating cars
            // retain their intended motion. Half strength per solver pass.
            if(dz<R3D.CAR_SEP_Z*.62) this._sideContact(A,B,closing,overlap*side,step*.5,dir);
            const imp = (overlap * R3D.CONTACT_IMPULSE + closing * 2) * side * step * 0.5;
            const corr = Math.min((R3D.CAR_SEP_X - adx) * 0.5,
              R3D.SEP_X_RATE * step * 0.5) * side;
            A.x -= dir * corr;
            B.x += dir * corr;
            A.mesh.position.x = A.x; B.mesh.position.x = B.x;
            if (A.isPlayer) A.lv = clamp(av - dir * imp, -R3D.LAT_MAX, R3D.LAT_MAX);
            else A.lvx = clamp(av - dir * imp, -R3D.AI_LAT_MAX * 1.5, R3D.AI_LAT_MAX * 1.5);
            if (B.isPlayer) B.lv = clamp(bv + dir * imp, -R3D.LAT_MAX, R3D.LAT_MAX);
            else B.lvx = clamp(bv + dir * imp, -R3D.AI_LAT_MAX * 1.5, R3D.AI_LAT_MAX * 1.5);
          }
        }
      }
    }
    // A car can overlap more than one neighbor in dense traffic. Cap the total
    // correction from all solver pairs, not only each pair, so traffic pressure
    // cannot add up to a sideways jump in a single physics step.
    for (const car of active) {
      const origin = startX.get(car);
      const maxRate = car.isPlayer ? R3D.LAT_MAX : R3D.AI_LAT_MAX * 1.5 + R3D.SEP_X_RATE;
      car.x = clamp(car.x, origin - maxRate * step, origin + maxRate * step);
      car.mesh.position.x = car.x;
    }
    const speedLimit = R3D.RECOVERY_MAX*(this.speedScale ?? 1);
    for (const car of active) car.speed=Math.min(car.speed,speedLimit);
  }

  _incidentRules() {
    if(this._raceFeatures) return this._raceFeatures;
    if(this.config?.practiceTips || !this.config?.raceRules) return {crashes:false,damage:false};
    return this._raceFeatures=raceFeatureRules(this.config.difficulty || this.diff?.id,this.config.raceRules);
  }

  _healthPace(car) {
    const rules=this._incidentRules();
    return (rules.damage ? .70+.30*(car.raceHealth ?? 100)/100 : 1) *
      (rules.crashes ? Math.max(.74,1-(car.crashCount||0)*.06) : 1);
  }

  _damageCar(car,amount) {
    if(!this._incidentRules().damage || car.finished || car.dnf || amount<=0) return;
    // Race health is deliberately forgiving: side rubs, walls and crash
    // impacts all use one scale, independently of loss-of-control strain.
    car.raceHealth=clamp((car.raceHealth ?? 100)-amount*.20,0,100);
    if(car.raceHealth<=0 && !car._zeroHealthHandled) {
      car._zeroHealthHandled=true;
      if(this._incidentRules().crashes) {
        if(car.wheels?.[0]) car.wheels[0].scale.set(1,.55,.8);
        this._beginCrash(car,Math.sign(car.x)||1,'blowout');
      }
    }
  }

  _sideContact(a,b,closing,pressure,dt,dir) {
    const rules=this._incidentRules();if(!rules.crashes && !rules.damage) return;
    // Bumper drafts never call this path. Brief/light rubs produce negligible
    // strain; repeated sustained lateral force builds toward loss of control.
    const strain=(Math.max(0,closing-1)*3+pressure*1.5)*dt;
    for(const [car,side] of [[a,-dir],[b,dir]]) {
      if(car.spinning || car._crashGrace>0) continue;
      this._damageCar(car,(Math.max(0,closing-1)*5+pressure*.8)*dt);
      // AI door contact needs sustained force; human-caused AI strain is
      // reduced modestly, AI-only strain substantially. Player tolerance stays.
      const strainScale = car.isPlayer ? 1 : (a.isPlayer || b.isPlayer ? .80 : .25);
      car.sideStrain=(car.sideStrain||0)+strain*strainScale;car._recentSide=.5;
      const threshold=this._crashThreshold(car);
      if(rules.crashes && car.sideStrain>=threshold) this._beginCrash(car,side,'side contact');
    }
  }

  _crashThreshold(car) {
    if(car.isPlayer) return 80;
    return this.config?.seriesId==='grassroots' ? 10 : this.config?.seriesId==='challenger' ? 4 : 7;
  }

  _beginCrash(car,side,cause) {
    if(!this._incidentRules().crashes || car.spinning || car.finished || car.dnf || car._crashGrace>0) return false;
    if(cause==='collected' && ((this._collectedCount||0)>=4 || this.cars.filter(c=>c.spinning).length>=5)) return false;
    if(cause==='collected') this._collectedCount=(this._collectedCount||0)+1;
    car.spinning=true;car._crashPhase='veer';car._veerTime=.85;car.spinTimer=2.5;car.spinDir=side||1;
    car.crashCount=(car.crashCount||0)+1;car.sideStrain=0;car._crashCause=cause;
    this.wreckCount=(this.wreckCount||0)+1;
    this._damageCar(car,cause==='blowout'?0:18);
    if(cause==='blowout' && car.wheels?.[0]) car.wheels[0].scale.set(1,.55,.8);
    if(car.isPlayer) this.camShake=Math.max(this.camShake||0,.5);
    return true;
  }

  _advanceCrash(car,dt) {
    if(!car.spinning) return false;
    if(!this._incidentRules().crashes) {car.spinning=false;car._crashPhase=null;return false;}
    if(car._crashPhase==='veer') {
      car._veerTime-=dt;car.x+=car.spinDir*14*dt;car[car.isPlayer?'lv':'lvx']=car.spinDir*14;
      car.speed=Math.max(45,car.speed-80*dt);
      car.mesh.rotation.y=car.spinDir*.35;
      if(car._veerTime<=0) car._crashPhase='spin';
    } else {
      car.spinTimer=(car.spinTimer ?? 2.5)-dt;car.mesh.rotation.y+=car.spinDir*4.5*dt;
      car.speed=Math.max(30,car.speed-65*dt);
      if(car.spinTimer<=0) {
        car.spinning=false;car._crashPhase=null;car._crashGrace=5;car.mesh.rotation.y=0;
        car.lv=car.lvx=0;car.targetX=clamp(car.x,-6,6);
      }
    }
    car.z+=car.speed*dt;car.mesh.position.set(car.x,0,car.z);
    return true;
  }

  _stepContactState(dt) {
    const rules=this._incidentRules();
    if(!rules.crashes && !rules.damage) return;
    for(const car of this.cars) {
      car._crashGrace=Math.max(0,(car._crashGrace||0)-dt);
      car._recentSide=Math.max(0,(car._recentSide||0)-dt);
      if(!car._recentSide) car.sideStrain=Math.max(0,(car.sideStrain||0)-.35*dt);
      if(rules.damage && (car.raceHealth ?? 100)<=0 && !car._zeroHealthHandled) this._damageCar(car,.001);
    }
    if(!rules.crashes) return;
    // A car broadside in a spin can collect traffic; normal front/rear drafts
    // do not count. Grace and pair cooldowns bound chain reactions.
    for(const wreck of this.cars.filter(c=>c.spinning)) for(const car of this.cars) {
      if(car===wreck || car.spinning || car.finished || car.dnf || car._crashGrace>0 || car._recentSide>0) continue;
      if((wreck._crashPhase==='veer' || Math.abs(Math.sin(wreck.mesh.rotation.y))>.25) && this._wreckOverlap(wreck,car)) {
        this._damageCar(car,14);car._recentSide=1;
        car.sideStrain=(car.sideStrain||0)+(car.isPlayer?12:25);
        car.speed*=.8;
        if(car.sideStrain>=this._crashThreshold(car)) this._beginCrash(car,Math.sign(car.x-wreck.x)||1,'collected');
      }
    }
  }

  // Separating-axis test for rotated car footprints. Only used against a
  // crashing car; ordinary bumper drafting never enters this path.
  _wreckOverlap(a,b) {
    const ay=a.mesh?.rotation?.y||0,by=b.mesh?.rotation?.y||0;
    const axes=[{x:Math.cos(ay),z:-Math.sin(ay)},{x:Math.sin(ay),z:Math.cos(ay)},
      {x:Math.cos(by),z:-Math.sin(by)},{x:Math.sin(by),z:Math.cos(by)}];
    const radius=(c,y,n)=>Math.abs(n.x*Math.cos(y)-n.z*Math.sin(y))*(c.wallHalfX??R3D.CAR_SEP_X/2)+
      Math.abs(n.x*Math.sin(y)+n.z*Math.cos(y))*(c.wallHalfZ??R3D.CAR_SEP_Z/2);
    return axes.every(n=>Math.abs((a.x-b.x)*n.x+(a.z-b.z)*n.z)<radius(a,ay,n)+radius(b,by,n));
  }

  _shoulderRace(car,dt) {
    if(!this._incidentRules().crashes || car.z<1000 || car.spinning) return;
    car._shoulderWait=Math.max(0,(car._shoulderWait||0)-dt);
    if(car._shoulderTime>0) {car._shoulderTime-=dt;car.targetX=car._shoulderTarget;return;}
    if(car._shoulderWait>0 || Math.random()>.04*dt*this.diff.aiAggro) return;
    const other=this.cars.filter(c=>c!==car && !c.isPlayer && !c.spinning && !c.dnf && !c.finished && Math.abs(c.z-car.z)<2 && Math.abs(c.x-car.x)>1.5 && Math.abs(c.x-car.x)<3).sort((a,b)=>Math.abs(a.x-car.x)-Math.abs(b.x-car.x))[0];
    if(!other) return;
    car._shoulderWait=12;car._shoulderTime=.8;
    car._shoulderTarget=clamp(other.x-Math.sign(other.x-car.x)*1.1,-7.5,7.5);
    car.targetX=car._shoulderTarget;
  }

  _wallExtent(car,side=1) {
    const yaw=car.mesh?.rotation?.y || 0;
    const roll=car.mesh?.rotation?.z || 0,b=car.wallBounds;
    if(car.wallHull) {
      const a=side*Math.cos(yaw)*Math.cos(roll),c=-side*Math.cos(yaw)*Math.sin(roll),d=side*Math.sin(yaw);
      let support=-Infinity,point=0;
      for(let i=0;i<car.wallHull.length;i+=3){const h=car.wallHull,v=a*h[i]+c*h[i+1]+d*h[i+2];if(v>support){support=v;point=i;}}
      car._wallPoint=point;
      return support;
    }
    if(b) {
      const a=side*Math.cos(yaw)*Math.cos(roll),c=-side*Math.cos(yaw)*Math.sin(roll),d=side*Math.sin(yaw);
      return a*(a>=0?b.maxX:b.minX)+c*(c>=0?b.maxY:b.minY)+d*(d>=0?b.maxZ:b.minZ);
    }
    return Math.abs(Math.cos(yaw))*(car.wallHalfX ?? R3D.CAR_SEP_X/2) +
      Math.abs(Math.sin(yaw))*(car.wallHalfZ ?? R3D.CAR_SEP_Z/2);
  }

  _resolveWalls(dt) {
    const wall=this.wallInnerX ?? (this.trackHalfWidth ?? R3D.HALF_W)+0.2;
    for(const car of this.cars) {
      if(car.finished || car.dnf) continue;
      const side=Math.sign(car.x)||1,limit=Math.max(0,wall-this._wallExtent(car,side));
      const overlap=Math.abs(car.x)-limit;
      car._sparkWait=Math.max(0,(car._sparkWait||0)-dt);
      if(overlap<0) {if(overlap<-.015) car._wallContact=false;continue;}
      const key=car.isPlayer ? 'lv' : 'lvx', normal=Math.max(0,(car[key]||0)*side);
      const impact=!car._wallContact;
      car.x=side*limit;
      if(normal>0) car[key]=-side*normal*.12;
      // Inelastic normal response plus tangential scraping. Never grant speed
      // at the wall, and never penalize a car whose body has not reached it.
      car.speed=Math.max(0,car.speed-(impact ? normal*.22 : 0)-(2+car.speed*.055+normal*.65)*dt);
      if(impact) {
        this._damageCar(car,normal*.85);
        if(car._crashPhase==='veer') {car._crashPhase='spin';car.spinTimer=2.5;}
      }
      if(!car.spinning) this._damageCar(car,(normal*.25+.4)*dt);
      car._wallContact=true;
      if(car.isPlayer) this.camShake=Math.max(this.camShake||0,Math.min(.5,normal*.025));
      if(car.speed>25 && !car._sparkWait) {
        const h=car.wallHull,i=car._wallPoint||0,yaw=car.mesh.rotation.y||0,roll=car.mesh.rotation.z||0;
        const contactZ=h ? car.z-Math.sin(yaw)*Math.cos(roll)*h[i]+Math.sin(yaw)*Math.sin(roll)*h[i+1]+Math.cos(yaw)*h[i+2] : car.z;
        this._emitWallSparks(side*wall,contactZ,car.speed,side,impact?36:12);
        car._sparkWait=.025;
      }
      // AI steers back into racing room after contact, with its existing
      // acceleration-limited steering. Contact itself is identical for all.
      if(!car.isPlayer) car.targetX=clamp(car.targetX,-limit+.4,limit-.4);
      car.mesh.position.x=car.x;
    }
  }

  _emitWallSparks(x,z,speed,side,count) {
    if(!this.scene) return; // headless physics uses the same contact solver
    if(!this._wallSparks) {
      this._wallSparks=Array.from({length:384},()=>({life:0}));this._sparkCursor=0;this._sparkSeed=12345;
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(384*6),3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(384*6),3).setUsage(THREE.DynamicDrawUsage));
      geometry.setDrawRange(0,0);
      this._sparkMesh=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false}));
      this._sparkMesh.name='wall:sparks';this._sparkMesh.frustumCulled=false;this.scene.add(this._sparkMesh);
    }
    const random=()=>{let n=this._sparkSeed;n^=n<<13;n^=n>>>17;n^=n<<5;this._sparkSeed=n;return (n>>>0)/4294967296;};
    for(let i=0;i<count;i++) {
      const p=this._wallSparks[this._sparkCursor++%384];
      p.x=x-side*.06;p.y=.4+random()*.4;p.z=z+(random()-.5)*.8;
      p.vx=-side*(2+random()*7);p.vy=2+random()*6;p.vz=-speed*(.18+random()*.3);
      p.life=p.maxLife=.35+random()*.3;
    }
  }

  _stepWallSparks(dt) {
    if(!this._wallSparks) return;
    const g=this._sparkMesh.geometry,pos=g.attributes.position,col=g.attributes.color;let index=0;
    for(const p of this._wallSparks) {
      p.life-=dt;if(p.life<=0) continue;
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=9*dt;
      if(p.y<.03){p.y=.03;p.vy=Math.abs(p.vy)*.2;}
      const fade=p.life/p.maxLife;
      pos.setXYZ(index,p.x,p.y,p.z);pos.setXYZ(index+1,p.x-p.vx*.06,p.y-p.vy*.06,p.z-p.vz*.06);
      col.setXYZ(index,3*fade,2.2*fade,.8*fade);col.setXYZ(index+1,1.8*fade,.5*fade,.04*fade);index+=2;
    }
    pos.needsUpdate=col.needsUpdate=true;g.setDrawRange(0,index);
  }

  _checkCollisions() {
    const p = this.player;
    if (p.spinning || p.finished) return;
    for (const car of this.cars) {
      if (car === p || car.finished) continue;
      const adx = Math.abs(p.x - car.x), adz = Math.abs(p.z - car.z);
      if (adx < 1.9 && adz < 4.2) {
        const isBumperPush = p.z < car.z && adz > adx * 1.5;
        if (!isBumperPush && car.contactCooldown <= 0) {
          car.contactCooldown = R3D.BUMP_DEBOUNCE;
          const sideClosing = Math.max(0, ((p.lv || 0) - (car.lvx || 0)) * Math.sign(car.x - p.x));
          this._bumpPlayer(car.x < p.x ? 1 : -1, sideClosing);
        }
        return;
      }
    }
    for (const w of this.wrecks) {
      if (Math.abs(p.x - w.x) < 2.4 && Math.abs(p.z - w.z) < 2.8) {
        this._spinPlayer(2.0, Math.sign(p.lv) || 1, 1.5);
        this._warn('HIT WRECK');
        return;
      }
    }
  }

  _bumpPlayer(pushDir, severity = 0) {
    const p = this.player;
    if (p.spinning) return;
    // The separation solver owns lateral forces. Doubling its impulse here
    // made a harmless rub turn into a sudden sideways launch.
    p.speed = Math.max(p.speed * (1 - clamp(severity * 0.004, 0, 0.025)), 80);
    this.camShake = Math.max(this.camShake, 0.2);
  }

  _spinPlayer(duration, dir, shake) { this._beginCrash(this.player,dir,'contact'); }

  // Visual-only: roll the wheels at road speed
  _animateCars(dt) {
    for (const car of this.cars) {
      if (!car.wheels) continue;
      const droll = car.speed * dt / R3D.WHEEL_R;
      for (const w of car.wheels) w.rotation.x -= droll;
    }
  }

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

  _checkFinish() {
    const TL = this.raceLength || R3D.TRACK_LEN;
    // Several cars can cross on the same frame - at 200+ units/sec a frame is
    // worth ~10 units of track. They must be credited in the order they are
    // actually down the road, NOT in array order: the player sits at index 0,
    // so iterating the array credited you ahead of a team-mate you had just
    // pushed to the line.
    const crossed = [];
    for (const car of this.cars) {
      if (!car.finished && car.z >= TL) crossed.push(car);
    }
    if (!crossed.length) return;
    crossed.sort((a, b) => b.z - a.z);        // furthest down the track first

    // One capture at the first crossing, not when the human later finishes.
    // Practice has no news flow. No extra render work during ordinary racing.
    if (!this.finishOrder.length && this.config?.qualifyAI && this.renderer) this._captureFinishPhoto(crossed[0]);

    for (const car of crossed) {
      car.finished = true;
      this.finishOrder.push(car);
    }
    const player = crossed.find(c => c.isPlayer);
    if (this.player2) {
      if (this.player.finished && this.player2.finished) {
        this.done = true;
        this._updateDualHUD(1);
        const p1 = this.finishOrder.indexOf(this.player)+1, p2 = this.finishOrder.indexOf(this.player2)+1;
        const el = document.getElementById('r3d-finish');
        el.innerHTML = `<div class="r3d-finish-box"><h2>Race Results</h2><p>Player 1 · #${this.player.number} · ${p1}${ordinal(p1)}</p><p>Player 2 · #${this.player2.number} · ${p2}${ordinal(p2)}</p><button class="btn btn-primary btn-lg" onclick="window._r3dFinish(${p1})">Continue</button></div>`;
        el.style.display = 'flex';
      }
      return;
    }
    if (player) {
      this.done = true;
      const pos = this.finishOrder.indexOf(player) + 1;
      // The tower normally refreshes at 5fps. Once done is set the main loop
      // stops updating it, so force one authoritative final refresh here.
      this._updateOrder(pos, this.cars.filter(c => !c.dnf).length);
      this._showFinish(pos);
    }
  }

  _captureFinishPhoto(leader) {
    if (!this.renderer || !this.scene || this._finishPhotoAttempted) return;
    this._finishPhotoAttempted = true;
    const r=this.renderer, width=1024, height=576, line=this.raceLength || R3D.TRACK_LEN;
    const target=new THREE.WebGLRenderTarget(width,height,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
    const camera=new THREE.PerspectiveCamera(48,width/height,0.5,2200);
    // A high trackside eye just beyond the line sees noses and the approaching
    // pack. The finish structure remains visible behind the crossing cars.
    camera.position.set((this.trackHalfWidth ?? R3D.HALF_W)-1,7,line+24);
    camera.lookAt(0,0.9,line-7);
    const old={target:r.getRenderTarget(),viewport:r.getViewport(new THREE.Vector4()),
      scissor:r.getScissor(new THREE.Vector4()),scissorTest:r.getScissorTest(),autoClear:r.autoClear,
      player:this.player,shadowAutoUpdate:r.shadowMap.autoUpdate};
    const positions=this.cars.map(c=>[c.mesh,c.mesh.position.clone()]);
    try {
      // Windowed track/stands must be present at the leader even when the human
      // is far behind. Restore those pools before the next chase/mirror pass.
      this.player={z:line}; this._positionTrack(); this._positionGrandstands();
      this.cars.forEach(c=>c.mesh.position.set(c.x,0,c.z));
      r.setScissorTest(false); r.setRenderTarget(target); r.autoClear=true;
      r.shadowMap.autoUpdate=false;
      r.clear(true,true,true); r.render(this.scene,camera);
      const pixels=new Uint8Array(width*height*4);
      r.readRenderTargetPixels(target,0,0,width,height,pixels);
      const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
      const ctx=canvas.getContext('2d'), frame=ctx.createImageData(width,height);
      for(let y=0;y<height;y++) frame.data.set(pixels.subarray((height-1-y)*width*4,(height-y)*width*4),y*width*4);
      ctx.putImageData(frame,0,0);
      this.finishPhoto={dataUrl:canvas.toDataURL('image/jpeg',0.88),leaderName:leader.label || 'The race winner',leaderId:leader.entrantId,grid:this._newsGrid,width,height};
    } catch(error) {
      // Photo failure must not interrupt classification or saving.
      this.finishPhoto=null;
      console.warn('Finish photograph unavailable:',error.message);
    } finally {
      this.player=old.player;
      for(const [mesh,position] of positions) mesh.position.copy(position);
      this._positionTrack(); this._positionGrandstands();
      r.shadowMap.autoUpdate=old.shadowAutoUpdate;
      r.setRenderTarget(old.target); r.setViewport(old.viewport); r.setScissor(old.scissor);
      r.setScissorTest(old.scissorTest); r.autoClear=old.autoClear;
      target.dispose();
    }
  }

  // The real running order at the moment the player takes the flag: cars that
  // already finished in the order they crossed, then everyone else by distance,
  // then retirements. Used so the on-track result - including your team-mates -
  // is what actually goes in the results table.
  finalOrder() {
    const finished = this.finishOrder.slice();
    const running  = this.cars
      .filter(c => !c.finished && !c.dnf)
      .sort((a, b) => b.z - a.z);
    const retired  = this.cars.filter(c => c.dnf);
    return [...finished, ...running, ...retired].map((c, i) => ({
      entrantId: c.entrantId || null,
      carId:    c.carId || null,
      isPlayer: !!c.isPlayer,
      number:   c.number,
      label:    c.label,
      teamName: c.teamName || null,
      teamColor: r3dHex(c.hex),
      raceHealth: c.raceHealth ?? 100,
      crashes: c.crashCount || 0,
      position: i + 1,
      dnf:      !!c.dnf,
    }));
  }

  // Kept as a harmless compatibility hook; no timer-generated wrecks.
  _triggerWreck() {}

  _dropDebris(car) {
    const wx = car.x, wz = car.z;
    this.wrecks.push({ x: wx, z: wz });
    const db = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.35, 2.8),
      new THREE.MeshLambertMaterial({ color: 0x4c4c52 }));
    db.rotation.y = Math.random() * Math.PI;
    db.position.set(wx, 0.18, wz); this.scene.add(db);
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x8a8a90, transparent: true, opacity: 0.38 }));
    smoke.position.set(wx, 1.9, wz); this.scene.add(smoke);
  }

  _updateCamera(dt) {
    this._positionTrack();
    this._positionGrandstands();
    const p  = this.player;
    const sk = this.camShake;
    const nx = sk > 0 ? (Math.random() - 0.5) * sk : 0;
    const ny = sk > 0 ? (Math.random() - 0.5) * sk * 0.4 : 0;

    // Perceived speed is deliberately decoupled from simulation speed. A low,
    // elevated camera and a broad race-speed FOV preserve the arcade sensation
    // without making every car cover the track unrealistically quickly.
    const speedFeel = r3dSmooth(clamp((p.speed - R3D.PACE_SPEED) / (245 - R3D.PACE_SPEED), 0, 1));
    const fovTarget = R3D.CAMERA_FOV_MIN +
      (R3D.CAMERA_FOV_MAX - R3D.CAMERA_FOV_MIN) * speedFeel;
    this.camera.fov += (fovTarget - this.camera.fov) * (1 - Math.exp(-4.35 * dt));
    this.camera.updateProjectionMatrix();

    const tx = p.x * 0.85 + nx;
    const ty = 6.0 + ny;
    const followZ = R3D.CAMERA_NEAR_Z + (R3D.CAMERA_FAR_Z - R3D.CAMERA_NEAR_Z) * speedFeel;
    const tz = p.z - followZ + nx * 0.15;
    this.camera.position.x += (tx - this.camera.position.x) * (1 - Math.exp(-6 * dt));
    this.camera.position.y += (ty - this.camera.position.y) * (1 - Math.exp(-5 * dt));
    // Longitudinal camera lag changed the apparent following distance with
    // FPS and draft speed. Keep the familiar race-speed framing at a fixed
    // distance; ease lateral motion without changing the size of the pack.
    this.camera.position.z = tz;
    this.camera.lookAt(p.x * 0.55, 0.8, p.z + 30);
    this.camera.rotateZ(-p.lv / R3D.LAT_MAX * 0.026);
    this.camShake = Math.max(0, sk - dt * 2.5);

    // Virtual interior mirror: enough eye-to-bumper distance to show the
    // following car's nose and wheels, not just its roof. Our own mesh is
    // hidden for this pass, so the cabin never obscures the view.
    this.mirrorCam.position.set(p.x, 1.15, p.z + 5);
    this.mirrorCam.lookAt(p.x, -0.5, p.z - 24);
  }

  // Rear-view mirror.
  //
  // The old approach negated projectionMatrix.elements[0] to flip left/right.
  // That also reverses triangle winding, so every front face was drawn as a
  // back face - surfaces looked hollow and textures read wrong. Instead we
  // render the rear view normally into an offscreen target (correct winding,
  // correct lighting) and then blit it through a quad with mirrored UVs.
  _initMirrorTarget(w, h) {
    if (this.mirrorRT) this.mirrorRT.dispose();
    const Target = this.renderer.capabilities.isWebGL2 && !this.lowPower
      ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget;
    this.mirrorRT = new Target(Math.max(2, w), Math.max(2, h), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
    });
    if (this.renderer.capabilities.isWebGL2 && !this.lowPower) this.mirrorRT.samples = 4;
    this.mirrorRTSize = { w, h };

    if (!this.mirrorScene) {
      this.mirrorScene = new THREE.Scene();
      this.mirrorQuadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      // depthTest off: the main scene has already written depth into this
      // region of the canvas and would otherwise reject the quad.
      this.mirrorQuadMat = new THREE.MeshBasicMaterial({
        map: this.mirrorRT.texture, depthTest: false, depthWrite: false,
      });
      this.mirrorSize = { value: new THREE.Vector2(w, h) };
      this.mirrorQuadMat.onBeforeCompile = shader => {
        shader.uniforms.mirrorSize = this.mirrorSize;
        shader.fragmentShader = 'uniform vec2 mirrorSize;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
          vec2 q = abs(vUv - 0.5) * mirrorSize - (mirrorSize * 0.5 - vec2(8.0));
          if (length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) > 8.0) discard;`);
      };
      this.mirrorQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mirrorQuadMat);
      this.mirrorScene.add(this.mirrorQuad);
    } else {
      this.mirrorQuadMat.map = this.mirrorRT.texture;
      this.mirrorQuadMat.needsUpdate = true;
    }
    // Horizontal flip - this is what makes it read as a mirror.
    const t = this.mirrorRT.texture;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = -1;
    t.offset.x = 1;
  }

  _renderMirror() {
    const wrap = document.getElementById(this._mirrorWrapId || 'r3d-mirror-wrap');
    if (!wrap || !this.scene || !this.mirrorCam || !this.renderer) return;
    const rect = wrap.getBoundingClientRect();
    const cr   = this.canvas.getBoundingClientRect();
    const mw = wrap.clientWidth;
    const mh = wrap.clientHeight;
    if (mw < 2 || mh < 2) return;

    // Mirror readability must not inherit the reduced full-screen pixel budget.
    // Supersample this small surface, then filter down into its CSS rectangle.
    const mirrorRatio = this.lowPower ? 1.5 : Math.max(1.5, Math.min(2, window.devicePixelRatio || 1));
    const rtW = Math.max(2, Math.round(mw * mirrorRatio));
    const rtH = Math.max(2, Math.round(mh * mirrorRatio));
    if (!this.mirrorRT || this.mirrorRTSize.w !== rtW || this.mirrorRTSize.h !== rtH) {
      this._initMirrorTarget(rtW, rtH);
    }

    const r = this.renderer;
    const sz = new THREE.Vector2();
    r.getSize(sz);
    this.mirrorSize.value.set(mw, mh);

    // Pass 1 - rear view into the offscreen target, unflipped.
    // The mirror is a wide letterbox. Driving it with a fixed VERTICAL fov
    // meant the horizontal fov ballooned with the aspect ratio (~154° at
    // 620x104) and everything looked fisheyed. Derive the vertical fov from a
    // fixed HORIZONTAL fov instead, so the view stays natural at any size.
    const aspect = mw / mh;
    const hFov   = R3D.MIRROR_HFOV * Math.PI / 180;
    const vFov   = 2 * Math.atan(Math.tan(hFov / 2) / aspect);
    this.mirrorCam.aspect = aspect;
    this.mirrorCam.fov    = vFov * 180 / Math.PI;
    this.mirrorCam.updateProjectionMatrix();
    r.setRenderTarget(this.mirrorRT);
    // setRenderTarget already sets a physical-pixel viewport. setViewport()
    // in r134 multiplies by DPR again, cropping/distorting a retina mirror.
    // The virtual mirror eye is ahead of the player to frame close followers.
    // In a bumper train it can sit INSIDE the leader. Exclude forward cars in
    // this pass only; retain rear traffic and cars overlapping alongside us.
    const mirrorHidden = this.cars.filter(c => c === this.player ||
      c.z - this.player.z > R3D.CAR_SEP_Z / 2).map(c => [c.mesh, c.mesh.visible]);
    const shadowAutoUpdate = r.shadowMap.autoUpdate;
    try {
      for (const [mesh] of mirrorHidden) mesh.visible = false;
      r.shadowMap.autoUpdate = false;
      r.clear(true, true, true);
      r.render(this.scene, this.mirrorCam);
    } finally {
      for (const [mesh, visible] of mirrorHidden) mesh.visible = visible;
      r.shadowMap.autoUpdate = shadowAutoUpdate;
      r.setRenderTarget(null);
    }

    // Pass 2 - blit it into the mirror rectangle with mirrored UVs.
    const scaleX = sz.x / cr.width, scaleY = sz.y / cr.height;
    const mx  = Math.round((rect.left + wrap.clientLeft - cr.left) * scaleX);
    const my  = Math.round((rect.top + wrap.clientTop - cr.top) * scaleY);
    const vw = Math.round(mw * scaleX), vh = Math.round(mh * scaleY);
    const glY = Math.round(sz.y - my - vh);
    r.setScissorTest(true);
    r.setScissor(mx, glY, vw, vh);
    r.setViewport(mx, glY, vw, vh);
    r.render(this.mirrorScene, this.mirrorQuadCam);
    r.setScissorTest(false);
    r.setViewport(0, 0, sz.x, sz.y);
  }

  // ── HUD ──────────────────────────────────────────────────────
  _updateHUD(dt) {
    const health=Math.ceil(this.player.raceHealth ?? 100), bar=document.getElementById('r3d-health');
    if(bar){bar.classList.toggle('low',health<=25);bar.setAttribute('aria-valuenow',health);document.getElementById('r3d-health-value').textContent=health+'%';document.getElementById('r3d-health-fill').style.transform=`scaleX(${health/100})`;}
    if (this.player2) { this._updateDualHUD(dt); return; }
    const p = this.player;

    // Cars that have already taken the flag are still ahead of you. Excluding
    // them made your displayed position climb as the leaders finished, so you
    // could be shown P1 while running last.
    const active = this.cars.filter(c => !c.dnf);
    const ahead  = active.filter(c => c !== p && (c.finished || c.z > p.z)).length;
    const pos    = ahead + 1;
    const total  = active.length;

    const posEl = document.getElementById('r3d-pos');
    if (posEl) posEl.textContent = pos;
    const ofEl = document.getElementById('r3d-pos-of');
    if (ofEl) ofEl.textContent = '/ ' + total;

    // Speed
    const mph = Math.round(p.speed * 0.78 + 33 * (this.speedScale ?? 1));
    const spdEl = document.getElementById('r3d-speed');
    if (spdEl) spdEl.textContent = mph;

    // Draft label + meter
    const momentum = p.draftMomentum || 0;
    const isPush = p.pushStrength > 0.35;
    const frac = clamp(momentum / R3D.AERO_MAX, 0, 1);
    const draftEl = document.getElementById('r3d-draft');
    const fillEl  = document.getElementById('r3d-draft-fill');
    if (draftEl) {
      const on = frac > 0.04;
      draftEl.textContent = 'Draft';
      draftEl.style.color = !on ? 'var(--text-mute)' : isPush ? 'var(--warn)' : 'var(--accent)';
    }
    if (fillEl) {
      fillEl.style.transform = `scaleX(${(Math.round(frac * 100) / 100).toFixed(2)})`;
      fillEl.style.background = isPush ? 'var(--warn)' : 'var(--accent)';
    }

    // Progress
    const prog = document.getElementById('r3d-prog-fill');
    if (prog) prog.style.transform = `scaleX(${clamp(p.z / (this.raceLength || R3D.TRACK_LEN), 0, 1).toFixed(3)})`;

    const practiceTip = document.getElementById('r3d-practice-tip');
    if (practiceTip) {
      const fraction = p.z / (this.raceLength || R3D.TRACK_LEN);
      const tip = fraction < 0.25
        ? 'A and D steer. S brakes. The car accelerates automatically.'
        : fraction < 0.55
          ? 'Follow a car to build Draft. Pull out when you have a run.'
          : fraction < 0.82
            ? 'Check the rear-view mirror before changing lanes. Position and speed are on the HUD.'
            : 'The finish is close. Hold your line and watch the cars around you.';
      if (practiceTip.textContent !== tip) practiceTip.textContent = tip;
    }

    // Minimap (throttled ~20fps)
    this._mapAcc += dt;
    if (this._mapAcc >= 0.05) {
      this._mapAcc = 0;
      const hw = this.trackHalfWidth ?? R3D.HALF_W;
      for (const car of this.cars) {
        if (!car._dot) continue;
        if (car.dnf) { car._dot.style.opacity = '0.25'; }
        const topPct  = clamp(100 - (car.z / (this.raceLength || R3D.TRACK_LEN)) * 100, 0, 100);
        // The forward-facing camera looks along +Z, so world +X is screen-left.
        const leftPct = clamp(50 - (car.x / hw) * 42, 4, 96);
        car._dot.style.top  = topPct + '%';
        car._dot.style.left = leftPct + '%';
      }
    }

    // Running-order tower (throttled ~5fps)
    this._orderAcc += dt;
    if (this._orderAcc >= 0.18) {
      this._orderAcc = 0;
      this._updateOrder(pos, total);
    }
  }

  _updateOrder(playerPos, total) {
    const el = document.getElementById('r3d-order');
    if (!el) return;
    // Sort: finished first (in finish order), then by z desc
    const ranked = this.cars.filter(c => !c.dnf).slice().sort((a, b) => {
      if (a.finished && b.finished) return this.finishOrder.indexOf(a) - this.finishOrder.indexOf(b);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.z - a.z;
    });
    // Window of 7 rows centered on the player
    const pIdx = ranked.indexOf(this.player);
    let start = clamp(pIdx - 3, 0, Math.max(0, ranked.length - 7));
    const rows = ranked.slice(start, start + 7).map((c, k) => {
      const place = start + k + 1;
      const nm = (c.label || '').split(' / ').pop();
      const cls = c.isPlayer ? ' is-player' : c.isTeammate ? ' is-teammate' : '';
      return `<div class="r3d-order-row${cls}">
        <span class="r3d-order-pos">${place}</span>
        <span class="r3d-order-chip" style="background:${r3dHex(c.hex)}"></span>
        <span class="r3d-order-num">#${c.number}</span>
        <span class="r3d-order-name">${nm}</span>
      </div>`;
    }).join('');
    el.innerHTML = `<div class="r3d-order-head">Leaderboard</div>${rows}`;
  }

  _warn(msg) {
    const el = document.getElementById('r3d-warn');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._warnTimeout);
    this._warnTimeout = setTimeout(() => { if (el) el.classList.add('hidden'); }, 3200);
  }

  _showFinish(pos) {
    const el = document.getElementById('r3d-finish');
    if (!el) return;
    const msg = this.config.practiceTips ? 'Practice Complete'
      : pos === 1 ? 'Victory Lane' : pos <= 3 ? 'Podium Finish' : `P${pos} Finish`;
    el.innerHTML = `
      <div class="r3d-finish-box">
        <div class="r3d-finish-pos">${pos}${ordinal(pos)} Place</div>
        <div class="r3d-finish-msg">${msg}</div>
        <button class="btn btn-primary btn-lg" onclick="window._r3dFinish(${pos})">${this.config.qualifyAI ? 'Next' : 'Continue'}</button>
      </div>`;
    el.style.display = 'flex';
  }

  _updateDualHUD(dt) {
    this._dualHUDAcc = (this._dualHUDAcc || 0) + dt;
    if (this._dualHUDAcc < 0.10) return;
    this._dualHUDAcc = 0;
    const ranked = this.cars.filter(c=>!c.dnf).slice().sort((a,b)=>{
      if(a.finished && b.finished) return this.finishOrder.indexOf(a)-this.finishOrder.indexOf(b);
      if(a.finished) return -1; if(b.finished) return 1; return b.z-a.z;
    });
    [this.player,this.player2].forEach((p,i)=>{
      const n=i+1, pos=ranked.indexOf(p)+1;
      const health=document.getElementById(`dual-health-${n}`);if(health)health.textContent=`Vehicle health ${Math.ceil(p.raceHealth ?? 100)}%`;
      document.getElementById(`dual-pos-${n}`).textContent = p.finished ? `Finished P${pos}` : `P${pos} / ${this.cars.length}`;
      document.getElementById(`dual-speed-${n}`).textContent = Math.round(p.speed*.78+33*(this.speedScale ?? 1));
      document.getElementById(`dual-draft-${n}`).textContent = Math.round(clamp((p.draftMomentum || 0)/R3D.AERO_MAX,0,1)*100);
      document.getElementById(`dual-progress-${n}`).style.transform = `scaleX(${clamp(p.z/this.raceLength,0,1)})`;
      const start=clamp(pos-3,0,Math.max(0,ranked.length-5));
      const el=document.getElementById(`dual-order-${n}`);
      document.getElementById(`dual-progress-${n}`).style.background = r3dHex(p.hex);
      if (!el) return;
      const html='<div class="r3d-order-head">Leaderboard</div>'+ranked.slice(start,start+5).map((c,k)=>`<div class="r3d-order-row${c===p ? ' is-player' : ''}"><span class="r3d-order-pos">${start+k+1}</span><span class="r3d-order-chip" style="background:${r3dHex(c.hex)}"></span><span class="r3d-order-num">#${c.number}</span><span class="r3d-order-name">${c.label}</span></div>`).join('');
      if(el.innerHTML!==html) el.innerHTML=html;
    });
  }

  _renderDual(dt) {
    const r=this.renderer, size=r.getSize(new THREE.Vector2());
    r.setScissorTest(false); r.setViewport(0,0,size.x,size.y); r.autoClear=false; r.clear();
    const renderView = (n) => {
      const pane=document.getElementById(`dual-view-${n}`).getBoundingClientRect(), cr=this.canvas.getBoundingClientRect();
      const x=Math.round((pane.left-cr.left)*size.x/cr.width), y=Math.round((cr.bottom-pane.bottom)*size.y/cr.height);
      const w=Math.round(pane.width*size.x/cr.width), h=Math.round(pane.height*size.y/cr.height);
      this.camera.aspect=w/h; this.camera.updateProjectionMatrix();
      this._updateCamera(dt);
      r.setScissorTest(true); r.setScissor(x,y,w,h); r.setViewport(x,y,w,h); r.clear(); r.render(this.scene,this.camera);
      r.setScissorTest(false);
      this._mirrorWrapId=`dual-mirror-${n}`;
      this._renderMirror();
      this._mirrorWrapId=null;
    };
    renderView(1);
    this._withSecond(()=>renderView(2));
    r.setScissorTest(false); r.setViewport(0,0,size.x,size.y); r.autoClear=true;
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.1);
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
      const shared = new Set(_r3dRoundelCache.values()); // reused across races - keep
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
