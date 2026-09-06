// ============================================================
// STOCK CAR EMPIRE — 3D Race Engine (Three.js r134)
// Straight-line superspeedway drafting sprint.
// Controls: A = steer left, D = steer right, S = brake (auto-throttle)
// ============================================================

const R3D = {
  // ── Track / world ──────────────────────────────────────────
  TRACK_LEN:      15000,  // long superspeedway — ~90 sec sprint
  TRACK_W:        22,
  HALF_W:         11,
  WHEEL_R:        0.40,

  // ── Gameplay speed model (TUNED — preserved feel) ──────────
  SPEED_BASE:     175,    // units/sec nominal forward speed
  SPEED_MAX:      268,    // absolute max
  ACCEL:          1.6,    // forward accel lerp
  BRAKE_FORCE:    140,    // speed loss when braking (units/sec²)

  // ── Steering ───────────────────────────────────────────────
  LAT_ACC:        80,     // lateral acceleration (units/sec²)
  LAT_MAX:        13,     // max lateral speed (units/sec)
  LAT_DAMP:       0.0005, // damping when key released
  STEER_FALLOFF:  0.35,   // how much steering authority is lost at top speed (0..1)

  // ── Drafting (TUNED — preserved feel) ──────────────────────
  DRAFT_Z:        92,     // draft cone depth — long tow behind each car
  DRAFT_X:        4.6,    // draft cone width
  DRAFT_BOOST:    38,     // max speed bonus at bumper — the tow really pulls
  DRAFT_SLING:    13,     // momentum decay/sec
  DRAFT_CURVE:    0.72,   // <1 = the tow bites from further back
  PUSH_Z:         5.2,    // bumper-to-bumper push distance
  PUSH_X:         1.8,    // lateral tolerance for locked push
  PUSH_BONUS:     11,     // shove you give the car you are hard against
  CHAIN_PER_CAR:  5,      // extra speed per car in a draft chain
  CHAIN_CURVE:    0.14,   // each extra car is worth MORE than the last
  CHAIN_MAX:      34,     // ceiling on chain bonus so a long train can't run away
  PACK_CATCHUP:   22,     // max catch-up speed for cars stranded behind the pack
  PACK_GAP:       190,    // distance behind the leader where catch-up is full
  TEAM_HELP_Z:    60,     // range at which a teammate starts working with you
  TEAM_PUSH_BONUS: 4,     // extra shove when you and a teammate are locked up
  MIRROR_HFOV:    88,     // mirror HORIZONTAL field of view, degrees

  // ── AI / race director ─────────────────────────────────────
  // Aggression ramps smoothly from CALM_FRAC to ENDGAME_FRAC: early laps are
  // a settled pack, the closing stage is a full-attack scramble.
  CALM_FRAC:      0.45,   // fully calm before this point
  ENDGAME_FRAC:   0.75,   // fully aggressive from here to the flag
  RUBBER_BAND:    10,     // max extra speed for last-place player
  WRECK_FIRST:    50,
  WRECK_MIN:      65,
  WRECK_MAX:      120,
  MAX_WRECKS:     2,
  SPIN_CHANCE:    0.003,
  BUMP_DEBOUNCE:  0.9,

  // ── AI lateral model ───────────────────────────────────────
  // Cars steer by accelerating a lateral velocity, never by snapping position.
  AI_LAT_ACC:     5.0,    // lateral acceleration (units/sec²) — low = smooth arcs
  AI_LAT_MAX:     2.6,    // top lateral speed (units/sec)
  AI_LAT_DAMP:    0.02,   // velocity damping base (per second)
  AI_STEER_GAIN:  0.9,    // desired lateral speed per unit of error
  LANE_STEP:      2.4,    // spacing of candidate lanes
  LANE_WIDTH:     2.6,    // how wide a "lane" is when scoring traffic
  LANE_COMMIT:    3.2,    // seconds a car holds a line before reconsidering
  LANE_GAIN_MIN:  0.14,   // a lane must beat the current one by this to move
  LANE_INERTIA:   0.13,
  TOW_APPEAL:     2.1,    // how strongly the AI wants to be in a draft train
  STUCK_Z:        34,     // being this close behind a slower car counts as bottled up
  STUCK_PENALTY:  1.6,    // how badly a driver wants out of that
  TACTIC_COMMIT:  2.6,    // seconds a driver sticks with a tow/block decision
  BLOCK_Z:        20,     // how close behind before a driver starts defending
  BLOCK_MAX:      1.6,    // furthest a defender will shade across — no chopping

  // ── Physical separation ────────────────────────────────────
  // Contact is resolved with impulses and gentle correction, not teleports.
  SEP_Z_RATE:     34,     // max z correction per second (units/sec)
  SEP_X_RATE:     6,      // max x correction per second (units/sec)
  CONTACT_IMPULSE: 0.9,   // lateral velocity change from a rub (units/sec)
  CAR_SEP_X:      2.15,
  CAR_SEP_Z:      4.6,
  GRID_SPACING:   28,
  PACE_SPEED:     65,
};

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

// Painted door/roof number roundel — white disc, dark number (reads on any livery).
// Cached per number so a 30-car field doesn't allocate 30 identical canvases.
const _r3dRoundelCache = new Map();
function r3dRoundelTex(num) {
  if (_r3dRoundelCache.has(num)) return _r3dRoundelCache.get(num);
  const tex = r3dTex(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath(); ctx.arc(64, 64, 54, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#15151a'; ctx.stroke();
    ctx.fillStyle = '#15151a';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(num), 64, 70);
  });
  _r3dRoundelCache.set(num, tex);
  return tex;
}

// Asphalt — flat dark base with aggregate speckle
function r3dAsphaltTex() {
  return r3dTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2c2c31'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2800; i++) {
      const light = Math.random() < 0.5;
      ctx.fillStyle = light ? 'rgba(80,80,86,0.5)' : 'rgba(18,18,20,0.5)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(0, 96, w, 3); // faint seam
  });
}

// Grass — flat green with subtle mow banding
function r3dGrassTex() {
  return r3dTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#37833f'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 4);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(20,60,24,0.5)' : 'rgba(70,140,76,0.5)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
  });
}

// Grandstand crowd — dark base, scattered bright clothing dots
function r3dCrowdTex() {
  return r3dTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#1d1d22'; ctx.fillRect(0, 0, w, h);
    const cols = ['#d9d2c5', '#b54b4b', '#3f6fb0', '#4c9a52', '#d8b34a', '#cfcfd4', '#7a4ea0', '#c98a3a'];
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle = cols[(Math.random() * cols.length) | 0];
      ctx.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 2, 2);
    }
  });
}

// Catchfence — transparent grid
function r3dFenceTex() {
  return r3dTex(64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(190,190,200,0.45)'; ctx.lineWidth = 1;
    for (let i = 0; i <= w; i += 6) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
    for (let i = 0; i <= h; i += 6) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
  });
}

