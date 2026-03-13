// ============================================================
// STOCK CAR EMPIRE — 3D Race Engine (Three.js r134)
// Straight-line superspeedway drafting race
// Controls: A = left, D = right, S = brake, auto-forward
// ============================================================

const R3D = {
  TRACK_LEN:    15000,  // long superspeedway — ~90 sec race
  TRACK_W:      22,
  HALF_W:       11,
  SPEED_BASE:   175,    // units/sec nominal forward speed
  SPEED_MAX:    270,    // absolute max
  ACCEL:        2.5,    // forward accel lerp factor
  BRAKE_FORCE:  140,    // speed loss when braking (units/sec²)
  LAT_ACC:      160,    // lateral acceleration (units/sec²)
  LAT_MAX:      13,     // max lateral speed (units/sec)
  LAT_DAMP:     0.0005, // damping exponent when no key pressed (near-instant stop)
  DRAFT_Z:      30,     // draft window depth (how far behind)
  DRAFT_X:      3.8,    // draft window lateral tolerance
  DRAFT_BOOST:  42,     // max speed bonus from full draft
  WRECK_FIRST:  50,     // seconds before first wreck can happen
  WRECK_MIN:    65,     // min cooldown between wrecks
  WRECK_MAX:    120,    // max cooldown between wrecks
  MAX_WRECKS:   2,      // hard cap on total wrecks per race
  SPIN_CHANCE:  0.07,   // 7% chance of spin per contact event (rubbing is fine)
  BUMP_DEBOUNCE:0.9,    // min seconds between contact events per car
  GRID_COLS:    2,
  GRID_SPACING: 28,     // row spacing on starting grid
  PACE_SPEED:   38,     // formation lap rolling speed (units/sec)
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

    // Grandstands — tile every 320 units throughout track
    const standColors  = [0x8B4513, 0x7B3A00, 0x9a5216, 0x6b3510];
    const seatPalette  = [0xcc2222, 0x2255cc, 0x22aa44, 0xddcc00, 0xaa22cc];

    for (let z = 200; z < TL - 100; z += 320) {
      [-1, 1].forEach(sx => {
        const sw = 90, sh = 14;
        const stand = new THREE.Mesh(
          new THREE.BoxGeometry(sw, sh, 110),
          new THREE.MeshLambertMaterial({ color: standColors[(z / 320 | 0) % standColors.length] })
        );
        stand.position.set(sx * (side + sw / 2 + 2), sh / 2, z);
        s.add(stand);
        // One colored seating band
        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(sw * 0.94, 6, 100),
          new THREE.MeshLambertMaterial({ color: seatPalette[(z / 320 | 0) % seatPalette.length] })
        );
        seat.position.set(sx * (side + sw / 2 + 2), sh * 0.55, z);
        s.add(seat);
      });
    }

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

    if (isPlayer) {
      const stripeM = new THREE.MeshLambertMaterial({ color: 0xffee00, emissive: 0x998800 });
      const stripe  = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.12), stripeM);
      stripe.position.set(0, 1.45, 0);
      g.add(stripe);
    }

    const glowMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0 });
    const glow    = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 5.5), glowMat);
    glow.position.set(0, 0.5, 0);
    g.add(glow);

    g.position.set(x, 0, z);
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
      laneTimer:       Math.random() * 4,
      contactCooldown: 0,    // debounce for collision with player
    };
  }

  // ── Starting sequence ────────────────────────────────────────
  // Phase 1: "FORMATION LAP" — cars roll slowly in grid formation (3 s)
  // Phase 2: Cars brake to a halt (1 s)
  // Phase 3: 3-2-1-GO countdown lights (3 s)
  _countdown() {
    const el   = document.getElementById('r3d-countdown');
    const hint = document.getElementById('r3d-hint');

    // ── Phase 1: Formation lap ───────────────────────────────
    this.paceMode = true; // cars roll at PACE_SPEED
    if (el) {
      el.textContent   = 'FORMATION LAP';
      el.style.opacity = '1';
      el.style.fontSize = '1.4rem';
      el.style.letterSpacing = '0.12em';
      el.classList.remove('go');
    }

    // After 3 s, brake to a stop
    setTimeout(() => {
      if (this.done) return;
      this.paceBraking = true; // signal _updateAI to slow down
      if (el) el.textContent = 'TO THE LINE…';

      // After 1.2 s, begin 3-2-1 countdown
      setTimeout(() => {
        if (this.done) return;
        this.paceMode   = false;
        this.paceBraking = false;
        if (el) { el.style.fontSize = ''; el.style.letterSpacing = ''; }
        let cnt = 3;
        const tick = () => {
          if (!el || this.done) return;
          if (cnt > 0) {
            el.textContent   = cnt;
            el.style.opacity = '1';
            el.classList.remove('go');
            cnt--;
            setTimeout(tick, 1000);
          } else {
            el.textContent = 'GREEN FLAG!';
            el.classList.add('go');
            this.racing = true;
            if (hint) hint.style.opacity = '0';
            setTimeout(() => { if (el) el.style.opacity = '0'; }, 1100);
          }
        };
        setTimeout(tick, 400);
      }, 1200);
    }, 3000);
  }

  // ── Main update ──────────────────────────────────────────────
  _update(dt) {
    // During formation lap, roll all cars slowly forward
    if (this.paceMode || this.paceBraking) {
      this._updatePaceLap(dt);
      this._updateCamera(dt);
      this._updateHUD();
      return;
    }
    if (!this.racing || this.done) return;

    this._updatePlayer(dt);
    this._updateAI(dt);
    this._calcDraft();
    this._checkCollisions();
    this._checkFinish();
    this._updateCamera(dt);
    this._updateHUD();

    // Wreck scheduling
    if (this.wreckCount < R3D.MAX_WRECKS) {
      this.wreckCooldown -= dt;
      if (this.wreckCooldown <= 0) {
        this._triggerWreck();
        this.wreckCooldown = R3D.WRECK_MIN + Math.random() * (R3D.WRECK_MAX - R3D.WRECK_MIN);
      }
    }
  }

  // ── Formation / pace lap movement ────────────────────────────
  _updatePaceLap(dt) {
    const target = this.paceBraking ? 0 : R3D.PACE_SPEED;
    for (const car of this.cars) {
      car.speed += (target - car.speed) * Math.min(1, dt * 3.5);
      car.z     += car.speed * dt;
      car.mesh.position.z = car.z;
    }
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
    // Car model nose faces toward camera (-Z), so driver's left = world +X.
    // A (left) increases X, D (right) decreases X.
    if      (this.keys.a) p.lv += R3D.LAT_ACC * dt;
    else if (this.keys.d) p.lv -= R3D.LAT_ACC * dt;
    else                  p.lv *= Math.pow(R3D.LAT_DAMP, dt); // near-instant stop on release

    p.lv = clamp(p.lv, -R3D.LAT_MAX, R3D.LAT_MAX);
    p.x  = clamp(p.x + p.lv * dt, -hw, hw);

    // Wall bounce
    if (Math.abs(p.x) >= hw - 0.05) {
      p.lv    = -p.lv * 0.25;
      p.speed = Math.max(p.speed * 0.65, 30);
      this.camShake = Math.max(this.camShake, 0.55);
      this._warn('⚠️  WALL HIT!');
    }

    // ── Forward speed ─────────────────────────────────────────
    const tgt = Math.min(
      R3D.SPEED_BASE * (0.84 + p.power * 0.18) + p.draftBoost,
      R3D.SPEED_MAX
    );
    if (this.keys.s) {
      p.speed = Math.max(tgt * 0.38, p.speed - R3D.BRAKE_FORCE * dt);
    } else {
      p.speed += (tgt - p.speed) * Math.min(1, dt * R3D.ACCEL);
    }

    p.z += p.speed * dt;
    p.mesh.position.set(p.x, 0, p.z);

    // Subtle body roll (visual only — rolls into the turn)
    const roll = this.keys.a ? 0.05 : this.keys.d ? -0.05 : 0;
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

      // Lane decision — every 3–8 seconds (much calmer AI)
      car.laneTimer -= dt;
      if (car.laneTimer <= 0) {
        car.laneTimer = 3.0 + Math.random() * 5.0;
        const nearWreck = this.wrecks.find(w =>
          w.z > car.z && w.z < car.z + 55 && Math.abs(w.x - car.x) < 5.5
        );
        if (nearWreck) {
          const dir = nearWreck.x > 0 ? -1 : 1;
          car.targetX = clamp(nearWreck.x + dir * 8, -R3D.HALF_W + 1.4, R3D.HALF_W - 1.4);
        } else {
          // Small drift, stay closer to center
          const drift = (Math.random() - 0.5) * 7;
          car.targetX = clamp(car.x + drift, -R3D.HALF_W + 1.4, R3D.HALF_W - 1.4);
        }
      }

      const tgt = Math.min(R3D.SPEED_BASE * (0.74 + car.power * 0.32) + car.draftBoost, R3D.SPEED_MAX);
      car.speed += (tgt - car.speed) * Math.min(1, dt * 1.8);
      car.x     += (car.targetX - car.x) * Math.min(1, dt * 3.5);
      car.z     += car.speed * dt;
      car.mesh.position.set(car.x, 0, car.z);
    }
  }

  _calcDraft() {
    for (const car of this.cars) {
      if (car.dnf || car.finished) { car.draftBoost = 0; continue; }

      // Find best (closest) car ahead within draft cone
      let bestIntensity = 0;
      for (const other of this.cars) {
        if (other === car || other.dnf || other.finished) continue;
        const dz = other.z - car.z;
        if (dz <= 0 || dz > R3D.DRAFT_Z) continue;
        if (Math.abs(other.x - car.x) > R3D.DRAFT_X) continue;
        // Intensity: 1.0 when right behind, fades to 0 at edge of zone
        const intensity = 1 - (dz / R3D.DRAFT_Z);
        if (intensity > bestIntensity) bestIntensity = intensity;
      }

      // Chain drafting: each car stacked adds diminishing returns
      car.draftBoost = bestIntensity * R3D.DRAFT_BOOST;
      if (car.glowMat) car.glowMat.opacity = bestIntensity * 0.28;
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

    // Small random chance to spin — most contacts are just racing
    if (Math.random() < R3D.SPIN_CHANCE) {
      this._spinPlayer(1.6, pushDir, 1.1);
      this._warn('⚠️  SPIN OUT!');
    } else {
      this._warn('⚠️  CONTACT!');
    }
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
    // Only wreck cars well ahead of player, not too close to finish
    const cands = this.cars.filter(c =>
      !c.isPlayer && !c.spinning && !c.finished && !c.dnf &&
      c.z > pz + 80 &&
      c.z < R3D.TRACK_LEN - 200
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
  }

  _updateHUD() {
    const p = this.player;

    const ahead = this.cars.filter(c => !c.dnf && !c.finished && c.z > p.z).length;
    const posEl = document.getElementById('r3d-pos');
    if (posEl) posEl.textContent = `P${ahead + 1}`;

    const draftEl = document.getElementById('r3d-draft');
    if (draftEl) {
      const on = p.draftBoost > 0;
      draftEl.style.opacity   = on ? '1' : '0.15';
      draftEl.style.transform = on ? 'scale(1.08)' : 'scale(1)';
    }

    const spdEl = document.getElementById('r3d-speed');
    if (spdEl) spdEl.textContent = `${Math.round(p.speed)} mph`;

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
    const emoji = pos === 1 ? '🏆' : pos <= 3 ? '🥈' : pos <= 10 ? '🏁' : '🚗';
    const msg   = pos === 1 ? 'Victory Lane!' : pos <= 3 ? 'Podium Finish!' : `P${pos} Finish`;
    el.innerHTML = `
      <div class="r3d-finish-box">
        <div class="r3d-finish-emoji">${emoji}</div>
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
      this.renderer.render(this.scene, this.camera);
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
