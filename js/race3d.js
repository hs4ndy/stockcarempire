// ============================================================
// STOCK CAR EMPIRE — 3D Race Engine (Three.js r134)
// Straight-line superspeedway drafting race
// Controls: A = left, D = right, S = brake, auto-forward
// ============================================================

const R3D = {
  TRACK_LEN:      15000,  // long superspeedway — ~90 sec race
  TRACK_W:        22,
  HALF_W:         11,
  SPEED_BASE:     175,    // units/sec nominal forward speed
  SPEED_MAX:      268,    // absolute max
  ACCEL:          1.6,    // forward accel lerp — lower = smoother speed changes
  BRAKE_FORCE:    140,    // speed loss when braking (units/sec²)
  LAT_ACC:        80,     // lateral acceleration (units/sec²)
  LAT_MAX:        13,     // max lateral speed (units/sec)
  LAT_DAMP:       0.0005, // damping when key released
  DRAFT_Z:        48,     // draft cone depth — extended so cars pack up earlier
  DRAFT_X:        4.2,    // draft cone width
  DRAFT_BOOST:    36,     // max speed bonus at bumper
  DRAFT_SLING:    5.5,    // momentum decay/sec — slightly slower bleed for tighter packs
  PUSH_Z:         5.2,    // bumper-to-bumper push distance
  PUSH_X:         1.8,    // lateral tolerance for locked push
  PUSH_BONUS:     7,      // ≈+5 mph when locked bumpers (modest and realistic)
  CHAIN_PER_CAR:  4,      // extra speed units per additional car in a consecutive chain
  ENDGAME_FRAC:   0.75,   // fraction of track where AI goes full-attack mode
  RUBBER_BAND:    10,     // max extra speed for last-place player (halved)
  WRECK_FIRST:    50,
  WRECK_MIN:      65,
  WRECK_MAX:      120,
  MAX_WRECKS:     2,
  SPIN_CHANCE:    0.02,   // 2% — rubbing is racing
  BUMP_DEBOUNCE:  0.9,
  CAR_SEP_X:      2.15,   // minimum lateral gap between cars
  CAR_SEP_Z:      4.6,    // minimum z gap
  GRID_SPACING:   28,
  PACE_SPEED:     65,
};

// ─── Public launcher ─────────────────────────────────────────
function launch3DRace(config, onComplete) {
  const container = document.getElementById('race-3d-container');
  if (!container) { console.error('race-3d-container not found'); return; }

  // Destroy any previous race engine
  if (window._r3d) { try { window._r3d.destroy(); } catch(_) {} window._r3d = null; }

  container.innerHTML = `
    <canvas id="r3d-canvas" style="display:block;width:100%;height:100%"></canvas>
    <div id="r3d-hud">
      <div class="r3d-top-bar">
        <div class="r3d-chip" id="r3d-pos">P—</div>
        <div class="r3d-draft-badge" id="r3d-draft">⚡ SLIPSTREAM</div>
        <div class="r3d-chip" id="r3d-speed">— mph</div>
      </div>
      <div id="r3d-mirror-wrap">
        <div class="r3d-mirror-label">◀ REAR VIEW ▶</div>
      </div>
      <div class="r3d-progress-wrap">
        <div class="r3d-progress-fill" id="r3d-prog-fill"></div>
        <div class="r3d-progress-label">FINISH</div>
      </div>
      <div class="r3d-warning hidden" id="r3d-warn"></div>
      <div class="r3d-countdown" id="r3d-countdown"></div>
      <div class="r3d-finish" id="r3d-finish" style="display:none"></div>
    </div>
    <div class="r3d-controls-hint" id="r3d-hint">
      <span>A</span> Steer Left &nbsp;|&nbsp; <span>D</span> Steer Right &nbsp;|&nbsp; <span>S</span> Brake
    </div>
  `;

  const canvas = document.getElementById('r3d-canvas');

  // Wait one animation frame so the container has settled its layout dimensions
  requestAnimationFrame(() => {
    const w = container.clientWidth  || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    canvas.width  = w;
    canvas.height = h;
    window._r3d = new Race3DEngine(canvas, config, onComplete);
  });

  // Wire finish button
  window._r3dFinish = (pos) => {
    if (window._r3d) { try { window._r3d.destroy(); } catch(_) {} window._r3d = null; }
    onComplete(pos);
  };
}

// ─── Race Engine ──────────────────────────────────────────────
class Race3DEngine {
  constructor(canvas, config, onComplete) {
    this.canvas      = canvas;
    this.config      = config;
    this.onComplete  = onComplete;
    this.keys        = { a: false, d: false, s: false };
    this.cars        = [];
    this.player      = null;
    this.wrecks      = [];         // { x, z }
    this.wreckCount  = 0;
    this.wreckCooldown = R3D.WRECK_FIRST;
    this.camShake    = 0;
    this.racing      = false;
    this.paceMode    = false;
    this.paceBraking = false;
    this.done        = false;
    this.finishOrder = [];
    this._raf        = null;
    this._warnTimeout = null;
    this._dummy      = new THREE.Object3D(); // for InstancedMesh matrix math

    this._init();
  }