// Sponsor wall boards — alternating flat color blocks with faux logos.
// Dimensions must be powers of two: a NPOT texture with RepeatWrapping loses
// mipmaps/tiling and renders as a smeared mess.
function r3dWallAdTex() {
  return r3dTex(256, 64, (ctx, w, h) => {
    const cols = ['#e4002b', '#1f6fc0', '#2f9a52', '#e0a800', '#6a4ea0', '#cfcfd4'];
    const seg = 64;
    for (let x = 0, i = 0; x < w; x += seg, i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(x + 2, 4, seg - 4, h - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const letters = 'ABCDEFGHJKLMNPRSTVXZ';
      let tag = '';
      for (let k = 0; k < 3; k++) tag += letters[(Math.random() * letters.length) | 0];
      ctx.fillText(tag, x + seg / 2, h / 2);
    }
  });
}

// Start/finish gantry banner
function r3dBannerTex() {
  return r3dTex(512, 64, (ctx, w, h) => {
    ctx.fillStyle = '#15151a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e4002b'; ctx.fillRect(0, 0, w, 5); ctx.fillRect(0, h - 5, w, 5);
    ctx.fillStyle = '#ececef';
    ctx.font = 'bold 34px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('START  /  FINISH', w / 2, h / 2 + 2);
  });
}

// ─── Public launcher ─────────────────────────────────────────
function launch3DRace(config, onComplete) {
  const container = document.getElementById('race-3d-container');
  if (!container) { console.error('race-3d-container not found'); return; }

  if (window._r3d) { try { window._r3d.destroy(); } catch (_) {} window._r3d = null; }

  container.innerHTML = `
    <canvas id="r3d-canvas" style="display:block;width:100%;height:100%"></canvas>
    <div id="r3d-hud">
      <button class="r3d-pause-btn" id="r3d-pause-btn" title="Pause (Esc)">PAUSE</button>

      <div id="r3d-mirror-wrap"><div class="r3d-mirror-label">REAR VIEW</div></div>

      <div class="r3d-order" id="r3d-order"></div>

      <div class="r3d-map" id="r3d-map">
        <div class="r3d-map-head">FIELD</div>
        <div class="r3d-map-track" id="r3d-map-track">
          <div class="r3d-map-finish"></div>
        </div>
      </div>

      <div class="r3d-telemetry">
        <div class="r3d-tele-pos">
          <span class="r3d-tele-pos-num" id="r3d-pos">1</span>
          <span class="r3d-tele-pos-of" id="r3d-pos-of">/ 20</span>
        </div>
        <div class="r3d-tele-speed">
          <span id="r3d-speed">0</span><span class="r3d-tele-unit">MPH</span>
        </div>
        <div class="r3d-draft">
          <div class="r3d-draft-label" id="r3d-draft">DRAFT</div>
          <div class="r3d-draft-meter"><div class="r3d-draft-fill" id="r3d-draft-fill"></div></div>
        </div>
      </div>

      <div class="r3d-progress-wrap">
        <div class="r3d-progress-fill" id="r3d-prog-fill"></div>
        <div class="r3d-progress-label">FINISH</div>
      </div>

      <div class="r3d-warning hidden" id="r3d-warn"></div>
      <div class="r3d-countdown" id="r3d-countdown"></div>
      <div class="r3d-finish" id="r3d-finish" style="display:none"></div>

      <div id="r3d-pause-overlay">
        <div class="r3d-pause-panel">
          <div class="r3d-pause-title">PAUSED</div>
          <button class="r3d-pause-resume" id="r3d-pause-resume">RESUME</button>
        </div>
      </div>
    </div>
    <div class="r3d-controls-hint" id="r3d-hint">
      <span>A</span> Steer Left &nbsp;|&nbsp; <span>D</span> Steer Right &nbsp;|&nbsp; <span>S</span> Brake
    </div>
  `;

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
    // results table reflects what actually happened — team-mates included.
    let order = [];
    if (window._r3d) {
      try { order = window._r3d.finalOrder(); } catch (_) {}
      try { window._r3d.destroy(); } catch (_) {}
      window._r3d = null;
    }
    onComplete(pos, order);
  };
}

// ─── Race Engine ──────────────────────────────────────────────
class Race3DEngine {
  constructor(canvas, config, onComplete) {
    this.canvas       = canvas;
    this.config       = config;
    this.onComplete   = onComplete;
    this.keys         = { a: false, d: false, s: false };
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
    this._dummy       = new THREE.Object3D();
    // Difficulty scales AI pace and aggression, and how much the draft gives you
    this.diff = (typeof difficultyById === 'function')
      ? difficultyById(config.difficulty || DEFAULT_DIFFICULTY)
      : { aiSpeed: 1, aiPower: 1, aiAggro: 1, playerDraft: 1 };

    this._init();
  }

