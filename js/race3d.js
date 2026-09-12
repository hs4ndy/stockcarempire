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
  DRAFT_Z:        82,     // useful tow range without linking the whole field
  DRAFT_X:        3.6,    // wake half-width at distance; narrower at the bumper
  DRAFT_BOOST:    27,
  DRAFT_BUILD:    1.8,    // exponential response rates, independent of frame rate
  DRAFT_RELEASE:  1.50,
  DRAFT_CARRY:    1.35,   // enough time to clear a bumper and use the earned run
  PUSH_Z:         6.5,    // push fades continuously from contact to this gap
  PUSH_X:         1.45,   // accurate bumper alignment earns the strongest push
  PUSH_BONUS:     8,
  CHAIN_MAX:      12,     // diminishing shared efficiency, including the lead car
  CHAIN_LINK_Z:   24,     // close, aligned cars contribute to the same working line
  AERO_MAX:       43,     // combined tow, received push and chain ceiling
  PACK_CATCHUP:   16,     // gradual recovery after losing the leading groups
  PACK_GAP_START: 160,
  PACK_GAP:       600,
  TEAM_HELP_Z:    60,     // range at which a teammate starts working with you
  TEAM_PUSH_BONUS: 1.5,   // coordination benefit only while working through the pack
  TEAM_FRONT_FRAC: 0.18,  // top of the field races for itself, regardless of team
  TEAM_RACE_END:  0.72,   // teammates stop cooperating before the final charge
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

// Grass - flat green with subtle mow banding
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