  // ── Scene setup ──────────────────────────────────────────────
  _init() {
    const c = this.canvas;
    const w = c.width  || window.innerWidth;
    const h = c.height || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x6aa9d8);
    this.scene.fog = new THREE.FogExp2(0x9abfdb, 0.0012);

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.5, 3000);
    this.camera.position.set(0, 5, -12);

    // Rear-view mirror camera (wide, looks backward)
    this.mirrorCam = new THREE.PerspectiveCamera(75, 3.5, 0.5, 1200);
    this.mirrorCam.position.set(0, 4, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(amb);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.1);
    sun.position.set(80, 200, 100);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left   = -300;
    sun.shadow.camera.right  =  300;
    sun.shadow.camera.top    =  300;
    sun.shadow.camera.bottom = -300;
    sun.shadow.camera.far    = 2000;
    this.scene.add(sun);

    this.scene.add(new THREE.HemisphereLight(0xb0d8ff, 0x4a7a3a, 0.35));

    this._buildTrack();
    this._buildEnvironment();
    this._buildCars();

    // Input
    this._kd = e => {
      const k = e.key.toLowerCase();
      if (k === 'a') this.keys.a = true;
      if (k === 'd') this.keys.d = true;
      if (k === 's') this.keys.s = true;
    };
    this._ku = e => {
      const k = e.key.toLowerCase();
      if (k === 'a') this.keys.a = false;
      if (k === 'd') this.keys.d = false;
      if (k === 's') this.keys.s = false;
    };
    document.addEventListener('keydown', this._kd);
    document.addEventListener('keyup',   this._ku);

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

  // ── Track geometry (InstancedMesh for repeated elements) ─────
  _buildTrack() {
    const s   = this.scene;
    const TL  = R3D.TRACK_LEN;
    const TW  = R3D.TRACK_W;
    const d   = this._dummy;

    // Asphalt — single large plane
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(TW, TL + 80),
      new THREE.MeshLambertMaterial({ color: 0x2a2a2a })
    );
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.set(0, 0, TL / 2);
    asphalt.receiveShadow = true;
    s.add(asphalt);

    // Grass either side
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x3d8b47 });
    [-1, 1].forEach(side => {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(600, TL + 200), grassMat);
      g.rotation.x = -Math.PI / 2;
      g.position.set(side * (TW / 2 + 300), -0.02, TL / 2);
      s.add(g);
    });

    // ── Lane dashes — InstancedMesh (1 draw call) ──────────────
    // 3 lanes × floor(TL/24) dashes each
    const DASH_STEP  = 24;
    const DASH_COUNT = Math.floor(TL / DASH_STEP); // ~375 per lane
    const TOTAL_DASHES = 3 * DASH_COUNT;
    const dashMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.22, 0.025, 11),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      TOTAL_DASHES
    );
    dashMesh.receiveShadow = false;
    let di = 0;
    [-TW / 4, 0, TW / 4].forEach(lx => {
      for (let z = 10; z < TL - 10; z += DASH_STEP) {
        d.position.set(lx, 0.014, z + 5.5);
        d.rotation.set(0, 0, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        dashMesh.setMatrixAt(di++, d.matrix);
      }
    });
    dashMesh.instanceMatrix.needsUpdate = true;
    s.add(dashMesh);

    // Solid edge lines (just two long boxes, cheap)
    const edgeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    [-(TW / 2 - 0.35), TW / 2 - 0.35].forEach(lx => {
      const el = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.025, TL), edgeMat);
      el.position.set(lx, 0.013, TL / 2);
      s.add(el);
    });

    // ── Barriers — solid long boxes (2 draw calls) ──────────────
    const barrierMat = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 });
    [-(TW / 2 + 1.0), TW / 2 + 1.0].forEach(bx => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, TL + 20), barrierMat);
      bar.position.set(bx, 0.55, TL / 2);
      s.add(bar);
    });

    // ── Barrier stripes — InstancedMesh ─────────────────────────
    const STRIPE_STEP  = 10;
    const STRIPE_COUNT = Math.floor(TL / STRIPE_STEP);
    const stripeGeom   = new THREE.BoxGeometry(1.52, 0.22, 4.5);

    [-(TW / 2 + 1.0), TW / 2 + 1.0].forEach((bx, side) => {
      const redMesh   = new THREE.InstancedMesh(stripeGeom,
        new THREE.MeshLambertMaterial({ color: 0xdd2222 }), Math.ceil(STRIPE_COUNT / 2));
      const whiteMesh = new THREE.InstancedMesh(stripeGeom,
        new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.floor(STRIPE_COUNT / 2));
      let ri = 0, wi = 0;

      for (let si = 0; si < STRIPE_COUNT; si++) {
        const z = si * STRIPE_STEP + 2.25;
        d.position.set(bx, 0.66, z);
        d.rotation.set(0, 0, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        if (si % 2 === 0) redMesh.setMatrixAt(ri++, d.matrix);
        else              whiteMesh.setMatrixAt(wi++, d.matrix);
      }
      redMesh.instanceMatrix.needsUpdate   = true;
      whiteMesh.instanceMatrix.needsUpdate = true;
      s.add(redMesh);
      s.add(whiteMesh);
    });

    // ── Finish line — InstancedMesh checkerboard ─────────────────
    const COLS = 14;
    const CW   = TW / COLS;
    const ROWS = 2;
    const checkMeshes = [
      new THREE.InstancedMesh(new THREE.BoxGeometry(CW - 0.04, 0.03, 2.8),
        new THREE.MeshLambertMaterial({ color: 0xffffff }), COLS * ROWS),
      new THREE.InstancedMesh(new THREE.BoxGeometry(CW - 0.04, 0.03, 2.8),
        new THREE.MeshLambertMaterial({ color: 0x000000 }), COLS * ROWS),
    ];
    let checkIdx = [0, 0];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const which = (col + row) % 2;
        d.position.set(-TW / 2 + CW / 2 + col * CW, 0.016, TL - 4.2 + row * 2.8);
        d.rotation.set(0, 0, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        checkMeshes[which].setMatrixAt(checkIdx[which]++, d.matrix);
      }
    }
    checkMeshes.forEach(m => { m.instanceMatrix.needsUpdate = true; s.add(m); });

    // Finish gantry
    const postMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    [-(TW / 2 + 2), TW / 2 + 2].forEach(px => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 0.5), postMat);
      post.position.set(px, 6, TL - 2.8);
      s.add(post);
    });
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(TW + 6, 0.5, 0.5), postMat);
    gantry.position.set(0, 12, TL - 2.8);
    s.add(gantry);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(TW + 5, 1.8, 0.22),
      new THREE.MeshLambertMaterial({ color: 0xff2222 }));
    banner.position.set(0, 10, TL - 2.8);
    s.add(banner);

    // ── Starting grid markers — InstancedMesh ───────────────────
    const GRID_ROWS = 16;
    const gridMesh  = new THREE.InstancedMesh(
      new THREE.BoxGeometry(TW, 0.025, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xffaa00 }),
      GRID_ROWS
    );
    for (let row = 0; row < GRID_ROWS; row++) {
      d.position.set(0, 0.013, row * R3D.GRID_SPACING + 0.25);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      gridMesh.setMatrixAt(row, d.matrix);
    }
    gridMesh.instanceMatrix.needsUpdate = true;
    s.add(gridMesh);
  }

  // ── Environment ──────────────────────────────────────────────
  _buildEnvironment() {
    const s    = this.scene;
    const TL   = R3D.TRACK_LEN;
    const TW   = R3D.TRACK_W;
    const side = TW / 2 + 3;
    const d    = this._dummy;

    // Sides are open grass — no bleacher strips

    // ── Light poles — InstancedMesh ─────────────────────────────
    const POLE_STEP  = 180;
    const POLE_COUNT = Math.floor(TL / POLE_STEP);
    const poleMesh   = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.45, 22, 0.45),
      new THREE.MeshLambertMaterial({ color: 0x888888 }),
      POLE_COUNT * 2
    );
    const armMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(7, 0.4, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x888888 }),
      POLE_COUNT * 2
    );
    const lightMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(6.5, 0.6, 0.6),
      new THREE.MeshLambertMaterial({ color: 0xfffce0, emissive: 0x887860 }),
      POLE_COUNT * 2
    );
    let pi = 0;
    for (let z = 150; z < TL - 100; z += POLE_STEP) {
      [-1, 1].forEach(sx => {
        const px = sx * (side + 9);
        d.position.set(px, 11, z); d.rotation.set(0,0,0); d.scale.set(1,1,1); d.updateMatrix();
        poleMesh.setMatrixAt(pi, d.matrix);
        d.position.set(px - sx * 2.5, 22, z); d.updateMatrix();
        armMesh.setMatrixAt(pi, d.matrix);
        d.position.set(px - sx * 2.5, 22.5, z); d.updateMatrix();
        lightMesh.setMatrixAt(pi, d.matrix);
        pi++;
      });
    }
    poleMesh.instanceMatrix.needsUpdate  = true;
    armMesh.instanceMatrix.needsUpdate   = true;
    lightMesh.instanceMatrix.needsUpdate = true;
    s.add(poleMesh); s.add(armMesh); s.add(lightMesh);

    // Pit wall banners (left side only, not instanced since few)
    const bannerColors = [0xe8001d, 0x0055ff, 0x00aa44, 0xffaa00, 0xaa00ff];
    for (let z = 80; z < TL - 80; z += 160) {
      const bm = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.75, 60),
        new THREE.MeshLambertMaterial({ color: bannerColors[(z / 160 | 0) % bannerColors.length] })
      );
      bm.position.set(-(R3D.TRACK_W / 2 + 1.0), 1.15, z);
      s.add(bm);
    }
  }

  // ── Cars ─────────────────────────────────────────────────────
  _buildCars() {
    const { config } = this;
    const fieldSize  = Math.min(config.aiEntries.length + 1, config.fieldSize);

    // Build 2-wide grid slots
    const slots = [];
    for (let r = 0; r < Math.ceil(fieldSize / 2); r++) {
      slots.push({ x: -3.5, z: r * R3D.GRID_SPACING });
      slots.push({ x:  3.5, z: r * R3D.GRID_SPACING });
    }

    // Player slot: mid-pack based on power
    const playerSlotIdx = clamp(
      Math.round((1 - config.playerPower) * fieldSize * 0.5 + 2),
      0, slots.length - 1
    );
    const ps = slots[playerSlotIdx];
    this.player = this._makeCar(ps.x, ps.z, {
      color: config.playerColor || '#e8001d',
      power: config.playerPower,
      isPlayer: true,
      label: 'YOU',
    });
    this.cars.push(this.player);

    // AI cars
    let aiIdx = 0;
    for (let i = 0; i < slots.length && aiIdx < config.aiEntries.length; i++) {
      if (i === playerSlotIdx) continue;
      const entry = config.aiEntries[aiIdx++];
      const slot  = slots[i];
      this.cars.push(this._makeCar(slot.x, slot.z, {
        color:    entry.color,
        power:    clamp(entry.power, 0.25, 0.95),
        isPlayer: false,
        label:    entry.name,
      }));
    }
  }

  _makeCar(x, z, { color, power, isPlayer, label }) {
    const hex = typeof color === 'string' ? parseInt(color.replace('#',''), 16) : color;
    const g   = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color: hex });
    const body    = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.62, 4.5), bodyMat);
    body.position.y = 0.41;
    body.castShadow = true;
    g.add(body);

    const roofMat = new THREE.MeshLambertMaterial({ color: Math.max(0, hex - 0x3a2a1a) });
    const roof    = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.38, 1.75), roofMat);
    roof.position.set(0, 0.95, -0.05);
    g.add(roof);

    const wsMat = new THREE.MeshLambertMaterial({ color: 0x99c0e8, transparent: true, opacity: 0.75 });
    const ws    = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.36, 0.12), wsMat);
    ws.position.set(0, 0.83, -0.88);
    ws.rotation.x = -0.32;
    g.add(ws);

    const spMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const sp    = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.52), spMat);
    sp.position.set(0, 1.06, 2.05);
    g.add(sp);
    [-0.75, 0.75].forEach(sx => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), spMat);
      strut.position.set(sx, 0.83, 2.05);
      g.add(strut);
    });

    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.4), spMat);
    splitter.position.set(0, 0.12, -2.3);
    g.add(splitter);

    const tireMat = new THREE.MeshLambertMaterial({ color: 0x181818 });
    const rimMat  = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });
    [[-1.18,0.36,-1.45],[1.18,0.36,-1.45],[-1.18,0.36,1.45],[1.18,0.36,1.45]].forEach(([wx,wy,wz])=>{
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.36,0.3,10), tireMat);
      tire.rotation.z = Math.PI/2; tire.position.set(wx,wy,wz); tire.castShadow=true; g.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.31,8), rimMat);
      rim.rotation.z = Math.PI/2; rim.position.set(wx,wy,wz); g.add(rim);
    });


    const glowMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0 });
    const glow    = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 5.5), glowMat);
    glow.position.set(0, 0.5, 0);
    g.add(glow);

    g.position.set(x, 0, z);
    g.rotation.y = Math.PI; // nose faces +Z (direction of travel); spoiler faces camera
    this.scene.add(g);

    return {
      mesh:         g,
      glowMat,
      isPlayer,
      power,
      label,
      hex,
      x, z,
      lv:              0,       // lateral velocity (units/sec)
      speed:           R3D.SPEED_BASE * (0.78 + power * 0.22),
      targetX:         x,
      spinning:        false,
      spinTimer:       0,
      spinDir:         1,
      finished:        false,
      dnf:             false,
      draftBoost:      0,
      draftMomentum:   0,    // retained draft energy for slingshot
      laneTimer:       Math.random() * 4,
      contactCooldown: 0,    // debounce for collision with player
    };
  }

  // ── Rolling start sequence ───────────────────────────────────
  // Cars roll at PACE_SPEED the entire time — no stopping.
  // Phase 1 (3 s): "FORMATION LAP" — field rolls in grid order
  // Phase 2 (3 s): 3-2-1 countdown while still rolling
  // Green flag: paceMode ends, racing = true, cars accelerate freely
  _countdown() {
    const el   = document.getElementById('r3d-countdown');
    const hint = document.getElementById('r3d-hint');

    this.paceMode = true; // cars roll at PACE_SPEED throughout

    const setMsg = (txt, big = false) => {
      if (!el) return;
      el.textContent     = txt;
      el.style.opacity   = '1';
      el.style.fontSize  = big ? '1.35rem' : '';
      el.style.letterSpacing = big ? '0.1em' : '';
      el.classList.remove('go');
    };

    setMsg('FORMATION LAP', true);

    // After 3 s, start countdown (cars still rolling)
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
              el.textContent     = 'GREEN FLAG!';
              el.style.fontSize  = '';
              el.style.letterSpacing = '';
              el.classList.add('go');
            }
            this.paceMode = false;
            this.racing   = true;
            if (hint) hint.style.opacity = '0';
            setTimeout(() => { if (el) el.style.opacity = '0'; }, 1100);
          }, 1000);
        }, 1000);
      }, 1000);
    }, 3000);
  }

  // ── Main update ──────────────────────────────────────────────
  _update(dt) {
    // During rolling start, all cars pace — player can steer
    if (this.paceMode) {
      this._updatePaceLap(dt);
      this._updateCamera(dt);
      this._updateHUD();
      return;
    }
    if (!this.racing || this.done) return;

    // Clear push-lock flags before physics step
    for (const c of this.cars) c._pushLocked = false;
    this._updatePlayer(dt);
    this._updateAI(dt);
    this._calcDraft(dt);
    this._calcChainBonus();  // chain of N cars drafting = faster for everyone
    this._separateCars();    // prevent cars clipping through each other
    this._checkCollisions();
    this._checkFinish();
    this._updateCamera(dt);
    this._updateHUD();

    // Wreck scheduling — more wrecks in endgame from aggressive AI
    const endgameGlobal = this.player.z / R3D.TRACK_LEN >= R3D.ENDGAME_FRAC;
    const maxWrecks = endgameGlobal ? R3D.MAX_WRECKS + 2 : R3D.MAX_WRECKS;
    if (this.wreckCount < maxWrecks) {
      this.wreckCooldown -= dt;
      if (this.wreckCooldown <= 0) {
        this._triggerWreck();
        // Wrecks come faster in endgame
        const minCD = endgameGlobal ? R3D.WRECK_MIN * 0.5 : R3D.WRECK_MIN;
        const maxCD = endgameGlobal ? R3D.WRECK_MAX * 0.6 : R3D.WRECK_MAX;
        this.wreckCooldown = minCD + Math.random() * (maxCD - minCD);
      }
    }
  }

  // ── Formation / pace lap movement ────────────────────────────
  _updatePaceLap(dt) {
    const hw = R3D.HALF_W - 1.2;
    const p  = this.player;

    // Player can steer laterally during formation lap
    // A = left = +X (world), D = right = -X (world) — camera is looking in +Z so world +X = screen left
    if      (this.keys.a) p.lv += R3D.LAT_ACC * 0.6 * dt;
    else if (this.keys.d) p.lv -= R3D.LAT_ACC * 0.6 * dt;
    else                  p.lv *= Math.pow(R3D.LAT_DAMP, dt);
    p.lv = clamp(p.lv, -R3D.LAT_MAX * 0.6, R3D.LAT_MAX * 0.6);
    p.x  = clamp(p.x + p.lv * dt, -hw, hw);

    // All cars (including player) roll at PACE_SPEED
    for (const car of this.cars) {
      car.speed += (R3D.PACE_SPEED - car.speed) * Math.min(1, dt * 3.0);
      car.z     += car.speed * dt;
      car.mesh.position.set(car.x, 0, car.z);
    }
    // Sync player mesh x (already updated above)
    p.mesh.position.set(p.x, 0, p.z);
  }

  _updatePlayer(dt) {
    const p  = this.player;
    const hw = R3D.HALF_W - 1.2;

    if (p.spinning) {
      p.spinTimer -= dt;
      p.mesh.rotation.y += p.spinDir * 4.5 * dt;
      p.speed = Math.max(15, p.speed - 120 * dt);
      p.z    += p.speed * dt;
      p.mesh.position.z = p.z;
      if (p.spinTimer <= 0) {
        p.spinning = false;
        p.mesh.rotation.y = 0;
      }
      return;
    }

    // ── Lateral steering ──────────────────────────────────────
    // A = left = +X (world), D = right = -X (world) — camera looks in +Z so world +X = screen left
    if      (this.keys.a) p.lv += R3D.LAT_ACC * dt;
    else if (this.keys.d) p.lv -= R3D.LAT_ACC * dt;
    else                  p.lv *= Math.pow(R3D.LAT_DAMP, dt);

    p.lv = clamp(p.lv, -R3D.LAT_MAX, R3D.LAT_MAX);
    p.x  = clamp(p.x + p.lv * dt, -hw, hw);

    // Wall bounce
    if (Math.abs(p.x) >= hw - 0.05) {
      p.lv    = -p.lv * 0.28;               // gentle bounce
      p.speed = Math.max(p.speed * 0.88, 80); // only ~12% speed scrub
      this.camShake = Math.max(this.camShake, 0.35);
      this._warn('⚠️  WALL BRUSH!');
    }

    // ── Forward speed ─────────────────────────────────────────
    // Rubber band: player gets speed bonus proportional to how far back they are
    const activeCount = this.cars.filter(c => !c.dnf && !c.finished).length;
    const aheadCount  = this.cars.filter(c => !c.dnf && !c.finished && c.z > p.z).length;
    const posFrac     = activeCount > 1 ? aheadCount / (activeCount - 1) : 0; // 0=P1, 1=last
    const rubberBand  = posFrac * R3D.RUBBER_BAND;

    const tgt = Math.min(
      R3D.SPEED_BASE * (0.84 + p.power * 0.18) + p.draftBoost + rubberBand,
      R3D.SPEED_MAX
    );
    if (this.keys.s) {
      p.speed = Math.max(tgt * 0.38, p.speed - R3D.BRAKE_FORCE * dt);
    } else {
      p.speed += (tgt - p.speed) * Math.min(1, dt * R3D.ACCEL);
    }

    p.z += p.speed * dt;
    p.mesh.position.set(p.x, 0, p.z);

    // Body roll: turning left (A/+X world) → lean left; turning right (D/-X world) → lean right
    const roll = this.keys.a ? -0.05 : this.keys.d ? 0.05 : 0;
    p.mesh.rotation.z += (roll - p.mesh.rotation.z) * 0.12;
  }

  _updateAI(dt) {
    for (const car of this.cars) {
      if (car.isPlayer) continue;

      // Update contact cooldown
      if (car.contactCooldown > 0) car.contactCooldown -= dt;

      if (car.finished) continue;

      if (car.dnf) {
        car.mesh.rotation.y += 0.35 * dt;
        continue;
      }
      if (car.spinning) {
        car.spinTimer -= dt;
        car.mesh.rotation.y += car.spinDir * 3.5 * dt;
        car.speed = Math.max(8, car.speed - 70 * dt);
        car.z    += car.speed * dt;
        car.mesh.position.z = car.z;
        if (car.spinTimer <= 0) {
          car.dnf     = true;
          car.spinning = false;
        }
        continue;
      }

      // Endgame detection
      const progress = car.z / R3D.TRACK_LEN;
      const endgame  = progress >= R3D.ENDGAME_FRAC;

      // Lane decision — draft-seek first, otherwise small drift every 2.5–6 sec
      // Push-locked cars skip lane decisions (prevents twitching while bumper-locked)
      car.laneTimer -= dt;

      if (!car._pushLocked) {
        // Find best car directly ahead to draft or pass
        let bestDraftX = null, bestDraftDz = Infinity;
        let carAhead = null;
        for (const other of this.cars) {
          if (other === car || other.dnf || other.finished) continue;
          const dz = other.z - car.z;
          if (dz > 0 && dz < 70 && Math.abs(other.x - car.x) < 5.0) {
            if (dz < bestDraftDz) { bestDraftDz = dz; bestDraftX = other.x; carAhead = other; }
          }
        }

        const laneTimerBase = endgame ? 0.4 + Math.random() * 1.0 : 2.5 + Math.random() * 3.5;
        const hw = R3D.HALF_W - 1.4;

        if (car.laneTimer <= 0) {
          car.laneTimer = laneTimerBase;
          const nearWreck = this.wrecks.find(w =>
            w.z > car.z && w.z < car.z + 55 && Math.abs(w.x - car.x) < 5.5
          );

          if (nearWreck) {
            const dir = nearWreck.x > 0 ? -1 : 1;
            car.targetX = clamp(nearWreck.x + dir * 8, -hw, hw);
          } else if (endgame && carAhead !== null && Math.random() < 0.70) {
            // ENDGAME: attempt to pass — go wide or inside of car ahead
            const passDir = Math.random() < 0.5 ? 1 : -1;
            const passX   = carAhead.x + passDir * (R3D.CAR_SEP_X + 0.8 + Math.random() * 1.5);
            car.targetX   = clamp(passX, -hw, hw);
          } else if (endgame && Math.random() < 0.35) {
            // Endgame: wild aggressive lane change to find clear air or block
            car.targetX = clamp(car.x + (Math.random() - 0.5) * 8, -hw, hw);
          } else if (bestDraftX !== null && Math.random() < (endgame ? 0.55 : 0.82)) {
            // Seek draft
            car.targetX = clamp(bestDraftX + (Math.random() - 0.5) * 0.8, -hw, hw);
          } else {
            const drift = endgame ? (Math.random() - 0.5) * 5 : (Math.random() - 0.5) * 3;
            car.targetX = clamp(car.x + drift, -hw, hw);
          }
        } else if (bestDraftX !== null && !endgame) {
          // Continuously nudge toward draft target during normal racing
          car.targetX += (bestDraftX - car.targetX) * Math.min(1, dt * 0.9);
          car.targetX  = clamp(car.targetX, -hw, hw);
        }
      }

      // Tighter speed spread so cars stay in a pack; faster alignment to target
      const tgt = Math.min(R3D.SPEED_BASE * (0.79 + car.power * 0.23) + car.draftBoost, R3D.SPEED_MAX);
      const latSpeed = endgame ? 5.5 : 4.0; // faster lateral movement in endgame
      car.speed += (tgt - car.speed) * Math.min(1, dt * 2.2);
      car.x     += (car.targetX - car.x) * Math.min(1, dt * latSpeed);
      car.z     += car.speed * dt;
      car.mesh.position.set(car.x, 0, car.z);
    }
  }

  _calcDraft(dt) {
    for (const car of this.cars) {
      if (car.dnf || car.finished) { car.draftBoost = 0; car.draftMomentum = 0; continue; }

      // ── Live draft intensity from car(s) ahead ─────────────
      let liveBoost = 0;
      let pushing   = false;
      for (const other of this.cars) {
        if (other === car || other.dnf || other.finished) continue;
        const dz = other.z - car.z;
        const dx = Math.abs(other.x - car.x);
        if (dz <= 0) continue;

        // Push draft: bumper-to-bumper physical contact zone
        if (dz < R3D.PUSH_Z && dx < R3D.PUSH_X) {
          liveBoost = Math.max(liveBoost, R3D.DRAFT_BOOST + R3D.PUSH_BONUS);
          pushing = true;
          // Pushed car also benefits (it's being shoved forward)
          if (!other._pushBoosted) {
            other._pushBoosted = true;
            other.draftBoost = Math.max(other.draftBoost || 0, R3D.PUSH_BONUS * 0.7);
          }
          continue;
        }

        // Normal slipstream cone
        if (dz > R3D.DRAFT_Z || dx > R3D.DRAFT_X) continue;
        const intensity = 1 - (dz / R3D.DRAFT_Z);
        liveBoost = Math.max(liveBoost, intensity * R3D.DRAFT_BOOST);
      }
      car._pushBoosted = false; // reset for next frame

      // ── Slingshot momentum — builds instantly, decays slowly ─
      if (liveBoost > car.draftMomentum) {
        car.draftMomentum = liveBoost;                              // instant pickup
      } else {
        car.draftMomentum = Math.max(0,
          car.draftMomentum - R3D.DRAFT_SLING * dt);               // gradual bleed-off
      }
      car.draftBoost = car.draftMomentum;

      // Glow: push = orange, draft = blue; intensity scales with momentum
      if (car.glowMat) {
        const frac = car.draftMomentum / (R3D.DRAFT_BOOST + R3D.PUSH_BONUS);
        car.glowMat.opacity = frac * 0.30;
        car.glowMat.color.setHex(pushing ? 0xff8800 : 0x44aaff);
      }
    }
  }

  // ── Chain draft bonus — a line of N cars drafts faster ───────
  _calcChainBonus() {
    // Sort active cars front-to-back (highest Z first)
    const active = this.cars
      .filter(c => !c.dnf && !c.finished)
      .sort((a, b) => b.z - a.z);

    if (active.length < 2) return;

    // Walk the sorted list and find consecutive chains
    let chainStart = 0;
    for (let i = 0; i <= active.length; i++) {
      const inChain = i < active.length && i > 0 &&
        (active[i - 1].z - active[i].z) < R3D.DRAFT_Z &&
        Math.abs(active[i - 1].x - active[i].x) < R3D.DRAFT_X;

      if (!inChain || i === active.length) {
        // Chain ended — apply bonus to all cars in this chain segment
        const len = i - chainStart;
        if (len >= 2) {
          // Extra speed per additional car in chain: chain of 9 = +32 over baseline draft
          const bonus = (len - 1) * R3D.CHAIN_PER_CAR;
          for (let k = chainStart; k < i; k++) {
            active[k].draftBoost = Math.min(
              active[k].draftBoost + bonus,
              R3D.DRAFT_BOOST + R3D.PUSH_BONUS + (len - 1) * R3D.CHAIN_PER_CAR
            );
          }
        }
        chainStart = i;
      }
    }
  }

  // ── Physical separation — hard impenetrable constraints ──────
  // Two passes: sort front-to-back so z-corrections propagate down the chain
  // without needing many iterations.
  _separateCars() {
    const active = this.cars.filter(c => !c.finished && !c.dnf && !c.spinning);
    const hw = R3D.HALF_W - 1.1;

    for (let pass = 0; pass < 2; pass++) {
      // Re-sort each pass so newly-corrected positions propagate correctly
      active.sort((a, b) => b.z - a.z); // front (highest z) first

      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const A = active[i]; // ahead  (higher z)
          const B = active[j]; // behind (lower z)

          const dz  = A.z - B.z;          // z gap (positive = A ahead)
          const dx  = B.x - A.x;          // lateral offset B relative to A
          const adx = Math.abs(dx);

          // Skip if no overlap in both dimensions simultaneously
          if (dz  >= R3D.CAR_SEP_Z) continue;
          if (adx >= R3D.CAR_SEP_X) continue;

          // ── Z: hard impenetrable bumper ───────────────────────
          // B cannot be closer than CAR_SEP_Z behind A — ever.
          // Hard-set B's position; speed transfer makes the push feel physical.
          B.z = A.z - R3D.CAR_SEP_Z;
          B.mesh.position.z = B.z;
          B._pushLocked = true;
          A._pushLocked = true;

          // Speed transfer: B shoves A forward; bleed B's speed so it can't re-penetrate
          const diff = B.speed - A.speed;
          if (diff > 0) {
            A.speed = Math.min(R3D.SPEED_MAX, A.speed + diff * 0.30);
            B.speed = B.speed - diff * 0.08;
          }

          // ── X: push cars apart laterally if side-by-side ─────
          if (adx > 0.01) {
            const overlap = (R3D.CAR_SEP_X - adx) * 0.5;
            const dir = dx > 0 ? 1 : -1; // direction from A toward B
            A.x = clamp(A.x - dir * overlap, -hw, hw);
            B.x = clamp(B.x + dir * overlap, -hw, hw);
            A.mesh.position.x = A.x;
            B.mesh.position.x = B.x;

            if (A.isPlayer) A.lv = clamp(A.lv - dir * 1.0, -R3D.LAT_MAX, R3D.LAT_MAX);
            else            A.targetX = clamp(A.x - dir * 1.5, -hw, hw);
            if (B.isPlayer) B.lv = clamp(B.lv + dir * 1.0, -R3D.LAT_MAX, R3D.LAT_MAX);
            else            B.targetX = clamp(B.x + dir * 1.5, -hw, hw);
          }
        }
      }
    }
  }

  _checkCollisions() {
    const p = this.player;
    if (p.spinning || p.finished) return;

    // Car-to-car — rubbing is racing; small random chance of spin
    for (const car of this.cars) {
      if (car === p || car.finished) continue;
      if (Math.abs(p.x - car.x) < 1.9 && Math.abs(p.z - car.z) < 4.2) {
        if (car.contactCooldown <= 0) {
          car.contactCooldown = R3D.BUMP_DEBOUNCE;
          const pushDir = car.x < p.x ? 1 : -1; // push player away from AI car
          this._bumpPlayer(pushDir);
        }
        return;
      }
    }

    // Wreck debris — immediate spin
    for (const w of this.wrecks) {
      if (Math.abs(p.x - w.x) < 2.4 && Math.abs(p.z - w.z) < 2.8) {
        this._spinPlayer(2.0, Math.sign(p.lv) || 1, 1.5);
        this._warn('⚠️  HIT WRECK!');
        return;
      }
    }
  }

  _bumpPlayer(pushDir) {
    const p = this.player;
    if (p.spinning) return;

    // Light push and minimal speed loss — rubbing/blocking is legal
    p.lv    = clamp(p.lv + pushDir * 3.5, -R3D.LAT_MAX, R3D.LAT_MAX);
    p.speed = Math.max(p.speed * 0.96, 80);
    this.camShake = Math.max(this.camShake, 0.2);

    // 2% chance to spin — rubbing and blocking are legal moves
    if (Math.random() < R3D.SPIN_CHANCE) {
      this._spinPlayer(1.6, pushDir, 1.1);
      this._warn('⚠️  SPIN OUT!');
    }
    // (no warning for routine contact — it would be constant noise)
  }

  _spinPlayer(duration, dir, shake) {
    const p = this.player;
    if (p.spinning) return;
    p.spinning  = true;
    p.spinTimer = duration;
    p.spinDir   = dir || 1;
    p.speed     = 20;
    this.camShake = Math.max(this.camShake, shake);
  }

  _checkFinish() {
    const TL = R3D.TRACK_LEN;
    for (const car of this.cars) {
      if (!car.finished && car.z >= TL) {
        car.finished = true;
        this.finishOrder.push(car);
        if (car.isPlayer) {
          this.done = true;
          this._showFinish(this.finishOrder.length);
        }
      }
    }
  }

  _triggerWreck() {
    const pz = this.player.z;
    const endgame = pz / R3D.TRACK_LEN >= R3D.ENDGAME_FRAC;
    // In endgame, wrecks can happen anywhere in the pack including near player
    const aheadMin  = endgame ? 30  : 80;
    const finishBuf = endgame ? 60  : 200;
    const cands = this.cars.filter(c =>
      !c.isPlayer && !c.spinning && !c.finished && !c.dnf &&
      c.z > pz + aheadMin &&
      c.z < R3D.TRACK_LEN - finishBuf
    );
    if (cands.length < 2) return; // need at least 2 AI cars up there

    this.wreckCount++;
    const victim = cands[Math.floor(Math.random() * cands.length)];
    victim.spinning  = true;
    victim.spinTimer = 4.0;
    victim.spinDir   = Math.random() > 0.5 ? 1 : -1;

    // Drop debris after brief delay
    setTimeout(() => {
      if (!this.scene) return;
      const wx = victim.x, wz = victim.z;
      this.wrecks.push({ x: wx, z: wz });

      const dbMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
      const db    = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.35, 2.8), dbMat);
      db.rotation.y = Math.random() * Math.PI;
      db.position.set(wx, 0.175, wz);
      this.scene.add(db);

      // Smoke
      const smMat = new THREE.MeshBasicMaterial({ color: 0x909090, transparent: true, opacity: 0.4 });
      const sm    = new THREE.Mesh(new THREE.SphereGeometry(2.5, 7, 7), smMat);
      sm.position.set(wx, 1.8, wz);
      this.scene.add(sm);

      if (Math.abs(wz - pz) < 400) {
        this._warn('⚠️  WRECK AHEAD — STEER CLEAR!');
      }
    }, 1200);
  }

  _updateCamera(dt) {
    const p  = this.player;
    const sk = this.camShake;
    const nx = sk > 0 ? (Math.random() - 0.5) * sk : 0;
    const ny = sk > 0 ? (Math.random() - 0.5) * sk * 0.4 : 0;

    // Dynamic FOV
    const spd = clamp((p.speed - R3D.SPEED_BASE) / (R3D.SPEED_MAX - R3D.SPEED_BASE), 0, 1);
    const fovTarget = 60 + spd * 14;
    this.camera.fov += (fovTarget - this.camera.fov) * 0.07;
    this.camera.updateProjectionMatrix();

    const tx = p.x * 0.85 + nx;
    const ty = 4.5 + ny;
    const tz = p.z - 10 + nx * 0.15;

    this.camera.position.x += (tx - this.camera.position.x) * 0.12;
    this.camera.position.y += (ty - this.camera.position.y) * 0.10;
    this.camera.position.z += (tz - this.camera.position.z) * 0.12;

    this.camera.lookAt(p.x * 0.55, 1.5, p.z + 26);
    this.camShake = Math.max(0, sk - dt * 2.5);

    // Mirror camera: hovering just above the player, looking backward
    this.mirrorCam.position.set(p.x * 0.7, 3.8, p.z + 3);
    this.mirrorCam.lookAt(p.x * 0.3, 1.0, p.z - 40);
  }

  // ── Rear-view mirror rendering (scissor into main canvas) ────
  _renderMirror() {
    const wrap = document.getElementById('r3d-mirror-wrap');
    if (!wrap || !this.scene || !this.mirrorCam) return;

    const rect = wrap.getBoundingClientRect();
    const cr   = this.canvas.getBoundingClientRect();

    // Three.js setViewport/setScissor take LOGICAL (CSS-pixel) coords —
    // they multiply by pixelRatio internally. Do NOT scale by DPR here.
    const mx = Math.round(rect.left - cr.left);
    const my = Math.round(rect.top  - cr.top);
    const mw = Math.round(rect.width);
    const mh = Math.round(rect.height);

    // Logical renderer size (what setViewport expects, NOT canvas.width/height)
    const sz = new THREE.Vector2();
    this.renderer.getSize(sz);
    const glY = Math.round(sz.y - my - mh); // flip: WebGL origin = bottom-left

    this.mirrorCam.aspect = mw / mh;
    this.mirrorCam.updateProjectionMatrix();

    const r = this.renderer;
    r.setScissorTest(true);
    r.setScissor(mx, glY, mw, mh);
    r.setViewport(mx, glY, mw, mh);
    r.clear(true, true, false); // clear color + depth in mirror region only
    r.render(this.scene, this.mirrorCam);
    r.setScissorTest(false);
    r.setViewport(0, 0, sz.x, sz.y);
  }

  _updateHUD() {
    const p = this.player;

    // Position
    const ahead = this.cars.filter(c => !c.dnf && !c.finished && c.z > p.z).length;
    const total = this.cars.filter(c => !c.dnf).length;
    const pos   = ahead + 1;
    const posEl = document.getElementById('r3d-pos');
    if (posEl) posEl.textContent = `P${pos} / ${total}`;

    // Draft / push badge
    const draftEl = document.getElementById('r3d-draft');
    if (draftEl) {
      const momentum = p.draftMomentum || 0;
      const isPush   = momentum > R3D.DRAFT_BOOST;
      const frac     = clamp(momentum / (R3D.DRAFT_BOOST + R3D.PUSH_BONUS), 0, 1);
      if (frac > 0.02) {
        draftEl.style.opacity   = '1';
        draftEl.style.transform = `scale(${1 + frac * 0.12})`;
        draftEl.textContent     = isPush ? '🔥 PUSH DRAFT' : '⚡ SLIPSTREAM';
        draftEl.style.color     = isPush ? '#ff8800' : '#44aaff';
      } else {
        draftEl.style.opacity   = '0.18';
        draftEl.style.transform = 'scale(1)';
        draftEl.textContent     = '⚡ SLIPSTREAM';
        draftEl.style.color     = '';
      }
    }

    // Speedometer — map internal units to realistic superspeedway mph
    // SPEED_BASE=175 ≈ 170 mph, SPEED_MAX=275 ≈ 225 mph
    const mph = Math.round(p.speed * 0.78 + 33);
    const spdEl = document.getElementById('r3d-speed');
    if (spdEl) {
      spdEl.textContent = `${mph} mph`;
      // Color: white → yellow → orange based on speed
      const frac = clamp((p.speed - R3D.SPEED_BASE) / (R3D.SPEED_MAX - R3D.SPEED_BASE), 0, 1);
      const r = Math.round(255);
      const g = Math.round(255 - frac * 120);
      const b = Math.round(255 - frac * 255);
      spdEl.style.color = `rgb(${r},${g},${b})`;
    }

    // Progress bar
    const fill = document.getElementById('r3d-prog-fill');
    if (fill) fill.style.width = clamp(p.z / R3D.TRACK_LEN * 100, 0, 100).toFixed(1) + '%';
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
    const msg = pos === 1 ? 'Victory Lane!' : pos <= 3 ? 'Podium Finish!' : `P${pos} Finish`;
    el.innerHTML = `
      <div class="r3d-finish-box">
        <div class="r3d-finish-pos">${pos}${ordinal(pos)} Place</div>
        <div class="r3d-finish-msg">${msg}</div>
        <button class="btn btn-primary btn-lg" onclick="window._r3dFinish(${pos})">Continue →</button>
      </div>`;
    el.style.display = 'flex';
  }

  // ── Loop ─────────────────────────────────────────────────────
  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    const dt  = Math.min(this.clock.getDelta(), 0.05); // cap at 50ms
    this._update(dt);
    if (this.renderer && this.scene && this.camera) {
      this.renderer.autoClear = true;
      this.renderer.render(this.scene, this.camera); // main view first
      this.renderer.autoClear = false;
      this._renderMirror();                          // mirror on top (no clear)
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
    if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
    this.scene  = null;
    this.camera = null;
    this.done   = true;
  }
}