  // ── Scene setup ──────────────────────────────────────────────
  _init() {
    const c = this.canvas;
    const w = c.width  || window.innerWidth;
    const h = c.height || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7fb2dd);
    this.scene.fog = new THREE.FogExp2(0xb7d4e8, 0.00085);

    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.5, 4000);
    this.camera.position.set(0, 5, -12);

    // Far plane matches the main camera so the track doesn't visibly end
    // partway down the mirror.
    this.mirrorCam = new THREE.PerspectiveCamera(72, 3.5, 0.5, 4000);
    this.mirrorCam.position.set(0, 4, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
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
    // instead of shimmering — most visible in the mirror.
    this._maxAniso = this.renderer.capabilities?.getMaxAnisotropy?.() || 4;

    this._initGeometries();
    this._buildTrack();
    this._buildEnvironment();
    this._buildCars();
    this._buildMinimap();

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
      if (k === 'a') this.keys.a = true;
      if (k === 'd') this.keys.d = true;
      if (k === 's') this.keys.s = true;
      if (e.key === 'Escape') this._togglePause();
    };
    this._ku = e => {
      const k = e.key.toLowerCase();
      if (k === 'a') this.keys.a = false;
      if (k === 'd') this.keys.d = false;
      if (k === 's') this.keys.s = false;
    };
    document.addEventListener('keydown', this._kd);
    document.addEventListener('keyup',   this._ku);

    const pauseBtn  = document.getElementById('r3d-pause-btn');
    const resumeBtn = document.getElementById('r3d-pause-resume');
    if (pauseBtn)  pauseBtn.addEventListener('click',  () => this._togglePause());
    if (resumeBtn) resumeBtn.addEventListener('click', () => this._togglePause());

    this._onResize = () => {
      const el = this.canvas.parentElement;
      if (!el) return;
      const nw = el.clientWidth  || window.innerWidth;
      const nh = el.clientHeight || window.innerHeight;
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
    const tire = new THREE.CylinderGeometry(R3D.WHEEL_R, R3D.WHEEL_R, 0.34, 18);
    tire.rotateZ(Math.PI / 2);   // axle along local X → roll about X
    const rim  = new THREE.CylinderGeometry(0.22, 0.22, 0.36, 14);
    rim.rotateZ(Math.PI / 2);
    const hub  = new THREE.CylinderGeometry(0.07, 0.07, 0.38, 8);
    hub.rotateZ(Math.PI / 2);
    this.G = {
      tire, rim, hub,
      lowerBody: new THREE.BoxGeometry(2.16, 0.5, 4.0),
      hood:      new THREE.BoxGeometry(2.0, 0.26, 1.7),
      nose:      new THREE.BoxGeometry(1.74, 0.34, 0.9),
      tail:      new THREE.BoxGeometry(2.0, 0.30, 0.9),
      cabin:     new THREE.BoxGeometry(1.78, 0.5, 1.95),
      roof:      new THREE.BoxGeometry(1.62, 0.16, 1.7),
      airdam:    new THREE.BoxGeometry(2.2, 0.16, 0.42),
      splitter:  new THREE.BoxGeometry(2.34, 0.06, 0.5),
      wing:      new THREE.BoxGeometry(2.24, 0.08, 0.5),
      wingEnd:   new THREE.BoxGeometry(0.08, 0.4, 0.5),
      strut:     new THREE.BoxGeometry(0.12, 0.42, 0.12),
      mirror:    new THREE.BoxGeometry(0.14, 0.14, 0.3),
      glass:     new THREE.BoxGeometry(1.6, 0.42, 0.1),
      sideglass: new THREE.BoxGeometry(0.08, 0.34, 1.4),
      decalDoor: new THREE.PlaneGeometry(1.0, 1.0),
      decalRoof: new THREE.PlaneGeometry(1.2, 1.2),
      lamp:      new THREE.PlaneGeometry(0.5, 0.28),
    };
    this.M = {
      tire:  new THREE.MeshLambertMaterial({ color: 0x141416 }),
      rim:   new THREE.MeshLambertMaterial({ color: 0xb9bcc4 }),
      hub:   new THREE.MeshLambertMaterial({ color: 0x6a6d75 }),
      trim:  new THREE.MeshLambertMaterial({ color: 0x101012 }),
      glass: new THREE.MeshLambertMaterial({ color: 0x223044, transparent: true, opacity: 0.66 }),
      head:  new THREE.MeshBasicMaterial({ color: 0xfff2c8 }),
      tail:  new THREE.MeshBasicMaterial({ color: 0xd11a1a }),
    };
  }

  // ── Track ────────────────────────────────────────────────────
  _buildTrack() {
    const s  = this.scene;
    const TL = R3D.TRACK_LEN;
    const TW = R3D.TRACK_W;
    const d  = this._dummy;

    // Asphalt (textured). DoubleSide so the flipped mirror projection doesn't cull it.
    const aTex = r3dAsphaltTex();
    aTex.wrapS = aTex.wrapT = THREE.RepeatWrapping;
    aTex.repeat.set(3, TL / 26);
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(TW, TL + 80),
      new THREE.MeshLambertMaterial({ map: aTex, color: 0xbbbbbb, side: THREE.DoubleSide })
    );
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.set(0, 0, TL / 2);
    asphalt.receiveShadow = true;
    s.add(asphalt);

    // Grass aprons (textured)
    const gTex = r3dGrassTex();
    gTex.wrapS = gTex.wrapT = THREE.RepeatWrapping;
    gTex.repeat.set(40, TL / 20);
    const grassMat = new THREE.MeshLambertMaterial({ map: gTex, color: 0xcccccc, side: THREE.DoubleSide });
    [-1, 1].forEach(side => {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(600, TL + 200), grassMat);
      g.rotation.x = -Math.PI / 2;
      g.position.set(side * (TW / 2 + 300), -0.02, TL / 2);
      g.receiveShadow = true;
      s.add(g);
    });

    // Lane dashes (InstancedMesh, 1 draw call)
    const DASH_STEP = 24;
    const DASH_COUNT = Math.floor(TL / DASH_STEP);
    const dashMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.24, 0.02, 6),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
      2 * DASH_COUNT
    );
    let di = 0;
    [-TW / 6, TW / 6].forEach(lx => {
      for (let z = 12; z < TL - 12; z += DASH_STEP) {
        d.position.set(lx, 0.015, z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1);
        d.updateMatrix(); dashMesh.setMatrixAt(di++, d.matrix);
      }
    });
    dashMesh.count = di;
    dashMesh.instanceMatrix.needsUpdate = true;
    s.add(dashMesh);

    // Solid edge lines + colored rumble strips
    const edgeMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
    [-(TW / 2 - 0.4), TW / 2 - 0.4].forEach(lx => {
      const el = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, TL), edgeMat);
      el.position.set(lx, 0.014, TL / 2); s.add(el);
    });
    const RUMBLE_STEP = 6;
    const RUMBLE_COUNT = Math.floor(TL / RUMBLE_STEP);
    [-(TW / 2 + 0.45), TW / 2 + 0.45].forEach(rx => {
      const redM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.05, RUMBLE_STEP - 0.4),
        new THREE.MeshLambertMaterial({ color: 0xd0202a }), Math.ceil(RUMBLE_COUNT / 2));
      const whM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.05, RUMBLE_STEP - 0.4),
        new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }), Math.ceil(RUMBLE_COUNT / 2));
      let ri = 0, wi = 0;
      for (let si = 0; si < RUMBLE_COUNT; si++) {
        d.position.set(rx, 0.025, si * RUMBLE_STEP + 3); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1);
        d.updateMatrix();
        if (si % 2 === 0) redM.setMatrixAt(ri++, d.matrix); else whM.setMatrixAt(wi++, d.matrix);
      }
      redM.count = ri; whM.count = wi;
      redM.instanceMatrix.needsUpdate = true; whM.instanceMatrix.needsUpdate = true;
      s.add(redM); s.add(whM);
    });

    // SAFER walls + sponsor boards + catchfence
    const adTex = r3dWallAdTex();
    adTex.wrapS = adTex.wrapT = THREE.RepeatWrapping;
    adTex.repeat.set(TL / 24, 1);
    const fenceTex = r3dFenceTex();
    fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;
    fenceTex.repeat.set(TL / 4, 2.5);

    [-1, 1].forEach(side => {
      const bx = side * (TW / 2 + 0.9);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.15, TL + 20),
        new THREE.MeshLambertMaterial({ color: 0xe7e7ea }));
      wall.position.set(bx, 0.58, TL / 2); wall.receiveShadow = true; s.add(wall);

      // Sponsor board face (just inside wall, toward track)
      const ad = new THREE.Mesh(new THREE.PlaneGeometry(TL, 0.85),
        new THREE.MeshLambertMaterial({ map: adTex, side: THREE.DoubleSide }));
      ad.position.set(bx - side * 0.72, 0.62, TL / 2);
      ad.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      s.add(ad);

      // Catchfence
      const fence = new THREE.Mesh(new THREE.PlaneGeometry(TL, 5.2),
        new THREE.MeshBasicMaterial({ map: fenceTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      fence.position.set(bx - side * 0.72, 3.6, TL / 2);
      fence.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      s.add(fence);
    });

    // Start/finish checkerboard
    const COLS = 14, CW = TW / COLS, ROWS = 2;
    const checkW = new THREE.InstancedMesh(new THREE.BoxGeometry(CW - 0.04, 0.03, 2.8),
      new THREE.MeshLambertMaterial({ color: 0xffffff }), COLS * ROWS);
    const checkB = new THREE.InstancedMesh(new THREE.BoxGeometry(CW - 0.04, 0.03, 2.8),
      new THREE.MeshLambertMaterial({ color: 0x121212 }), COLS * ROWS);
    let wIdx = 0, bIdx = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        d.position.set(-TW / 2 + CW / 2 + col * CW, 0.02, TL - 4.2 + row * 2.8);
        d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
        if ((col + row) % 2 === 0) checkW.setMatrixAt(wIdx++, d.matrix);
        else                       checkB.setMatrixAt(bIdx++, d.matrix);
      }
    }
    checkW.count = wIdx; checkB.count = bIdx;
    checkW.instanceMatrix.needsUpdate = true; checkB.instanceMatrix.needsUpdate = true;
    s.add(checkW); s.add(checkB);

    // Finish gantry with banner
    const postMat = new THREE.MeshLambertMaterial({ color: 0xcfcfd4 });
    [-(TW / 2 + 2), TW / 2 + 2].forEach(px => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 13, 0.6), postMat);
      post.position.set(px, 6.5, TL - 2.8); s.add(post);
    });
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(TW + 6, 0.6, 0.6), postMat);
    gantry.position.set(0, 12.6, TL - 2.8); s.add(gantry);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(TW + 4, 2.4, 0.25),
      new THREE.MeshLambertMaterial({ map: r3dBannerTex() }));
    banner.position.set(0, 10.8, TL - 2.95); s.add(banner);

    // Starting grid markers
    const GRID_ROWS = 16;
    const gridMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(TW, 0.02, 0.45),
      new THREE.MeshLambertMaterial({ color: 0xf0c020 }), GRID_ROWS);
    for (let r = 0; r < GRID_ROWS; r++) {
      d.position.set(0, 0.016, r * R3D.GRID_SPACING + 0.25);
      d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
      gridMesh.setMatrixAt(r, d.matrix);
    }
    gridMesh.instanceMatrix.needsUpdate = true;
    s.add(gridMesh);
  }

  // ── Environment ──────────────────────────────────────────────
  _buildEnvironment() {
    const s  = this.scene;
    const TL = R3D.TRACK_LEN;
    const TW = R3D.TRACK_W;
    const d  = this._dummy;

    // Grandstands (one long textured structure per side, set behind the apron)
    const crowdTex = r3dCrowdTex();
    crowdTex.wrapS = crowdTex.wrapT = THREE.RepeatWrapping;
    crowdTex.repeat.set(TL / 14, 3);
    const standLen = TL * 0.82;
    [-1, 1].forEach(side => {
      const sx = side * (TW / 2 + 52);
      const faceIdx = side > 0 ? 1 : 0; // -X face for right stand, +X for left
      const mats = [];
      for (let i = 0; i < 6; i++) {
        mats.push(i === faceIdx
          ? new THREE.MeshLambertMaterial({ map: crowdTex })
          : new THREE.MeshLambertMaterial({ color: 0x9a9aa2 }));
      }
      const stand = new THREE.Mesh(new THREE.BoxGeometry(10, 13, standLen), mats);
      stand.position.set(sx, 6.5, TL / 2);
      s.add(stand);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(14, 1, standLen),
        new THREE.MeshLambertMaterial({ color: 0x33343c }));
      roof.position.set(sx - side * 1.5, 13.4, TL / 2);
      s.add(roof);
    });

    // Distant treeline ridge for depth (flat, far, behind stands)
    const ridgeMat = new THREE.MeshLambertMaterial({ color: 0x2f5a36 });
    [-1, 1].forEach(side => {
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(18, 26, TL + 400), ridgeMat);
      ridge.position.set(side * (TW / 2 + 230), 8, TL / 2);
      s.add(ridge);
    });

    // Light poles (instanced)
    const POLE_STEP = 200;
    const POLE_COUNT = Math.floor(TL / POLE_STEP);
    const poleMesh  = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 24, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x80828a }), POLE_COUNT * 2);
    const lightMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(7, 0.7, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xfffce0 }), POLE_COUNT * 2);
    let pi = 0;
    for (let z = 160; z < TL - 100; z += POLE_STEP) {
      [-1, 1].forEach(sx => {
        const px = sx * (TW / 2 + 66);
        d.position.set(px, 12, z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1);
        d.updateMatrix(); poleMesh.setMatrixAt(pi, d.matrix);
        d.position.set(px - sx * 3, 24.2, z); d.updateMatrix(); lightMesh.setMatrixAt(pi, d.matrix);
        pi++;
      });
    }
    poleMesh.count = pi; lightMesh.count = pi;
    poleMesh.instanceMatrix.needsUpdate = true; lightMesh.instanceMatrix.needsUpdate = true;
    s.add(poleMesh); s.add(lightMesh);

    // Pit-wall banner strip (left side)
    const bannerColors = [0xe4002b, 0x1f6fc0, 0x2f9a52, 0xe0a800, 0x6a4ea0];
    for (let z = 80, k = 0; z < TL - 80; z += 160, k++) {
      const bm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 150),
        new THREE.MeshLambertMaterial({ color: bannerColors[k % bannerColors.length] }));
      bm.position.set(-(TW / 2 + 0.2), 1.55, z + 75);
      s.add(bm);
    }
  }

  // ── Cars ─────────────────────────────────────────────────────
  _buildCars() {
    const { config } = this;
    const fieldSize  = Math.min(config.aiEntries.length + 1, config.fieldSize);

    // Grid slots ordered POLE FIRST. +Z is the direction of travel, so row 0
    // must sit at the highest z — building them the other way round made the
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
    // biases it toward the front — take the best of N draws, one extra draw
    // per analyst on staff.
    const draws = 1 + (config.qualifyBoost || 0);
    let playerSlotIdx = Math.floor(Math.random() * slots.length);
    for (let i = 1; i < draws; i++) {
      playerSlotIdx = Math.min(playerSlotIdx, Math.floor(Math.random() * slots.length));
    }
    this._startingPos = playerSlotIdx + 1;     // now genuinely 1 = pole
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
    this.cars.push(this.player);

    let aiIdx = 0;
    for (let i = 0; i < slots.length && aiIdx < config.aiEntries.length; i++) {
      if (i === playerSlotIdx) continue;
      const entry = config.aiEntries[aiIdx++];
      const slot  = slots[i];
      this.cars.push(this._makeCar(slot.x, slot.z, {
        entrantId:  entry.entrantId || null,
        color:      entry.color,
        number:     entry.number || (aiIdx + 1),
        power:      clamp(entry.power, 0.25, 0.95),
        isPlayer:   false,
        isTeammate: !!entry.isTeammate,
        label:      entry.name,
        teamName:   entry.teamName || null,
        carId:      entry.carId || null,
      }));
    }
  }

  _makeCar(x, z, { entrantId, color, number, power, isPlayer, isTeammate, label, teamName, carId }) {
    const hex = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
    const G = this.G, M = this.M;
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color: hex });
    const darker  = (hex & 0xfefefe) >> 1; // ~50% darker for accent panels
    const accMat  = new THREE.MeshLambertMaterial({ color: darker });

    // Lower hull
    const lower = new THREE.Mesh(G.lowerBody, bodyMat);
    lower.position.set(0, 0.42, 0); lower.castShadow = true; g.add(lower);

    // Sloped nose (front, +Z) and tail (rear, -Z)
    const nose = new THREE.Mesh(G.nose, bodyMat);
    nose.position.set(0, 0.40, 2.05); nose.rotation.x = 0.18; nose.castShadow = true; g.add(nose);
    const tail = new THREE.Mesh(G.tail, bodyMat);
    tail.position.set(0, 0.44, -2.05); tail.rotation.x = -0.12; g.add(tail);

    // Hood + decklid
    const hood = new THREE.Mesh(G.hood, bodyMat);
    hood.position.set(0, 0.60, 1.05); hood.rotation.x = -0.05; g.add(hood);

    // Greenhouse / cabin + roof
    const cabin = new THREE.Mesh(G.cabin, accMat);
    cabin.position.set(0, 0.78, -0.15); cabin.castShadow = true; g.add(cabin);
    const roof = new THREE.Mesh(G.roof, bodyMat);
    roof.position.set(0, 1.05, -0.15); g.add(roof);

    // Glass: windshield, rear glass, side windows
    const ws = new THREE.Mesh(G.glass, M.glass);
    ws.position.set(0, 0.86, 0.78); ws.rotation.x = 0.5; g.add(ws);
    const rw = new THREE.Mesh(G.glass, M.glass);
    rw.position.set(0, 0.86, -1.05); rw.rotation.x = -0.5; g.add(rw);
    [-0.9, 0.9].forEach(sx => {
      const sg = new THREE.Mesh(G.sideglass, M.glass);
      sg.position.set(sx, 0.84, -0.15); g.add(sg);
    });

    // Aero: front air dam + splitter, rear wing
    const dam = new THREE.Mesh(G.airdam, M.trim);
    dam.position.set(0, 0.20, 2.28); g.add(dam);
    const splitter = new THREE.Mesh(G.splitter, M.trim);
    splitter.position.set(0, 0.10, 2.38); g.add(splitter);
    const wing = new THREE.Mesh(G.wing, M.trim);
    wing.position.set(0, 1.08, -2.18); g.add(wing);
    [-1.08, 1.08].forEach(sx => {
      const ep = new THREE.Mesh(G.wingEnd, M.trim);
      ep.position.set(sx, 0.92, -2.18); g.add(ep);
      const st = new THREE.Mesh(G.strut, M.trim);
      st.position.set(sx * 0.55, 0.86, -2.18); g.add(st);
    });

    // Mirrors
    [-1.0, 1.0].forEach(sx => {
      const mir = new THREE.Mesh(G.mirror, M.trim);
      mir.position.set(sx, 0.82, 0.55); g.add(mir);
    });

    // Lights (decal-style emissive planes)
    [-0.6, 0.6].forEach(sx => {
      const hl = new THREE.Mesh(G.lamp, M.head);
      hl.position.set(sx, 0.46, 2.51); g.add(hl);
      const tl = new THREE.Mesh(G.lamp, M.tail);
      tl.position.set(sx, 0.5, -2.51); tl.rotation.y = Math.PI; g.add(tl);
    });

    // Wheels (shared geometry; stored for rolling animation)
    const wheels = [];
    [[-1.12, -1.42], [1.12, -1.42], [-1.12, 1.42], [1.12, 1.42]].forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(G.tire, M.tire);
      tire.position.set(wx, R3D.WHEEL_R, wz); tire.castShadow = true; g.add(tire);
      const rim = new THREE.Mesh(G.rim, M.rim);
      rim.position.set(wx, R3D.WHEEL_R, wz); g.add(rim);
      const hub = new THREE.Mesh(G.hub, M.hub);
      hub.position.set(wx, R3D.WHEEL_R, wz); g.add(hub);
      wheels.push(tire, rim, hub);
    });

    // Painted number decals — roof + both doors
    const roundel = r3dRoundelTex(number);
    const decalMat = new THREE.MeshBasicMaterial({ map: roundel, transparent: true });
    const roofDecal = new THREE.Mesh(G.decalRoof, decalMat);
    roofDecal.position.set(0, 1.14, -0.15); roofDecal.rotation.x = -Math.PI / 2; g.add(roofDecal);
    [[-1.09, Math.PI / 2], [1.09, -Math.PI / 2]].forEach(([sx, ry]) => {
      const door = new THREE.Mesh(G.decalDoor, decalMat);
      door.position.set(sx, 0.5, -0.1); door.rotation.y = ry; g.add(door);
    });

    // (No draft box around the car — the HUD draft meter carries that info.)

    // Teammate marker — flat gold trim painted on the car itself.
    // (No floating banner: keeps the field readable at speed.)
    if (isTeammate) {
      const tmMat = new THREE.MeshLambertMaterial({ color: 0xe0a800 });
      const roofBand = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.05, 0.3), tmMat);
      roofBand.position.set(0, 1.14, 0.6); g.add(roofBand);
      [-1.10, 1.10].forEach(sx => {
        const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 3.4), tmMat);
        rocker.position.set(sx, 0.22, 0); g.add(rocker);
      });
    }

    g.position.set(x, 0, z);
    this.scene.add(g);

    return {
      mesh: g, wheels, isTeammate, carId, entrantId, teamName,
      isPlayer, power, label, hex, number, x, z,
      lv: 0,
      lvx: 0,          // AI lateral velocity (inertia)
      speed: R3D.SPEED_BASE * (0.78 + power * 0.22),
      targetX: x,
      spinning: false, spinTimer: 0, spinDir: 1,
      finished: false, dnf: false,
      draftBoost: 0, draftMomentum: 0,
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

    setMsg(`FORMATION LAP  —  P${this._startingPos} START`, true);
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
      this._updateCamera(dt);
      this._updateHUD(dt);
      return;
    }
    if (!this.racing || this.done) return;

    // NOTE: _pushLocked is cleared inside _separateCars, not here. It is set
    // by the contact solver which runs AFTER _updateAI, so clearing it here
    // meant _updateAI always saw false and cars in a pack kept making lane
    // decisions while locked bumper-to-bumper — a big source of the twitching.
    this._updatePlayer(dt);
    this._updateAI(dt);
    this._calcDraft(dt);
    this._calcChainBonus();
    this._separateCars(dt);
    this._checkCollisions();
    this._checkFinish();
    this._animateCars(dt);
    this._updateCamera(dt);
    this._updateHUD(dt);

    const endgameGlobal = this.player.z / R3D.TRACK_LEN >= R3D.ENDGAME_FRAC;
    const maxWrecks = endgameGlobal ? R3D.MAX_WRECKS + 3 : R3D.MAX_WRECKS;
    if (this.wreckCount < maxWrecks) {
      this.wreckCooldown -= dt;
      if (this.wreckCooldown <= 0) {
        this._triggerWreck();
        const minCD = endgameGlobal ? R3D.WRECK_MIN * 0.40 : R3D.WRECK_MIN;
        const maxCD = endgameGlobal ? R3D.WRECK_MAX * 0.50 : R3D.WRECK_MAX;
        this.wreckCooldown = minCD + Math.random() * (maxCD - minCD);
      }
    }
  }

  _updatePaceLap(dt) {
    const hw = R3D.HALF_W - 1.2;
    const p  = this.player;
    if      (this.keys.a) p.lv += R3D.LAT_ACC * 0.6 * dt;
    else if (this.keys.d) p.lv -= R3D.LAT_ACC * 0.6 * dt;
    else                  p.lv *= Math.pow(R3D.LAT_DAMP, dt);
    p.lv = clamp(p.lv, -R3D.LAT_MAX * 0.6, R3D.LAT_MAX * 0.6);
    p.x  = clamp(p.x + p.lv * dt, -hw, hw);

    for (const car of this.cars) {
      // Every row advances together on the formation lap. Letting each car
      // converge from its power-based race speed changed the live order before
      // the green flag, so the HUD could disagree with the announced grid spot.
      car.speed = R3D.PACE_SPEED;
      car.z += R3D.PACE_SPEED * dt;
      car.mesh.position.set(car.x, 0, car.z);
    }
    p.mesh.position.set(p.x, 0, p.z);
  }

  _updatePlayer(dt) {
    const p  = this.player;
    const hw = R3D.HALF_W - 1.2;

    if (p.spinning) {
      p.spinTimer -= dt;
      p.mesh.rotation.y += p.spinDir * 4.5 * dt;
      p.speed = Math.max(15, p.speed - 120 * dt);
      p.z += p.speed * dt;
      p.mesh.position.z = p.z;
      if (p.spinTimer <= 0) { p.spinning = false; p.mesh.rotation.y = 0; }
      return;
    }

    // Steering authority falls off slightly with speed (less twitchy at top speed)
    const spdFrac = clamp((p.speed - R3D.SPEED_BASE) / (R3D.SPEED_MAX - R3D.SPEED_BASE), 0, 1);
    const steerAuth = 1 - spdFrac * R3D.STEER_FALLOFF;
    // A = left = +X (world), D = right = -X (world); camera looks +Z so world +X = screen left
    if      (this.keys.a) p.lv += R3D.LAT_ACC * steerAuth * dt;
    else if (this.keys.d) p.lv -= R3D.LAT_ACC * steerAuth * dt;
    else                  p.lv *= Math.pow(R3D.LAT_DAMP, dt);

    p.lv = clamp(p.lv, -R3D.LAT_MAX, R3D.LAT_MAX);
    p.x  = clamp(p.x + p.lv * dt, -hw, hw);

    if (Math.abs(p.x) >= hw - 0.05) {
      p.lv = -p.lv * 0.28;
      p.speed = Math.max(p.speed * 0.88, 80);
      this.camShake = Math.max(this.camShake, 0.35);
      this._warn('WALL BRUSH');
    }

    const activeCount = this.cars.filter(c => !c.dnf && !c.finished).length;
    const aheadCount  = this.cars.filter(c => !c.dnf && !c.finished && c.z > p.z).length;
    const posFrac     = activeCount > 1 ? aheadCount / (activeCount - 1) : 0;
    const rubberBand  = posFrac * R3D.RUBBER_BAND;

    const tgt = Math.min(R3D.SPEED_BASE * (0.84 + p.power * 0.18) + p.draftBoost + rubberBand, R3D.SPEED_MAX);
    let braking = false;
    if (this.keys.s) {
      p.speed = Math.max(tgt * 0.38, p.speed - R3D.BRAKE_FORCE * dt);
      braking = true;
    } else {
      p.speed += (tgt - p.speed) * Math.min(1, dt * R3D.ACCEL);
    }

    p.z += p.speed * dt;
    p.mesh.position.set(p.x, 0, p.z);

    // Body roll (steer) + squat/dive (throttle/brake)
    const roll = this.keys.a ? -0.05 : this.keys.d ? 0.05 : 0;
    p.mesh.rotation.z += (roll - p.mesh.rotation.z) * 0.12;
    const pitch = braking ? 0.035 : (p.speed < tgt - 4 ? -0.025 : 0);
    p.mesh.rotation.x += (pitch - p.mesh.rotation.x) * 0.08;
  }

  _updateAI(dt) {
    // Where the race leader is, so stragglers know how much ground to make up
    this._leadZ = this.cars.reduce(
      (m, c) => (!c.dnf && !c.finished && c.z > m ? c.z : m), -Infinity);
    if (!isFinite(this._leadZ)) this._leadZ = this.player.z;

    for (const car of this.cars) {
      if (car.isPlayer) continue;
      if (car.contactCooldown > 0) car.contactCooldown -= dt;
      if (car.finished) continue;

      if (car.dnf) { car.mesh.rotation.y += 0.35 * dt; continue; }
      if (car.spinning) {
        car.spinTimer -= dt;
        car.mesh.rotation.y += car.spinDir * 3.5 * dt;
        car.speed = Math.max(8, car.speed - 70 * dt);
        car.z += car.speed * dt;
        car.mesh.position.z = car.z;
        if (car.spinTimer <= 0) { car.dnf = true; car.spinning = false; }
        continue;
      }

      // Continuous aggression ramp — no sudden switch from calm to chaos.
      const progress = car.z / R3D.TRACK_LEN;
      // Team-mates are working with you — they never inherit the difficulty
      // aggression bump, which is what made them twitchy on Pro.
      const aggroMul = car.isTeammate ? 1 : this.diff.aiAggro;
      // Harder settings start racing hard sooner
      const calmFrac = R3D.CALM_FRAC / Math.max(0.5, aggroMul);
      const aggro = clamp(
        (progress - calmFrac) / Math.max(0.01, R3D.ENDGAME_FRAC - calmFrac), 0, 1);
      const mix = (calm, wild) => calm + (wild - calm) * aggro;
      const endgame = progress >= R3D.ENDGAME_FRAC;
      car.laneTimer -= dt;

      // ── Teammates work with you ────────────────────────────
      // If a teammate is close behind you they line up to push; if they are
      // just ahead they hold their lane so you can push them. Either way they
      // never try to pass you.
      if (car.isTeammate && !car._pushLocked) {
        const p  = this.player;
        const dz = p.z - car.z;                    // >0 = player is ahead
        if (!p.dnf && !p.finished && !p.spinning && Math.abs(dz) < R3D.TEAM_HELP_Z) {
          const hw = R3D.HALF_W - 1.4;
          car.followX  = car.followX == null ? car.x : car.followX;
          car.followX += (p.x - car.followX) * (1 - Math.exp(-2.2 * dt));
          car.targetX  = clamp(car.followX, -hw, hw);   // ease onto their line
          car.laneTimer = 0.5;                     // hold this, skip random drift
          car._helping  = true;
          // Behind you: close the gap. Ahead of you: ease so you can catch up.
          car.speed += (dz > 0 ? 14 : -6) * dt;
        } else {
          car._helping = false;
        }
      }

      // ── Racecraft (Amateur and above) ──────────────────────
      // A rival that has dropped back tucks into your tow to reel you in
      // rather than wandering across the track, and one you are catching
      // shades over to defend its line. Both are committed to for a beat so
      // it reads as racecraft, not twitching.
      const craft = this.diff.racecraft || 0;
      car._tactic = car._tactic || null;
      if (craft > 0 && !car.isTeammate && !car._pushLocked) {
        const p  = this.player;
        const hw = R3D.HALF_W - 1.4;
        if (!p.dnf && !p.finished && !p.spinning) {
          const dz    = p.z - car.z;                 // >0 you are ahead of them
          const dx    = Math.abs(p.x - car.x);
          const closing = p.speed - car.speed;       // >0 you are catching them

          car.tacticTimer = (car.tacticTimer || 0) - dt;
          if (car.tacticTimer <= 0) {
            // Decide on the situation, then COMMIT — a driver who re-decides
            // every frame is exactly what reads as erratic.
            car.tacticTimer = R3D.TACTIC_COMMIT;
            const prev = car._tactic;
            car._tactic = null;

            if (dz > R3D.PUSH_Z && dz < R3D.DRAFT_Z && dx < R3D.LANE_WIDTH * 2) {
              // They have lost ground and you are within tow range — hook on.
              // Worth doing whenever they are not slower than you.
              if (closing > -6 && Math.random() < craft) car._tactic = 'tow';
            } else if (dz < -1.5 && dz > -R3D.BLOCK_Z && closing > 1.5) {
              // You are on their bumper and coming. Defend the line — but only
              // if they still have somewhere legal to be.
              if (Math.random() < craft * 0.8) car._tactic = 'defend';
            }

            // Lock in the defensive line once, so they hold it instead of
            // sliding across the track frame by frame.
            if (car._tactic === 'defend' && prev !== 'defend') {
              const shade = clamp(p.x - car.x, -R3D.BLOCK_MAX, R3D.BLOCK_MAX);
              car._blockX = clamp(car.x + shade, -hw, hw);
            }
          }

          if (car._tactic === 'tow') {
            car.followX = car.followX == null ? car.x : car.followX;
            car.followX += (p.x - car.followX) * (1 - Math.exp(-2.0 * dt));
            car.targetX = clamp(car.followX, -hw, hw);   // ease into the tow
          } else if (car._tactic === 'defend') {
            car.targetX = clamp(car._blockX != null ? car._blockX : car.x, -hw, hw);
          }
        } else {
          car._tactic = null;
        }
      }

      // ── Lane choice by judgement, not coin flip ────────────
      // Lanes are scored on what is actually there: clear air, a tow to latch
      // onto, room from the wall, and whether anyone is alongside. A car only
      // moves if a lane is clearly better AND it has held its current line
      // long enough — that commitment is what stops the weaving.
      if (!car._pushLocked && !car._helping && !car._tactic) {
        const hw = R3D.HALF_W - 1.4;

        const nearWreck = this.wrecks.find(w =>
          w.z > car.z && w.z < car.z + 60 && Math.abs(w.x - car.x) < 6);

        if (nearWreck) {
          // Avoiding a wreck overrides everything else
          const dir = nearWreck.x > 0 ? -1 : 1;
          car.targetX  = clamp(nearWreck.x + dir * 8, -hw, hw);
          car.laneTimer = 1.2;
        } else if (car.laneTimer <= 0) {
          const step = R3D.LANE_STEP;
          const options = [car.x, car.x - step, car.x + step, car.x - step * 2, car.x + step * 2]
            .map(x => clamp(x, -hw, hw));
          let bestX = car.x;
          let bestScore = this._scoreLane(car, car.x, aggro);
          const stay = bestScore;
          for (let i = 1; i < options.length; i++) {
            const s = this._scoreLane(car, options[i], aggro);
            if (s > bestScore) { bestScore = s; bestX = options[i]; }
          }
          // Only commit to a move that is meaningfully better
          if (bestScore > stay + R3D.LANE_GAIN_MIN) {
            car.targetX = bestX;
            car.laneTimer = mix(R3D.LANE_COMMIT, R3D.LANE_COMMIT * 0.55);
          } else {
            car.targetX = car.x;                       // hold the line
            car.laneTimer = mix(R3D.LANE_COMMIT * 1.4, R3D.LANE_COMMIT * 0.7);
          }
        }
      }

      // Difficulty lifts both the AI's pace and its ceiling.
      // The base spread is deliberately narrow: on a superspeedway the cars are
      // all within a whisker of each other and the draft does the rest, which
      // is what keeps the field packed instead of strung out.
      const dSpd = this.diff.aiSpeed;
      // Anyone stranded behind the leader gets a hand back to the pack
      const lead = this._leadZ || car.z;
      const back = clamp((lead - car.z) / R3D.PACK_GAP, 0, 1);
      const catchUp = back * R3D.PACK_CATCHUP;
      const tgt = Math.min(
        (R3D.SPEED_BASE * (0.86 + car.power * 0.15)) * dSpd + car.draftBoost + catchUp,
        R3D.SPEED_MAX * dSpd + catchUp);
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
      const edge = R3D.HALF_W - 1.2;
      car.lvx = car.lvx || 0;
      car.lvx += clamp(desired - car.lvx, -latAcc * dt, latAcc * dt);
      car.lvx *= Math.pow(R3D.AI_LAT_DAMP, dt);
      car.x = clamp(car.x + car.lvx * dt, -edge, edge);
      if (Math.abs(car.x) >= edge - 0.001) car.lvx *= 0.3;   // scrub along the wall
      car.z += car.speed * dt;
      car.mesh.position.set(car.x, 0, car.z);
      // Subtle AI body roll based on lateral movement
      const aiRoll = clamp((car.lvx / R3D.AI_LAT_MAX) * 0.055, -0.055, 0.055);
      car.mesh.rotation.z += (aiRoll - car.mesh.rotation.z) * (1 - Math.exp(-6 * dt));
    }
  }

  // ── Lane judgement ───────────────────────────────────────────
  // Score how good a piece of track would be for this car right now. Higher is
  // better. This is what gives the AI race IQ: it moves for a reason (clear
  // air, a tow, avoiding someone alongside) instead of drifting at random.
  _scoreLane(car, laneX, aggro) {
    const hw = R3D.HALF_W - 1.4;
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

    // Clear air ahead is worth a lot — this is what makes a car pull out of a
    // queue and go, rather than sitting in dirty air forever.
    score += Math.min(nearestAhead, 140) / 140 * 1.0;

    // A tow beats clear air almost every time: on a superspeedway you go
    // nowhere alone, and hooking onto a train is how you get to the front. The
    // longer the train already is, the more every driver wants to be in it.
    if (towGap < Infinity) {
      const towQuality = 1 - (towGap / R3D.DRAFT_Z);       // closer = stronger
      const trainLen   = (towCar && towCar.chainLen) || 1; // how big is that line
      const trainPull  = 1 + Math.min(trainLen - 1, 4) * 0.22;
      score += towQuality * R3D.TOW_APPEAL * trainPull;
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
    for (const car of this.cars) {
      if (car.dnf || car.finished) { car.draftBoost = 0; car.draftMomentum = 0; continue; }

      let liveBoost = 0, pushing = false;
      for (const other of this.cars) {
        if (other === car || other.dnf || other.finished) continue;
        const dz = other.z - car.z;
        const dx = Math.abs(other.x - car.x);
        if (dz <= 0) continue;

        if (dz < R3D.PUSH_Z && dx < R3D.PUSH_X) {
          // A team-mate pushes harder than a stranger, and takes the shove too
          const teamLink = (car.isTeammate && other.isPlayer) || (car.isPlayer && other.isTeammate);
          const bonus = R3D.PUSH_BONUS + (teamLink ? R3D.TEAM_PUSH_BONUS : 0);
          liveBoost = Math.max(liveBoost, R3D.DRAFT_BOOST + bonus);
          pushing = true;
          if (!other._pushBoosted) {
            other._pushBoosted = true;
            other.draftBoost = Math.max(other.draftBoost || 0, bonus * (teamLink ? 1.0 : 0.7));
          }
          continue;
        }
        if (dz > R3D.DRAFT_Z || dx > R3D.DRAFT_X) continue;
        // The tow ropes you in: there is a real tug from the far edge of the
        // cone, and it keeps building the closer you get, until you arrive on
        // the bumper and start pushing instead.
        const closeness  = 1 - (dz / R3D.DRAFT_Z);
        const intensity  = Math.pow(closeness, R3D.DRAFT_CURVE);
        liveBoost = Math.max(liveBoost, intensity * R3D.DRAFT_BOOST);
      }
      car._pushBoosted = false;

      // Higher difficulties give the player less free speed from the tow
      if (car.isPlayer) liveBoost *= this.diff.playerDraft;

      if (liveBoost > car.draftMomentum) car.draftMomentum = liveBoost;
      else car.draftMomentum = Math.max(0, car.draftMomentum - R3D.DRAFT_SLING * dt);
      car.draftBoost = car.draftMomentum;

    }
  }

  _calcChainBonus() {
    const active = this.cars.filter(c => !c.dnf && !c.finished).sort((a, b) => b.z - a.z);
    if (active.length < 2) return;
    let chainStart = 0;
    for (let i = 0; i <= active.length; i++) {
      const inChain = i < active.length && i > 0 &&
        (active[i - 1].z - active[i].z) < R3D.DRAFT_Z &&
        Math.abs(active[i - 1].x - active[i].x) < R3D.DRAFT_X;
      if (!inChain || i === active.length) {
        const len = i - chainStart;
        if (len >= 2) {
          // Each extra car in the train is worth more than the last, so a
          // three-car chain genuinely hauls in a two-car link rather than
          // trailing it by a nose. Capped so a huge train can't escape.
          const raw = (len - 1) * R3D.CHAIN_PER_CAR * (1 + (len - 2) * R3D.CHAIN_CURVE);
          const bonus = Math.min(raw, R3D.CHAIN_MAX);
          for (let k = chainStart; k < i; k++) {
            active[k].draftBoost += bonus;
            active[k].chainLen = len;
          }
        } else {
          for (let k = chainStart; k < i; k++) active[k].chainLen = 1;
        }
        chainStart = i;
      }
    }
  }

  // ── Contact resolution ───────────────────────────────────────
  // Cars are pushed apart at a bounded RATE and nudged with velocity impulses,
  // never snapped to a new position. That is the difference between a stock car
  // leaning on another one and a car teleporting sideways when you touch it.
  _separateCars(dt) {
    const step = Math.max(dt || 0.016, 0.001);
    const active = this.cars.filter(c => !c.finished && !c.dnf && !c.spinning);
    const hw = R3D.HALF_W - 1.1;
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

          // ── Longitudinal: ease B back, hard stop only if truly inside A ──
          const overlapZ = R3D.CAR_SEP_Z - dz;
          const maxCorr  = R3D.SEP_Z_RATE * step;
          B.z -= Math.min(overlapZ, maxCorr);
          const floorZ = A.z - R3D.CAR_SEP_Z * 0.82;   // never visually interpenetrate
          if (B.z > floorZ) B.z = floorZ;
          B.mesh.position.z = B.z;

          // Momentum transfer, applied smoothly rather than as a step change
          const diff = B.speed - A.speed;
          if (diff > 0) {
            const give = Math.min(diff, 60) * step * 6;      // ~0.1 of the delta per frame
            A.speed = Math.min(R3D.SPEED_MAX * 1.05, A.speed + give);
            B.speed = Math.max(40, B.speed - give * 0.35);
          }

          // ── Lateral: only when genuinely side by side ──────────────
          // Pure bumper contact gets NO sideways force at all, which is what
          // makes pushing feel planted instead of squirrelly.
          if (adx > R3D.CAR_SEP_X * 0.45) {
            const overlapX = (R3D.CAR_SEP_X - adx) * 0.5;
            const dir  = dx > 0 ? 1 : -1;                     // from A toward B
            const corr = Math.min(overlapX, R3D.SEP_X_RATE * step);
            A.x = clamp(A.x - dir * corr, -hw, hw);
            B.x = clamp(B.x + dir * corr, -hw, hw);
            A.mesh.position.x = A.x; B.mesh.position.x = B.x;

            // Impulse, not a teleport: the cars lean off each other and the
            // AI's own steering recovers the line over the next second.
            const imp = R3D.CONTACT_IMPULSE;
            if (A.isPlayer) A.lv  = clamp(A.lv - dir * imp, -R3D.LAT_MAX, R3D.LAT_MAX);
            else            A.lvx = clamp((A.lvx || 0) - dir * imp, -R3D.AI_LAT_MAX * 1.5, R3D.AI_LAT_MAX * 1.5);
            if (B.isPlayer) B.lv  = clamp(B.lv + dir * imp, -R3D.LAT_MAX, R3D.LAT_MAX);
            else            B.lvx = clamp((B.lvx || 0) + dir * imp, -R3D.AI_LAT_MAX * 1.5, R3D.AI_LAT_MAX * 1.5);
          }
        }
      }
    }
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
          this._bumpPlayer(car.x < p.x ? 1 : -1);
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

  _bumpPlayer(pushDir) {
    const p = this.player;
    if (p.spinning) return;
    p.lv = clamp(p.lv + pushDir * 1.5, -R3D.LAT_MAX, R3D.LAT_MAX);
    p.speed = Math.max(p.speed * 0.96, 80);
    this.camShake = Math.max(this.camShake, 0.2);
    if (Math.random() < R3D.SPIN_CHANCE) {
      this._spinPlayer(1.6, pushDir, 1.1);
      this._warn('SPIN OUT');
    }
  }

  _spinPlayer(duration, dir, shake) {
    const p = this.player;
    if (p.spinning) return;
    p.spinning = true; p.spinTimer = duration; p.spinDir = dir || 1;
    p.speed = 20;
    this.camShake = Math.max(this.camShake, shake);
  }

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
    const overlay  = document.getElementById('r3d-pause-overlay');
    const pauseBtn = document.getElementById('r3d-pause-btn');
    if (overlay)  overlay.classList.toggle('active', this.paused);
    if (pauseBtn) pauseBtn.textContent = this.paused ? 'RESUME' : 'PAUSE';
    if (!this.paused && this.clock) this.clock.getDelta();
  }

  _checkFinish() {
    const TL = R3D.TRACK_LEN;
    // Several cars can cross on the same frame — at 200+ units/sec a frame is
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

    for (const car of crossed) {
      car.finished = true;
      this.finishOrder.push(car);
    }
    const player = crossed.find(c => c.isPlayer);
    if (player) {
      this.done = true;
      const pos = this.finishOrder.indexOf(player) + 1;
      // The tower normally refreshes at 5fps. Once done is set the main loop
      // stops updating it, so force one authoritative final refresh here.
      this._updateOrder(pos, this.cars.filter(c => !c.dnf).length);
      this._showFinish(pos);
    }
  }

  // The real running order at the moment the player takes the flag: cars that
  // already finished in the order they crossed, then everyone else by distance,
  // then retirements. Used so the on-track result — including your team-mates —
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
      position: i + 1,
      dnf:      !!c.dnf,
    }));
  }

  _triggerWreck() {
    const pz = this.player.z;
    const endgame = pz / R3D.TRACK_LEN >= R3D.ENDGAME_FRAC;
    const aheadMin  = endgame ? 30 : 80;
    const finishBuf = endgame ? 60 : 200;
    const cands = this.cars.filter(c =>
      !c.isPlayer && !c.spinning && !c.finished && !c.dnf &&
      c.z > pz + aheadMin && c.z < R3D.TRACK_LEN - finishBuf);
    if (cands.length < 2) return;

    this.wreckCount++;
    const victim = cands[Math.floor(Math.random() * cands.length)];
    victim.spinning = true; victim.spinTimer = 4.0;
    victim.spinDir = Math.random() > 0.5 ? 1 : -1;

    setTimeout(() => {
      if (!this.scene) return;
      const wx = victim.x, wz = victim.z;
      this.wrecks.push({ x: wx, z: wz });
      const db = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.35, 2.8),
        new THREE.MeshLambertMaterial({ color: 0x4c4c52 }));
      db.rotation.y = Math.random() * Math.PI;
      db.position.set(wx, 0.18, wz); this.scene.add(db);
      const sm = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x8a8a90, transparent: true, opacity: 0.38 }));
      sm.position.set(wx, 1.9, wz); this.scene.add(sm);
      if (Math.abs(wz - pz) < 400) this._warn('WRECK AHEAD — STEER CLEAR');
    }, 1200);
  }

  _updateCamera(dt) {
    const p  = this.player;
    const sk = this.camShake;
    const nx = sk > 0 ? (Math.random() - 0.5) * sk : 0;
    const ny = sk > 0 ? (Math.random() - 0.5) * sk * 0.4 : 0;

    const spd = clamp((p.speed - R3D.SPEED_BASE) / (R3D.SPEED_MAX - R3D.SPEED_BASE), 0, 1);
    const fovTarget = 62 + spd * 13;
    this.camera.fov += (fovTarget - this.camera.fov) * 0.07;
    this.camera.updateProjectionMatrix();

    const tx = p.x * 0.85 + nx;
    const ty = 4.4 + ny;
    const tz = p.z - 10.5 + nx * 0.15;
    this.camera.position.x += (tx - this.camera.position.x) * 0.12;
    this.camera.position.y += (ty - this.camera.position.y) * 0.10;
    this.camera.position.z += (tz - this.camera.position.z) * 0.12;
    this.camera.lookAt(p.x * 0.55, 1.5, p.z + 26);
    this.camShake = Math.max(0, sk - dt * 2.5);

    // Sit just above and behind the roofline, aimed level down the track so
    // cars behind sit in the middle of the glass rather than at the top edge.
    this.mirrorCam.position.set(p.x, 2.5, p.z + 1.2);
    this.mirrorCam.lookAt(p.x, 1.8, p.z - 60);
  }

  // Rear-view mirror.
  //
  // The old approach negated projectionMatrix.elements[0] to flip left/right.
  // That also reverses triangle winding, so every front face was drawn as a
  // back face — surfaces looked hollow and textures read wrong. Instead we
  // render the rear view normally into an offscreen target (correct winding,
  // correct lighting) and then blit it through a quad with mirrored UVs.
  _initMirrorTarget(w, h) {
    if (this.mirrorRT) this.mirrorRT.dispose();
    this.mirrorRT = new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
    });
    this.mirrorRTSize = { w, h };

    if (!this.mirrorScene) {
      this.mirrorScene = new THREE.Scene();
      this.mirrorQuadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      // depthTest off: the main scene has already written depth into this
      // region of the canvas and would otherwise reject the quad.
      this.mirrorQuadMat = new THREE.MeshBasicMaterial({
        map: this.mirrorRT.texture, depthTest: false, depthWrite: false,
      });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mirrorQuadMat);
      this.mirrorScene.add(quad);
    } else {
      this.mirrorQuadMat.map = this.mirrorRT.texture;
      this.mirrorQuadMat.needsUpdate = true;
    }
    // Horizontal flip — this is what makes it read as a mirror.
    const t = this.mirrorRT.texture;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = -1;
    t.offset.x = 1;
  }

  _renderMirror() {
    const wrap = document.getElementById('r3d-mirror-wrap');
    if (!wrap || !this.scene || !this.mirrorCam || !this.renderer) return;
    const rect = wrap.getBoundingClientRect();
    const cr   = this.canvas.getBoundingClientRect();
    const mw = Math.round(rect.width);
    const mh = Math.round(rect.height);
    if (mw < 2 || mh < 2) return;

    const dpr = this.renderer.getPixelRatio();
    const rtW = Math.round(mw * dpr);
    const rtH = Math.round(mh * dpr);
    if (!this.mirrorRT || this.mirrorRTSize.w !== rtW || this.mirrorRTSize.h !== rtH) {
      this._initMirrorTarget(rtW, rtH);
    }

    const r = this.renderer;
    const sz = new THREE.Vector2();
    r.getSize(sz);

    // Pass 1 — rear view into the offscreen target, unflipped.
    // The mirror is a wide letterbox. Driving it with a fixed VERTICAL fov
    // meant the horizontal fov ballooned with the aspect ratio (~154° at
    // 620x104) and everything looked fisheyed. Derive the vertical fov from a
    // fixed HORIZONTAL fov instead, so the view stays natural at any size.
    const aspect = mw / mh;
    const hFov   = R3D.MIRROR_HFOV * Math.PI / 180;
    const vFov   = 2 * Math.atan(Math.tan(hFov / 2) / aspect);
    this.mirrorCam.aspect = aspect;
    this.mirrorCam.fov    = clamp(vFov * 180 / Math.PI, 12, 70);
    this.mirrorCam.updateProjectionMatrix();
    r.setRenderTarget(this.mirrorRT);
    r.setViewport(0, 0, rtW, rtH);
    r.clear(true, true, true);
    r.render(this.scene, this.mirrorCam);
    r.setRenderTarget(null);

    // Pass 2 — blit it into the mirror rectangle with mirrored UVs.
    const mx  = Math.round(rect.left - cr.left);
    const my  = Math.round(rect.top  - cr.top);
    const glY = Math.round(sz.y - my - mh);
    r.setScissorTest(true);
    r.setScissor(mx, glY, mw, mh);
    r.setViewport(mx, glY, mw, mh);
    r.render(this.mirrorScene, this.mirrorQuadCam);
    r.setScissorTest(false);
    r.setViewport(0, 0, sz.x, sz.y);
  }

  // ── HUD ──────────────────────────────────────────────────────
  _updateHUD(dt) {
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
    const mph = Math.round(p.speed * 0.78 + 33);
    const spdEl = document.getElementById('r3d-speed');
    if (spdEl) spdEl.textContent = mph;

    // Draft label + meter
    const momentum = p.draftMomentum || 0;
    const isPush = momentum > R3D.DRAFT_BOOST;
    const frac = clamp(momentum / (R3D.DRAFT_BOOST + R3D.PUSH_BONUS), 0, 1);
    const draftEl = document.getElementById('r3d-draft');
    const fillEl  = document.getElementById('r3d-draft-fill');
    if (draftEl) {
      const on = frac > 0.04;
      draftEl.textContent = isPush ? 'PUSH DRAFT' : 'DRAFT';
      draftEl.style.color = !on ? 'var(--text-mute)' : isPush ? 'var(--warn)' : 'var(--accent)';
    }
    if (fillEl) {
      fillEl.style.width = (frac * 100).toFixed(0) + '%';
      fillEl.style.background = isPush ? 'var(--warn)' : 'var(--accent)';
    }

    // Progress
    const prog = document.getElementById('r3d-prog-fill');
    if (prog) prog.style.width = clamp(p.z / R3D.TRACK_LEN * 100, 0, 100).toFixed(1) + '%';

    // Minimap (throttled ~20fps)
    this._mapAcc += dt;
    if (this._mapAcc >= 0.05) {
      this._mapAcc = 0;
      const hw = R3D.HALF_W;
      for (const car of this.cars) {
        if (!car._dot) continue;
        if (car.dnf) { car._dot.style.opacity = '0.25'; }
        const topPct  = clamp(100 - (car.z / R3D.TRACK_LEN) * 100, 0, 100);
        const leftPct = clamp(50 + (car.x / hw) * 42, 4, 96);
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
    el.innerHTML = rows;
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
    const msg = pos === 1 ? 'Victory Lane' : pos <= 3 ? 'Podium Finish' : `P${pos} Finish`;
    el.innerHTML = `
      <div class="r3d-finish-box">
        <div class="r3d-finish-pos">${pos}${ordinal(pos)} Place</div>
        <div class="r3d-finish-msg">${msg}</div>
        <button class="btn btn-primary btn-lg" onclick="window._r3dFinish(${pos})">Continue</button>
      </div>`;
    el.style.display = 'flex';
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this._update(dt);
    if (this.renderer && this.scene && this.camera) {
      this.renderer.autoClear = true;
      this.renderer.render(this.scene, this.camera);
      this.renderer.autoClear = false;
      this._renderMirror();
      this.renderer.autoClear = true;
    }
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this._raf = null;
    clearTimeout(this._warnTimeout);
    document.removeEventListener('keydown', this._kd);
    document.removeEventListener('keyup',   this._ku);
    window.removeEventListener('resize',    this._onResize);

    // Release GPU resources — without this, every race leaks its track,
    // car geometry and canvas textures for the life of the page.
    if (this.scene && this.scene.traverse) {
      const shared = new Set(_r3dRoundelCache.values()); // reused across races — keep
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
    this.mirrorScene = null;
    if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
    this.scene  = null;
    this.camera = null;
    this.cars   = [];
    this.done   = true;
  }
}