// Grandstand crowd - dark base, scattered bright clothing dots
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
      </div>

      <div class="r3d-progress-wrap">
        <div class="r3d-progress-fill" id="r3d-prog-fill"></div>
        <div class="r3d-progress-label"><span>RACE DISTANCE</span><span>FINISH</span></div>
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
    // results table reflects what actually happened - team-mates included.
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
    // instead of shimmering - most visible in the mirror.
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
    this._onBlur = () => {
      this.keys.a = this.keys.d = this.keys.s = false;
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
      parts: Object.fromEntries(Object.entries(SC_STOCK_CAR_MODEL.parts)
        .map(([name, data]) => [name, decode(data)])),
      wheel: decode(SC_STOCK_CAR_MODEL.wheel),
      decalDoor: new THREE.PlaneGeometry(0.80, 0.48),
      decalRoof: decode(SC_STOCK_CAR_MODEL.roofDecal),
      teamBand: decode(SC_STOCK_CAR_MODEL.teamBand),
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
  _buildTrack() {
    const s  = this.scene;
    const TL = R3D.TRACK_LEN;
    const d  = this._dummy;

    // Blender-authored flat straight: pavement, white barrier rails and curved
    // catch fencing. The 22-unit playable width and wall contact plane are unchanged.
    // One shared indexed buffer per material, repeated in 60-unit modules.
    const track = SC_TRACK_MODEL;
    const loader = new THREE.TextureLoader();
    const load = name => {
      // Data URLs remain valid WebGL sources when index.html is opened via
      // file://. Neighboring file images are rejected by Chrome's CORS rules.
      const tex = loader.load(SC_TRACK_TEXTURES[name]);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = this._maxAniso;
      return tex;
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
    // endpoints. Classification still uses the original 15,000-unit finish.
    const runoutModules = Math.ceil(4200 / track.moduleLength);
    const moduleCount = Math.ceil(TL / track.moduleLength) + 2 * runoutModules;
    this.trackGroup = new THREE.Group();
    this.trackGroup.name = track.name;
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

    // Grass aprons (textured)
    const gTex = r3dGrassTex();
    gTex.wrapS = gTex.wrapT = THREE.RepeatWrapping;
    gTex.repeat.set(40, TL / 20);
    const grassMat = new THREE.MeshLambertMaterial({ map: gTex, color: 0xcccccc, side: THREE.DoubleSide });
    [-1, 1].forEach(side => {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(600, TL + 200), grassMat);
      g.rotation.x = -Math.PI / 2;
      // Exterior grass begins behind the wall, never beneath the paved edge.
      g.position.set(side * (track.wallInnerX + 300), -0.02, TL / 2);
      g.receiveShadow = true;
      s.add(g);
    });

    // One Blender-authored finish: dark steel truss, two-sided mesh lettering
    // and flush checkered paint centered on the unchanged classification plane.
    this.finishGroup = new THREE.Group();
    this.finishGroup.name = 'track:finish';
    this.finishGroup.position.z = TL;
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

    // Wall dressing is authored with the barrier in _buildTrack().
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

    g.name = SC_STOCK_CAR_MODEL.name;
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

    const wheels = SC_STOCK_CAR_MODEL.wheelPositions.map(([wx, wy, wz]) => {
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
    roofDecal.name = 'Roof number';
    g.add(roofDecal);
    // Outward-facing normals on both doors prevent mirrored or invisible numbers.
    [[-1.023, -Math.PI / 2], [1.023, Math.PI / 2]].forEach(([sx, ry]) => {
      const door = new THREE.Mesh(G.decalDoor, decalMat);
      door.position.set(sx, 0.55, 0.04);
      door.rotation.y = ry;
      door.name = 'Door number';
      g.add(door);
    });

    if (isTeammate) {
      const roofBand = new THREE.Mesh(G.teamBand, accMat);
      g.add(roofBand);
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
      draftBoost: 0, draftMomentum: 0, towStrength: 0, pushStrength: 0,
      receivedPush: 0, chainLen: 1,
      raceNerve: 0.85 + Math.random() * 0.3,
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
      this._updateCamera(dt);
      this._updateHUD(dt);
      return;
    }
    if (!this.racing || this.done) return;

    for (const car of this.cars) car._frameStartX = car.x;

    // NOTE: _pushLocked is cleared inside _separateCars, not here. It is set
    // by the contact solver which runs AFTER _updateAI, so clearing it here
    // meant _updateAI always saw false and cars in a pack kept making lane
    // decisions while locked bumper-to-bumper - a big source of the twitching.
    this._updatePlayer(dt);
    this._updateAI(dt);
    this._calcDraft(dt);
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
    const input = Number(this.keys.a) - Number(this.keys.d);
    const desired = input * R3D.LAT_MAX * 0.6;
    p.lv = p.lv || 0;
    p.lv += clamp((desired - p.lv) * (1 - Math.exp(-4 * dt)), -R3D.LAT_ACC * dt, R3D.LAT_ACC * dt);
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
    const input = Number(this.keys.a) - Number(this.keys.d);
    const desired = input * R3D.LAT_MAX * steerAuth;
    const rate = input ? 10.0 : -Math.log(R3D.LAT_DAMP);
    p.lv += clamp((desired - p.lv) * (1 - Math.exp(-rate * dt)), -R3D.LAT_ACC * dt, R3D.LAT_ACC * dt);

    p.lv = clamp(p.lv, -R3D.LAT_MAX, R3D.LAT_MAX);
    p.x  = clamp(p.x + p.lv * dt, -hw, hw);

    if (Math.abs(p.x) >= hw - 0.001 && p.lv * p.x > 0) {
      p.lv = -p.lv * 0.08;
      p.speed = Math.max(p.speed * Math.exp(-1.3 * dt), 80);
      this.camShake = Math.max(this.camShake, 0.35);
      this._warn('WALL BRUSH');
    }

    const activeCount = this.cars.filter(c => !c.dnf && !c.finished).length;
    const aheadCount  = this.cars.filter(c => !c.dnf && !c.finished && c.z > p.z).length;
    const posFrac     = activeCount > 1 ? aheadCount / (activeCount - 1) : 0;
    const leadZ = this.cars.reduce((z,c) => !c.dnf && !c.finished ? Math.max(z,c.z) : z, p.z);
    const recovery = clamp((leadZ-p.z-R3D.PACK_GAP_START) / (R3D.PACK_GAP-R3D.PACK_GAP_START),0,1);
    const rubberBand = posFrac * R3D.RUBBER_BAND * (this.diff.playerCatchup ?? 1) + recovery * R3D.PACK_CATCHUP;

    const tgt = Math.min(R3D.SPEED_BASE * (0.89 + p.power * 0.18) + p.draftBoost + rubberBand, R3D.SPEED_MAX);
    let braking = false;
    if (this.keys.s) {
      p.speed = Math.max(tgt * 0.38, p.speed - R3D.BRAKE_FORCE * dt);
      braking = true;
    } else {
      p.speed += (tgt - p.speed) * (1 - Math.exp(-R3D.ACCEL * dt));
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
        if (car.debrisTimer != null) {
          car.debrisTimer -= dt;
          if (car.debrisTimer <= 0) {
            this._dropDebris(car);
            car.debrisTimer = null;
          }
        }
        car.mesh.rotation.y += car.spinDir * 3.5 * dt;
        car.speed = Math.max(8, car.speed - 70 * dt);
        car.z += car.speed * dt;
        car.mesh.position.z = car.z;
        if (car.spinTimer <= 0) { car.dnf = true; car.spinning = false; }
        continue;
      }

      car._teamWorking = this._teammateCooperation(car);
      const aggro = this._raceAggression(car, car._teamWorking);
      const aggroMul = car._teamWorking ? 1 : this.diff.aiAggro;
      const mix = (calm, wild) => calm + (wild - calm) * aggro;
      this._chooseAILine(car, aggro, dt);

      // Difficulty lifts both the AI's pace and its ceiling. Individual power
      // creates natural separation; bounded recovery helps detached cars
      // reconnect without changing their positions or slowing the leaders.
      const dSpd = this.diff.aiSpeed;
      const lead = this._leadZ || car.z;
      const back = clamp((lead - car.z - R3D.PACK_GAP_START) /
        (R3D.PACK_GAP - R3D.PACK_GAP_START), 0, 1);
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

  _raceAggression(car, teamWorking = false) {
    const calm = R3D.CALM_FRAC / Math.max(0.5, teamWorking ? 1 : this.diff.aiAggro);
    const phase = r3dSmooth((car.z / R3D.TRACK_LEN - calm) /
      Math.max(0.01, R3D.ENDGAME_FRAC - calm));
    const temperament = clamp(((car.raceNerve || 1) - 1) * 0.45, -0.08, 0.08);
    return clamp(0.38 + phase * 0.44 + temperament, 0.3, 0.9);
  }

  _teammateCooperation(car) {
    const p = this.player;
    if (!car.isTeammate || !p || p.dnf || p.finished || p.spinning ||
        car.dnf || car.finished || car.spinning) return false;
    if (Math.abs(p.z - car.z) >= R3D.TEAM_HELP_Z) return false;
    if (Math.max(p.z, car.z) / R3D.TRACK_LEN >= R3D.TEAM_RACE_END) return false;

    const active = this.cars.filter(c => !c.dnf && !c.finished && !c.spinning);
    const frontCount = Math.max(3, Math.ceil(active.length * R3D.TEAM_FRONT_FRAC));
    const pAhead = active.filter(c => c !== p && c.z > p.z).length;
    const mateAhead = active.filter(c => c !== car && c.z > car.z).length;
    return pAhead >= frontCount && mateAhead >= frontCount;
  }

  _wantsTrain(car) {
    const lead = this._leadZ ?? Math.max(...this.cars.filter(c => !c.dnf && !c.finished).map(c => c.z));
    // Cooperation is a way to catch the leaders. Drivers contest the finish,
    // and drivers already in the leading group take their own opportunities.
    return lead - car.z > 65 && car.z / R3D.TRACK_LEN < 0.80 + (this.diff.racecraft || 0) * 0.07;
  }

  _laneSafe(car, x) {
    if (Math.abs(x) > R3D.HALF_W - 1.4) return false;
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
    const hw = R3D.HALF_W - 1.4;
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

    // Ahead: hold a steady line while the player pulls off our bumper.
    // Behind: follow smoothly only if the intended corridor is clear.
    car._helping = false;
    if (car.isTeammate) {
      const p = this.player, dz = p.z - car.z;
      if (this._teammateCooperation(car)) {
        car._helping = true;
        car._tactic = 'support';
        const target = dz > 0 ? clamp(p.x, -hw, hw) : car.x;
        if (dz <= 0 || this._laneSafe(car, target)) car.targetX = target;
        car.speed += (dz > 0 ? 8 : -2) * dt;
        return;
      }
      if (car._tactic === 'support') {
        car._tactic = null;
        car.tacticTimer = 0;
        car.laneTimer = 0;
      }
    }

    // Any driver will work with any useful partner, including the player.
    // Let an existing passing/avoidance move finish before seeking a new line.
    if (this._wantsTrain(car) && !(['pass', 'avoid', 'defend'].includes(car._tactic) && car.tacticTimer > 0)) {
      const partners = this.cars.filter(c => c !== car && !c.dnf && !c.finished && !c.spinning &&
        c.z > car.z && c.z - car.z < R3D.DRAFT_Z * 1.4 && Math.abs(c.x - car.x) < 6);
      const partner = partners.sort((a,b) =>
        (a.z-car.z + Math.abs(a.x-car.x)*12) - (b.z-car.z + Math.abs(b.x-car.x)*12))[0];
      const soloPace = R3D.SPEED_BASE * (0.86 + car.power * 0.15) * this.diff.aiSpeed;
      if (partner && partner.speed > soloPace - 8 && car.speed - partner.speed < 10) {
        if (Math.abs(partner.x - car.x) < .35 || this._laneSafe(car, partner.x)) {
          car.targetX = clamp(partner.x, -hw, hw);
          car._tactic = partner.z - car.z < R3D.PUSH_Z + 3 ? 'push' : 'join';
          car.tacticTimer = car.laneTimer = 0.8;
          return;
        }
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
    if (gap < 44 && hasRun && alternatives.length) {
      car.targetX = alternatives.sort((a, b) =>
        this._scoreLane(car, b, aggro) - this._scoreLane(car, a, aggro))[0];
      car._tactic = 'pass';
      car.tacticTimer = 3.8 - aggro * 0.8;
      car.laneTimer = car.tacticTimer;
      return;
    }

    const chaser = this.cars.find(c => c !== car && !c.dnf && !c.finished && !c.spinning &&
      car.z - c.z > 10 && car.z - c.z < R3D.BLOCK_Z &&
      c.speed > car.speed + 2 && Math.abs(c.x - car.x) > 0.7);
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

    const cooperating = new Set(active.filter(c => this._teammateCooperation(c)));
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
        const teammate = car.isTeammate ? car : other.isTeammate ? other : null;
        const teamLink = !!teammate && ((car.isTeammate && other.isPlayer) ||
          (car.isPlayer && other.isTeammate)) && cooperating.has(teammate);
        const bonus = R3D.PUSH_BONUS + (teamLink ? R3D.TEAM_PUSH_BONUS : 0);
        car.pushStrength = Math.max(car.pushStrength, wake.push);
        car._pushTarget = Math.max(car._pushTarget, wake.push * bonus);
        other.receivedPush = Math.max(other.receivedPush, wake.push * bonus * (teamLink ? 1 : 0.75));
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
      let target = Math.min(R3D.AERO_MAX,
        rawTarget * (car.isPlayer ? this.diff.playerDraft : 1));
      const before = car.draftMomentum || 0;
      const activeDraft = car.towStrength > 0.12 || car.pushStrength > 0.12 || car.receivedPush > 1;
      if (activeDraft) {
        car._draftCarryMomentum = before;
        car._draftCarryTimer = R3D.DRAFT_CARRY;
      } else if ((car._draftCarryTimer || 0) > 0 && (car._draftCarryMomentum || 0) > 8) {
        car._draftCarryTimer = Math.max(0, car._draftCarryTimer - dt);
        const carryFrac = car._draftCarryTimer / R3D.DRAFT_CARRY;
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
    const hw = R3D.HALF_W - 1.1;
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
              A.speed = Math.min(R3D.SPEED_MAX * 1.05, A.speed + give);
              B.speed = Math.max(40, B.speed - give * 0.65);
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
            const imp = (overlap * R3D.CONTACT_IMPULSE + closing * 2) * side * step * 0.5;
            const corr = Math.min((R3D.CAR_SEP_X - adx) * 0.5,
              R3D.SEP_X_RATE * step * 0.5) * side;
            A.x = clamp(A.x - dir * corr, -hw, hw);
            B.x = clamp(B.x + dir * corr, -hw, hw);
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
    if (severity > R3D.LAT_MAX * 0.95) {
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
    this.keys.a = this.keys.d = this.keys.s = false;
    this._physicsAcc = 0;
    const overlay  = document.getElementById('r3d-pause-overlay');
    const pauseBtn = document.getElementById('r3d-pause-btn');
    if (overlay)  overlay.classList.toggle('active', this.paused);
    if (pauseBtn) pauseBtn.textContent = this.paused ? 'RESUME' : 'PAUSE';
    if (!this.paused && this.clock) this.clock.getDelta();
  }

  _checkFinish() {
    const TL = R3D.TRACK_LEN;
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
      position: i + 1,
      dnf:      !!c.dnf,
    }));
  }

  _triggerWreck() {
    const p = this.player;
    // Budget for the player's closing speed even if the victim stops dead.
    const notice = Math.max(350, p.speed * R3D.WRECK_NOTICE);
    const lanes = [-6, 0, 6];
    const cands = this.cars.filter(c =>
      !c.isPlayer && !c.spinning && !c.finished && !c.dnf &&
      c.z > p.z + notice && c.z < R3D.TRACK_LEN - notice &&
      lanes.some(x => Math.abs(c.x - x) > 4 &&
        !this.wrecks.some(w => Math.abs(w.x - x) < 3 && Math.abs(w.z - c.z) < 100) &&
        !this.cars.some(o => o !== c && o.spinning && Math.abs(o.x - x) < 3 && Math.abs(o.z - c.z) < 100)));
    if (!cands.length) return;

    this.wreckCount++;
    const victim = cands[Math.floor(Math.random() * cands.length)];
    victim.spinning = true;
    victim.spinTimer = 4;
    victim.spinDir = Math.random() > 0.5 ? 1 : -1;
    victim.debrisTimer = 1.2;
    // Warn on initiation, not after a wall-clock timeout. The simulation timer
    // below stops during pause and cannot spawn debris in a subsequent race.
    this._warn('WRECK AHEAD - FIND A CLEAR LANE');
  }

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
    const Target = this.renderer.capabilities.isWebGL2
      ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget;
    this.mirrorRT = new Target(Math.max(2, w), Math.max(2, h), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
    });
    if (this.renderer.capabilities.isWebGL2) this.mirrorRT.samples = 4;
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
    const wrap = document.getElementById('r3d-mirror-wrap');
    if (!wrap || !this.scene || !this.mirrorCam || !this.renderer) return;
    const rect = wrap.getBoundingClientRect();
    const cr   = this.canvas.getBoundingClientRect();
    const mw = wrap.clientWidth;
    const mh = wrap.clientHeight;
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
    el.innerHTML = `<div class="r3d-order-head"><span>POS</span><span>LIVE ORDER</span></div>${rows}`;
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
    const dt = Math.min(this.clock.getDelta(), 0.1);
    // Fixed steps keep contact and steering consistent at 30/60/120Hz.
    this._physicsAcc += dt;
    while (this._physicsAcc >= 1 / 120) {
      this._update(1 / 120);
      this._physicsAcc -= 1 / 120;
    }
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
