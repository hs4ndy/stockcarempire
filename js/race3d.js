// ============================================================
// STOCK CAR EMPIRE — 3D Race Engine (Three.js)
// Straight-line superspeedway drafting race
// Controls: A = left, D = right, S = brake, auto-forward
// ============================================================

const R3D = {
  TRACK_LEN:   1400,   // units from start to finish
  TRACK_W:     22,     // total drivable width
  SPEED_BASE:  85,     // nominal forward speed (units/sec)
  SPEED_MAX:   128,    // absolute max speed
  ACCEL:       35,     // speed approach rate
  BRAKE_FORCE: 80,     // speed loss when braking
  LAT_RATE:    48,     // lateral movement rate (units/sec)
  DRAFT_Z:     15,     // draft window: how far behind to feel it
  DRAFT_X:     2.6,    // draft window: lateral tolerance
  DRAFT_BOOST: 22,     // speed bonus from drafting
  WRECK_FIRST: 12,     // seconds until first possible wreck
  WRECK_NEXT:  [ 7, 16 ], // random range for wreck cooldown after each one
};

// ─── Public launcher ─────────────────────────────────────────
function launch3DRace(config, onComplete) {
  const container = document.getElementById('race-3d-container');
  if (!container) { console.error('race-3d-container not found'); return; }

  container.innerHTML = `
    <canvas id="r3d-canvas"></canvas>
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

  const canvas    = document.getElementById('r3d-canvas');
  canvas.width    = container.clientWidth;
  canvas.height   = container.clientHeight;

  const instance  = new Race3DEngine(canvas, config, onComplete);

  window._r3d         = instance;
  window._r3dFinish   = (pos) => {
    instance.destroy();
    window._r3d = null;
    onComplete(pos);
  };
}

// ─── Race Engine ──────────────────────────────────────────────
class Race3DEngine {
  constructor(canvas, config, onComplete) {
    this.canvas     = canvas;
    this.config     = config;
    this.onComplete = onComplete;
    this.keys       = { a: false, d: false, s: false };
    this.cars       = [];
    this.player     = null;
    this.wrecks     = [];          // { x, z, mesh }
    this.wreckCooldown = R3D.WRECK_FIRST;
    this.camShake   = 0;
    this.racing     = false;       // true after countdown
    this.done       = false;
    this.finishOrder = [];
    this._raf       = null;
    this._warnTimeout = null;

    this._init();
  }

  // ── Scene setup ─────────────────────────────────────────────
  _init() {
    const c = this.canvas;
    const w = c.width, h = c.height;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x6aa9d8);
    this.scene.fog = new THREE.FogExp2(0x9abfdb, 0.0018);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.3, 1800);
    this.camera.position.set(0, 5, -10);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(amb);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.1);
    sun.position.set(80, 200, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left   = -250;
    sun.shadow.camera.right  =  250;
    sun.shadow.camera.top    =  250;
    sun.shadow.camera.bottom = -250;
    sun.shadow.camera.far    = 1800;
    this.scene.add(sun);
    this.sun = sun;

    this.scene.add(new THREE.HemisphereLight(0xb0d8ff, 0x4a7a3a, 0.35));

    // World
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

    // Resize
    this._onResize = () => {
      const el = this.canvas.parentElement;
      if (!el) return;
      const nw = el.clientWidth, nh = el.clientHeight;
      this.canvas.width  = nw;
      this.canvas.height = nh;
      this.renderer.setSize(nw, nh);
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this._onResize);

    // Clock & loop
    this.clock = new THREE.Clock();
    this._loop();

    // Countdown
    this._countdown();
  }

  // ── Track geometry ───────────────────────────────────────────
  _buildTrack() {
    const s = this.scene;
    const TL = R3D.TRACK_LEN;
    const TW = R3D.TRACK_W;

    // Asphalt surface
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(TW, TL + 60),
      new THREE.MeshLambertMaterial({ color: 0x2c2c2c })
    );
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.set(0, 0, TL / 2);
    asphalt.receiveShadow = true;
    s.add(asphalt);

    // Grass either side
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x3d8b47 });
    [-1, 1].forEach(side => {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(400, TL + 200), grassMat);
      g.rotation.x = -Math.PI / 2;
      g.position.set(side * (TW / 2 + 200), -0.02, TL / 2);
      s.add(g);
    });

    // Lane dividers (3 dashed white lines)
    const dashMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    [-TW / 4, 0, TW / 4].forEach(lx => {
      for (let z = 10; z < TL - 10; z += 24) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 11), dashMat);
        d.position.set(lx, 0.012, z + 5.5);
        s.add(d);
      }
    });

    // Solid edge lines
    const edgeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    [-(TW / 2 - 0.35), TW / 2 - 0.35].forEach(lx => {
      const el = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.025, TL), edgeMat);
      el.position.set(lx, 0.012, TL / 2);
      s.add(el);
    });

    // Concrete barriers (ARMCO-style)
    const barrierMat = new THREE.MeshLambertMaterial({ color: 0xc8c8c8 });
    [-(TW / 2 + 1.0), TW / 2 + 1.0].forEach(bx => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, TL + 10), barrierMat);
      bar.position.set(bx, 0.55, TL / 2);
      bar.castShadow = true;
      bar.receiveShadow = true;
      s.add(bar);
      // Red/white stripes
      for (let z = 0; z < TL; z += 10) {
        const col = (Math.floor(z / 10) % 2 === 0) ? 0xdd2222 : 0xffffff;
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(1.52, 0.22, 4.5),
          new THREE.MeshLambertMaterial({ color: col })
        );
        stripe.position.set(bx, 0.65, z + 2.25);
        s.add(stripe);
      }
    });

    // Finish line (black/white checker, 2 rows)
    const cols = 14;
    const cw = TW / cols;
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < cols; i++) {
        const even = (i + row) % 2 === 0;
        const ck = new THREE.Mesh(
          new THREE.BoxGeometry(cw - 0.04, 0.03, 2.8),
          new THREE.MeshLambertMaterial({ color: even ? 0xffffff : 0x000000 })
        );
        ck.position.set(-TW / 2 + cw / 2 + i * cw, 0.015, TL - 4.2 + row * 2.8);
        s.add(ck);
      }
    }

    // Finish gantry
    const postMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    [-(TW / 2 + 2), TW / 2 + 2].forEach(px => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 0.5), postMat);
      post.position.set(px, 5, TL - 2.8);
      s.add(post);
    });
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(TW + 5, 0.5, 0.5), postMat);
    gantry.position.set(0, 10, TL - 2.8);
    s.add(gantry);

    // "FINISH" banner strip
    const bannerMat = new THREE.MeshLambertMaterial({ color: 0xff2222 });
    const banner = new THREE.Mesh(new THREE.BoxGeometry(TW + 4, 1.5, 0.2), bannerMat);
    banner.position.set(0, 8, TL - 2.8);
    s.add(banner);

    // Start grid markers
    const gridMat = new THREE.MeshLambertMaterial({ color: 0xffaa00 });
    for (let row = 0; row < 14; row++) {
      const gm = new THREE.Mesh(new THREE.BoxGeometry(TW, 0.025, 0.5), gridMat);
      gm.position.set(0, 0.012, row * 15 + 0.25);
      s.add(gm);
    }
  }

  // ── Environment (stands, lights, sky details) ────────────────
  _buildEnvironment() {
    const s    = this.scene;
    const TL   = R3D.TRACK_LEN;
    const TW   = R3D.TRACK_W;
    const side = TW / 2 + 3;

    // Grandstands
    const standColors = [0x8B4513, 0x7B3A00, 0x9a5216, 0x6b3510];
    const seatPalette = [0xcc2222, 0x2255cc, 0x22aa44, 0xddcc00, 0xaa22cc];

    for (let z = 120; z < TL - 100; z += 110) {
      [-1, 1].forEach(sx => {
        const sw = 85 + Math.random() * 20;
        const sh = 9 + Math.random() * 7;
        const stand = new THREE.Mesh(
          new THREE.BoxGeometry(sw, sh, 95),
          new THREE.MeshLambertMaterial({ color: pick(standColors) })
        );
        stand.position.set(sx * (side + sw / 2 + 2), sh / 2, z);
        s.add(stand);

        // Coloured seating sections
        for (let row = 0; row < 7; row++) {
          const seat = new THREE.Mesh(
            new THREE.BoxGeometry(sw * 0.92, 0.8, 86),
            new THREE.MeshLambertMaterial({ color: pick(seatPalette) })
          );
          seat.position.set(sx * (side + sw / 2 + 2), 0.9 + row * 1.25, z);
          s.add(seat);
        }
      });
    }

    // Track-side light poles
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    for (let z = 150; z < TL - 100; z += 180) {
      [-1, 1].forEach(sx => {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.45, 20, 0.45), poleMat);
        pole.position.set(sx * (side + 8), 10, z);
        s.add(pole);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(6, 0.35, 0.35), poleMat);
        arm.position.set(sx * (side + 5), 20, z);
        s.add(arm);
        // Light fixture glow
        const light = new THREE.Mesh(
          new THREE.BoxGeometry(5.5, 0.5, 0.5),
          new THREE.MeshLambertMaterial({ color: 0xfffce0, emissive: 0x888870 })
        );
        light.position.set(sx * (side + 5), 20.5, z);
        s.add(light);
      });
    }

    // Pit wall signage (colourful banners along the barriers)
    const bannerColors = [0xe8001d, 0x0055ff, 0x00aa44, 0xffaa00, 0xaa00ff];
    for (let z = 60; z < TL - 60; z += 80) {
      const col = bannerColors[Math.floor(z / 80) % bannerColors.length];
      const bm = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.7, 38),
        new THREE.MeshLambertMaterial({ color: col })
      );
      bm.position.set(-(R3D.TRACK_W / 2 + 1.0), 1.15, z);
      s.add(bm);
    }

    // Sky plane (horizon colour fill)
    const horizon = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 400),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.DoubleSide })
    );
    horizon.position.set(0, 100, TL / 2);
    s.add(horizon);
  }

  // ── Cars ─────────────────────────────────────────────────────
  _buildCars() {
    const { config } = this;
    const total = 1 + Math.min(config.aiEntries.length, R3D.TRACK_W > 0 ? config.fieldSize - 1 : 20);

    // Grid slots: 2 wide, 15 units per row
    const slots = [];
    for (let r = 0; r < Math.ceil(total / 2); r++) {
      slots.push({ x: -3.8, z: r * 15 });
      slots.push({ x:  3.8, z: r * 15 });
    }

    // Player grid slot — mid-pack based on power
    const playerSlotIdx = clamp(
      Math.round((1 - config.playerPower) * total * 0.55 + 2),
      0, slots.length - 1
    );

    const playerSlot = slots[playerSlotIdx];
    this.player = this._makeCar(playerSlot.x, playerSlot.z, {
      color:    config.playerColor || '#e8001d',
      power:    config.playerPower,
      isPlayer: true,
      label:    'YOU',
    });
    this.cars.push(this.player);

    // AI cars
    let aiIdx = 0;
    for (let i = 0; i < total && aiIdx < config.aiEntries.length; i++) {
      if (i === playerSlotIdx || i === playerSlotIdx + 1) continue;
      const entry = config.aiEntries[aiIdx++];
      const slot  = slots[i] || slots[slots.length - 1];
      const car   = this._makeCar(slot.x, slot.z, {
        color:    entry.color,
        power:    clamp(entry.power, 0.25, 0.95),
        isPlayer: false,
        label:    entry.name,
      });
      this.cars.push(car);
    }
  }

  _makeCar(x, z, { color, power, isPlayer, label }) {
    const hexColor = typeof color === 'string'
      ? parseInt(color.replace('#', ''), 16)
      : color;

    const g = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshLambertMaterial({ color: hexColor });
    const body    = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.62, 4.5), bodyMat);
    body.position.y = 0.41;
    body.castShadow = true;
    g.add(body);

    // Roof
    const darkColor  = Math.max(0, hexColor - 0x3a2a1a);
    const roofMat = new THREE.MeshLambertMaterial({ color: darkColor });
    const roof    = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.38, 1.75), roofMat);
    roof.position.set(0, 0.95, -0.05);
    g.add(roof);

    // Windshield
    const wsMat = new THREE.MeshLambertMaterial({ color: 0x99c0e8, transparent: true, opacity: 0.8 });
    const ws    = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.36, 0.12), wsMat);
    ws.position.set(0, 0.83, -0.88);
    ws.rotation.x = -0.32;
    g.add(ws);

    // Rear spoiler
    const spMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const sp    = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.52), spMat);
    sp.position.set(0, 1.06, 2.05);
    g.add(sp);
    [-0.75, 0.75].forEach(sx => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), spMat);
      strut.position.set(sx, 0.83, 2.05);
      g.add(strut);
    });

    // Front splitter
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.4), spMat);
    splitter.position.set(0, 0.12, -2.3);
    g.add(splitter);

    // Number panel (slightly lighter rectangle on side)
    const panelMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const panel    = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 1.0), panelMat);
    panel.position.set(-1.12, 0.55, 0);
    g.add(panel);

    // Wheels
    const tireMat = new THREE.MeshLambertMaterial({ color: 0x181818 });
    const rimMat  = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });
    [[-1.18, 0.36, -1.45], [1.18, 0.36, -1.45],
     [-1.18, 0.36,  1.45], [1.18, 0.36,  1.45]].forEach(([wx, wy, wz]) => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, wy, wz);
      tire.castShadow = true;
      g.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.31, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, wy, wz);
      g.add(rim);
    });

    // Player indicator (yellow roof stripe)
    if (isPlayer) {
      const stripeL = new THREE.MeshLambertMaterial({ color: 0xffee00, emissive: 0x998800 });
      const stripe  = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.12), stripeL);
      stripe.position.set(0, 1.45, 0);
      g.add(stripe);
    }

    // Draft glow mesh (invisible until drafting)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x44aaff, transparent: true, opacity: 0.0, side: THREE.FrontSide
    });
    const glow = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 5.2), glowMat);
    glow.position.set(0, 0.5, 0);
    g.add(glow);

    g.position.set(x, 0, z);
    this.scene.add(g);

    return {
      mesh:      g,
      glowMat,
      isPlayer,
      power,
      label,
      hexColor,
      x, z,
      vx:        0,       // lateral velocity
      speed:     R3D.SPEED_BASE * (0.8 + power * 0.22),
      targetX:   x,
      spinning:  false,
      spinTimer: 0,
      spinDir:   1,
      finished:  false,
      dnf:       false,
      draftBoost: 0,
      laneTimer: Math.random() * 3,
    };
  }

  // ── Countdown ────────────────────────────────────────────────
  _countdown() {
    const el  = document.getElementById('r3d-countdown');
    const hint = document.getElementById('r3d-hint');
    let cnt = 3;
    const tick = () => {
      if (!el) { this.racing = true; return; }
      if (cnt > 0) {
        el.textContent  = cnt;
        el.style.opacity = '1';
        el.classList.remove('go');
        cnt--;
        setTimeout(tick, 1000);
      } else {
        el.textContent   = 'GO!';
        el.classList.add('go');
        this.racing = true;
        if (hint) hint.style.opacity = '0';
        setTimeout(() => { el.style.opacity = '0'; }, 900);
      }
    };
    setTimeout(tick, 600);
  }

  // ── Main update ──────────────────────────────────────────────
  _update(dt) {
    if (!this.racing || this.done) return;

    this._updatePlayer(dt);
    this._updateAI(dt);
    this._calcDraft();
    this._checkCollisions();
    this._checkFinish();
    this._updateCamera(dt);
    this._updateHUD();

    // Wreck timer
    this.wreckCooldown -= dt;
    if (this.wreckCooldown <= 0) {
      this._triggerWreck();
      this.wreckCooldown = rand(R3D.WRECK_NEXT[0], R3D.WRECK_NEXT[1]);
    }
  }

  _updatePlayer(dt) {
    const p   = this.player;
    const hw  = R3D.TRACK_W / 2 - 1.25;

    if (p.spinning) {
      p.spinTimer -= dt;
      p.mesh.rotation.y += p.spinDir * 4.8 * dt;
      p.speed = Math.max(12, p.speed - 100 * dt);
      p.z    += p.speed * dt;
      p.mesh.position.z = p.z;
      if (p.spinTimer <= 0) {
        p.spinning = false;
        p.mesh.rotation.y = 0;
      }
      return;
    }

    // Lateral steering
    const lat = R3D.LAT_RATE;
    if (this.keys.a) p.vx -= lat * dt;
    if (this.keys.d) p.vx += lat * dt;
    p.vx *= Math.pow(0.05, dt);   // strong friction
    p.x  += p.vx * dt * 60;
    p.x   = clamp(p.x, -hw, hw);

    // Wall clip
    if (Math.abs(p.x) >= hw - 0.05) {
      p.vx = -p.vx * 0.3;
      p.speed = Math.max(p.speed * 0.6, 20);
      this.camShake = Math.max(this.camShake, 0.5);
    }

    // Forward speed
    const tgt = Math.min(R3D.SPEED_BASE * (0.85 + p.power * 0.18) + p.draftBoost, R3D.SPEED_MAX);
    if (this.keys.s) {
      p.speed = Math.max(tgt * 0.4, p.speed - R3D.BRAKE_FORCE * dt);
    } else {
      p.speed += (tgt - p.speed) * Math.min(1, dt * R3D.ACCEL / 60);
    }

    p.z += p.speed * dt;
    p.mesh.position.set(p.x, 0, p.z);

    // Subtle body roll on steering
    const roll = this.keys.a ? 0.055 : this.keys.d ? -0.055 : 0;
    p.mesh.rotation.z += (roll - p.mesh.rotation.z) * 0.14;
  }

  _updateAI(dt) {
    for (const car of this.cars) {
      if (car.isPlayer || car.finished) continue;

      if (car.dnf) {
        car.mesh.rotation.y += 0.4 * dt;
        continue;
      }
      if (car.spinning) {
        car.spinTimer -= dt;
        car.mesh.rotation.y += car.spinDir * 3.8 * dt;
        car.speed = Math.max(5, car.speed - 75 * dt);
        car.z    += car.speed * dt;
        car.mesh.position.z = car.z;
        if (car.spinTimer <= 0) {
          car.dnf = true;
          car.spinning = false;
        }
        continue;
      }

      // Lane decision
      car.laneTimer -= dt;
      if (car.laneTimer <= 0) {
        car.laneTimer = 1.8 + Math.random() * 3.5;
        const ahead = this.wrecks.find(w =>
          w.z > car.z && w.z < car.z + 40 && Math.abs(w.x - car.x) < 5
        );
        if (ahead) {
          const dir = ahead.x > 0 ? -1 : 1;
          car.targetX = clamp(ahead.x + dir * 7, -R3D.TRACK_W / 2 + 1.3, R3D.TRACK_W / 2 - 1.3);
        } else {
          const drift = (Math.random() - 0.48) * 8;
          car.targetX = clamp(car.x + drift, -R3D.TRACK_W / 2 + 1.3, R3D.TRACK_W / 2 - 1.3);
        }
      }

      const tgt = Math.min(R3D.SPEED_BASE * (0.76 + car.power * 0.3) + car.draftBoost, R3D.SPEED_MAX);
      car.speed += (tgt - car.speed) * Math.min(1, dt * 1.9);
      car.x     += (car.targetX - car.x) * Math.min(1, dt * 3.8);
      car.z     += car.speed * dt;
      car.mesh.position.set(car.x, 0, car.z);
    }
  }

  _calcDraft() {
    for (const car of this.cars) {
      if (car.dnf) { car.draftBoost = 0; continue; }
      const drafting = this.cars.some(other =>
        other !== car &&
        !other.dnf &&
        other.z > car.z &&
        other.z - car.z < R3D.DRAFT_Z &&
        Math.abs(other.x - car.x) < R3D.DRAFT_X
      );
      car.draftBoost = drafting ? R3D.DRAFT_BOOST : 0;
      car.glowMat.opacity = drafting ? 0.22 : 0;
    }
  }

  _checkCollisions() {
    const p = this.player;
    if (p.spinning || p.finished || p.dnf) return;

    // Car-to-car
    for (const car of this.cars) {
      if (car === p || car.finished || car.dnf) continue;
      if (Math.abs(p.x - car.x) < 1.85 && Math.abs(p.z - car.z) < 3.8) {
        this._spinPlayer(1.6, car.x < p.x ? 1 : -1, 0.9);
        return;
      }
    }
    // Wreck debris
    for (const w of this.wrecks) {
      if (Math.abs(p.x - w.x) < 2.2 && Math.abs(p.z - w.z) < 2.8) {
        this._spinPlayer(2.2, 1, 1.4);
        return;
      }
    }
  }

  _spinPlayer(duration, dir, shake) {
    const p = this.player;
    if (p.spinning) return;
    p.spinning  = true;
    p.spinTimer = duration;
    p.spinDir   = dir;
    p.speed     = 18;
    this.camShake = Math.max(this.camShake, shake);
  }

  _checkFinish() {
    for (const car of this.cars) {
      if (!car.finished && car.z >= R3D.TRACK_LEN) {
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
    const cands = this.cars.filter(c =>
      !c.isPlayer && !c.spinning && !c.finished && !c.dnf &&
      c.z > pz + 60 &&
      c.z < R3D.TRACK_LEN - 80
    );
    if (cands.length === 0) return;

    const victim   = cands[Math.floor(Math.random() * cands.length)];
    victim.spinning  = true;
    victim.spinTimer = 3.8;
    victim.spinDir   = Math.random() > 0.5 ? 1 : -1;

    // Drop debris a beat later
    setTimeout(() => {
      if (!this.scene) return;
      const wx = victim.x, wz = victim.z;
      this.wrecks.push({ x: wx, z: wz });

      const dbMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
      const db    = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.35, 2.8), dbMat);
      db.rotation.y = Math.random() * Math.PI;
      db.position.set(wx, 0.175, wz);
      this.scene.add(db);

      // Smoke puff (simple sphere)
      const smMat = new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.45 });
      const sm    = new THREE.Mesh(new THREE.SphereGeometry(2.2, 7, 7), smMat);
      sm.position.set(wx, 1.5, wz);
      this.scene.add(sm);

      if (Math.abs(wz - pz) < 280) {
        this._warn('⚠️  WRECK AHEAD — STEER CLEAR!');
      }
    }, 1100);
  }

  _updateCamera(dt) {
    const p  = this.player;
    const sk = this.camShake;
    const noise = sk > 0 ? (Math.random() - 0.5) * sk : 0;

    // Dynamic FOV: wider when fast
    const speedFrac = (p.speed - R3D.SPEED_BASE) / (R3D.SPEED_MAX - R3D.SPEED_BASE);
    this.camera.fov += (clamp(60 + speedFrac * 12, 58, 74) - this.camera.fov) * 0.08;
    this.camera.updateProjectionMatrix();

    const tx = p.x * 0.88 + noise * 0.5;
    const ty = 4.2 + noise * 0.15;
    const tz = p.z - 9.5 + noise * 0.2;

    this.camera.position.x += (tx - this.camera.position.x) * 0.13;
    this.camera.position.y += (ty - this.camera.position.y) * 0.12;
    this.camera.position.z += (tz - this.camera.position.z) * 0.13;

    this.camera.lookAt(p.x * 0.6, 1.4, p.z + 24);

    this.camShake = Math.max(0, sk - dt * 2.8);
  }

  _updateHUD() {
    const p = this.player;

    // Position
    const ahead = this.cars.filter(c => !c.dnf && !c.finished && c.z > p.z).length;
    const posEl = document.getElementById('r3d-pos');
    if (posEl) posEl.textContent = `P${ahead + 1}`;

    // Draft
    const draftEl = document.getElementById('r3d-draft');
    if (draftEl) {
      const on = p.draftBoost > 0;
      draftEl.style.opacity = on ? '1' : '0.15';
      draftEl.style.transform = on ? 'scale(1.08)' : 'scale(1)';
    }

    // Speed
    const spdEl = document.getElementById('r3d-speed');
    if (spdEl) spdEl.textContent = `${Math.round(p.speed)} mph`;

    // Progress
    const fill = document.getElementById('r3d-prog-fill');
    if (fill) fill.style.width = clamp(p.z / R3D.TRACK_LEN * 100, 0, 100).toFixed(1) + '%';
  }

  _warn(msg) {
    const el = document.getElementById('r3d-warn');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._warnTimeout);
    this._warnTimeout = setTimeout(() => { el.classList.add('hidden'); }, 3500);
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

  // ── Animation loop ───────────────────────────────────────────
  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    const dt  = Math.min(this.clock.getDelta(), 0.05);
    this._update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    document.removeEventListener('keydown', this._kd);
    document.removeEventListener('keyup',   this._ku);
    window.removeEventListener('resize',    this._onResize);
    if (this.renderer) this.renderer.dispose();
    this.scene = null;
  }
}
