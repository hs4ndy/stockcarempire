const path = require('node:path');
const { test, expect } = require('playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('**/three.min.js', route => route.fulfill({
    path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'),
    contentType: 'application/javascript',
  }));
});

async function startRace(page) {
  await page.goto('/');
  await page.locator('#btn-quick-race').click();
  await page.locator('.quick-series-btn').last().click();
  await page.waitForFunction(() => window._r3d?.mirrorRT);
}

test('Draft label stays fixed while the meter rises and falls across aerodynamic states', async ({ page }) => {
  await startRace(page);
  await expect(page.locator('#r3d-draft')).toHaveText('Draft');
  await expect(page.locator('#r3d-draft')).toHaveCSS('text-transform', 'none');
  const states = await page.evaluate(() => {
    const e = window._r3d;
    e.paused = true;
    return [
      { draftMomentum: 0, towStrength: 0, pushStrength: 0, receivedPush: 0 },
      { draftMomentum: 20, towStrength: 0.8, pushStrength: 0, receivedPush: 0 },
      { draftMomentum: 43, towStrength: 1, pushStrength: 1, receivedPush: 0 },
      { draftMomentum: 30, towStrength: 0, pushStrength: 0, receivedPush: 8 },
      { draftMomentum: 10, towStrength: 0, pushStrength: 0, receivedPush: 0 },
      { draftMomentum: 0, towStrength: 0, pushStrength: 0, receivedPush: 0 },
    ].map(state => {
      Object.assign(e.player, state);
      e._updateHUD(1 / 60);
      return {
        label: document.getElementById('r3d-draft').textContent,
        fill: document.getElementById('r3d-draft-fill').style.width,
      };
    });
  });
  expect(states.map(s => s.label)).toEqual(Array(6).fill('Draft'));
  expect(states.map(s => s.fill)).toEqual(['0%', '47%', '100%', '70%', '23%', '0%']);
});

test('mirror renders both sides without DPR cropping and preserves main-render state', async ({ page }, testInfo) => {
  for (const dpr of [1, 2]) {
    await startRace(page);
    const result = await page.evaluate(dpr => {
      const e = window._r3d, r = e.renderer;
      e.paused = true; e.paceMode = false;
      cancelAnimationFrame(e._raf);
      e.cars.forEach(c => { c.mesh.visible = c === e.player; });
      e.player.x = 0; e.player.z = 1500; e.player.speed = 195;
      e.player.mesh.position.set(0, 0, 1500);
      r.setPixelRatio(dpr);
      e._onResize();
      e._updateCamera(1 / 60);
      // Bright markers represent a car behind each rear quarter.
      [
        { x: 3, color: 0xff0000 },
        { x: -3, color: 0x00ff00 },
      ].forEach(({ x, color }) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2),
          new THREE.MeshBasicMaterial({ color }));
        m.position.set(x, 1.35, e.player.z - 14); e.scene.add(m);
      });
      r.autoClear = true; r.render(e.scene, e.camera);
      r.autoClear = false; e._renderMirror();
      const gl = r.getContext(), wrap = document.getElementById('r3d-mirror-wrap');
      const rect = wrap.getBoundingClientRect(), cr = e.canvas.getBoundingClientRect();
      const x = Math.round((rect.left + wrap.clientLeft - cr.left) * dpr);
      const y = Math.round((cr.height - (rect.top + wrap.clientTop - cr.top) - wrap.clientHeight) * dpr);
      const w = Math.round(wrap.clientWidth * dpr), h = Math.round(wrap.clientHeight * dpr);
      const data = new Uint8Array(w * h * 4);
      gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
      let red = [], green = [];
      for (let i = 0; i < data.length; i += 4) {
        const px = (i / 4) % w;
        if (data[i] > 200 && data[i + 1] < 50 && data[i + 2] < 50) red.push(px);
        if (data[i + 1] > 200 && data[i] < 50 && data[i + 2] < 50) green.push(px);
      }
      const mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length) / w;
      return { redCount: red.length, greenCount: green.length,
        redX: mean(red), greenX: mean(green), playerVisible: e.player.mesh.visible,
        targetReset: r.getRenderTarget() === null, scissorReset: !r.getScissorTest(),
        pixelWidth: e.mirrorRT.width, expectedWidth: w };
    }, dpr);
    expect(result.redCount).toBeGreaterThan(30);
    expect(result.greenCount).toBeGreaterThan(30);
    expect(result.redX).toBeLessThan(0.5);
    expect(result.greenX).toBeGreaterThan(0.5);
    expect(result.playerVisible && result.targetReset && result.scissorReset).toBe(true);
    expect(result.pixelWidth).toBe(result.expectedWidth);
    await page.screenshot({ path: testInfo.outputPath('mirror-dpr-' + dpr + '.png') });
    await page.evaluate(() => window._r3d.destroy());
  }
});

test('rear-view framing shows a close following car and both adjacent lanes', async ({ page }, testInfo) => {
  await startRace(page);
  await page.waitForFunction(() => window._r3d.racing);
  const framing = await page.evaluate(() => {
    const e = window._r3d;
    e.paused = true;
    cancelAnimationFrame(e._raf);
    e.cars.forEach((c, i) => {
      c.x = i < 2 ? 0 : i % 2 ? -3.5 : 3.5;
      c.z = i === 0 ? 6000 : i === 1 ? 5995.4 : 5990 - i * 12;
      c.speed = 200; c.lv = c.lvx = 0;
      c.mesh.position.set(c.x, 0, c.z);
    });
    e._updateCamera(1);
    e._updateHUD(1);
    document.getElementById('r3d-countdown').style.opacity = '0';
    e.renderer.autoClear = true;
    e.renderer.render(e.scene, e.camera);
    e.renderer.autoClear = false;
    e._renderMirror();
    const box = new THREE.Box3().setFromObject(e.cars[1].mesh);
    const corners = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const v = new THREE.Vector3(x, y, z).project(e.mirrorCam);
        corners.push({ x: v.x, y: v.y });
      }
    }
    return corners;
  });
  for (const point of framing) {
    expect(Math.abs(point.x)).toBeLessThan(1);
    // Bounding-box corners include the underside of the tires. At the faster
    // chase-camera FOV, that non-visible underside can sit just below the
    // mirror edge while the complete readable front remains in frame.
    expect(Math.abs(point.y)).toBeLessThan(1.1);
  }
  await page.screenshot({ path: testInfo.outputPath('mirror-close-pack.png') });
});

test('real keyboard departure from a bumper carries a smooth run', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await startRace(page);
  await page.waitForFunction(() => window._r3d.racing);
  await page.evaluate(() => {
    const e = window._r3d;
    e.paceMode = false; e.racing = true;
    e.wreckCooldown = Infinity;
    // Repeatable bumper push; real RAF and keyboard inputs then drive it.
    e.cars.forEach((c, i) => {
      c.x = i === 0 || i === 1 ? 0 : i % 2 ? 7 : -7;
      c.z = i === 0 ? 6000 : i === 1 ? 6004.6 : 5900 - i * 25;
      c.speed = 200; c.targetX = c.x; c.laneTimer = 60;
      c.lv = c.lvx = 0; c.draftBoost = c.draftMomentum = 30;
      c.mesh.position.set(c.x, 0, c.z);
    });
    const traces = [];
    const original = e._update.bind(e);
    e._update = dt => {
      original(dt);
      if (traces.length < 1500) traces.push({
        x: e.player.x, lv: e.player.lv, speed: e.player.speed,
        boost: e.player.draftBoost, state: document.getElementById('r3d-draft').textContent
      });
    };
    window.raceTraces = traces;
  });
  await page.keyboard.down('d');
  await page.waitForTimeout(650);
  await page.keyboard.up('d');
  await page.waitForTimeout(700);
  await page.screenshot({ path: testInfo.outputPath('bumper-release.png') });
  const trace = await page.evaluate(() => window.raceTraces);
  expect(trace.length).toBeGreaterThan(30);
  for (let i = 1; i < trace.length; i++) {
    expect(Math.abs(trace[i].x - trace[i - 1].x)).toBeLessThan(0.13);
    expect(Math.abs(trace[i].speed - trace[i - 1].speed)).toBeLessThan(3);
    expect(Math.abs(trace[i].boost - trace[i - 1].boost)).toBeLessThan(1);
  }
  expect(Math.abs(trace.at(-1).x)).toBeGreaterThan(1);
  expect(trace.at(-1).boost).toBeGreaterThan(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#r3d-pause-overlay')).toHaveClass(/active/);
  const paused = await page.evaluate(() => ({ z: window._r3d.player.z, keys: window._r3d.keys }));
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window._r3d.player.z)).toBe(paused.z);
  expect(Object.values(paused.keys).every(v => !v)).toBe(true);
  expect(errors).toEqual([]);
});

test('three complete career races preserve on-track classification in saved results', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.locator('#btn-start-new').click();
  await page.locator('#inp-team-name').fill('Racecraft Racing');
  await page.locator('#inp-driver-name').fill('Test Driver');
  await page.locator('#inp-car-name').fill('Test Mule');
  await page.locator('#btn-create-team').click();
  await page.locator('#btn-begin-career').click();
  // Pick a real save slot in this isolated browser context. This also keeps
  // the unsaved-career reminder from interrupting an accelerated next race.
  await page.keyboard.press('Control+s');
  await page.locator('#save-slot-modal').getByRole('button', { name: 'Save Here' }).first().click();
  for (let run = 0; run < 3; run++) {
    await page.getByRole('button', { name: 'Race Weekend', exact: true }).click();
    await page.locator('#btn-start-race').click();
    await page.waitForFunction(() => window._r3d?.racing);
    const summary = await page.evaluate(() => {
      const e = window._r3d;
      cancelAnimationFrame(e._raf);
      // Accelerate the real engine, not the result calculation. Every fixed
      // physics step, incident, collision and finish crossing still executes.
      const began = performance.now();
      let attempts = 0, last = new Map(), minWarning = Infinity;
      const originalWarn = e._warn.bind(e);
      e._warn = msg => {
        originalWarn(msg);
        if (msg.startsWith('WRECK AHEAD')) {
          const victim = e.cars.find(c => c.spinning);
          if (victim) minWarning = Math.min(minWarning, (victim.z - e.player.z) / e.player.speed);
        }
      };
      for (let i = 0; i < 120 * 140 && !e.done; i++) {
        // A repeatable player strategy: line up on the nearest tow and make
        // occasional short passing attempts once a run has built.
        if (i % 45 === 0) {
          const p = e.player;
          const ahead = e.cars.filter(c => c !== p && !c.dnf && !c.spinning &&
            c.z > p.z && c.z - p.z < 120).sort((a, b) => a.z - b.z)[0];
          const target = ahead ? ahead.x : 0;
          e.keys.a = target - p.x > 0.8;
          e.keys.d = target - p.x < -0.8;
        }
        e._update(1 / 120);
        for (const c of e.cars) {
          if (c._tactic === 'pass' && last.get(c) !== 'pass') attempts++;
          last.set(c, c._tactic);
        }
      }
      e.renderer.autoClear = true;
      e.renderer.render(e.scene, e.camera);
      e.renderer.autoClear = false;
      e._renderMirror();
      const order = e.finalOrder();
      window.expectedRaceOrder = order;
      return { done: e.done, order, attempts, minWarning,
        cpuMs: performance.now() - began, wrecks: e.wreckCount,
        position: order.find(c => c.isPlayer).position };
    });
    expect(summary.done).toBe(true);
    expect(summary.order).toHaveLength(20);
    expect(new Set(summary.order.map(c => c.entrantId)).size).toBe(20);
    expect(summary.attempts).toBeGreaterThan(0);
    if (summary.minWarning !== null) expect(summary.minWarning).toBeGreaterThanOrEqual(2.8);
    await page.screenshot({ path: testInfo.outputPath('career-finish-' + run + '.png') });
    await page.locator('#r3d-finish').getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('#results-modal')).toBeVisible();
    const saved = await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('sce_slot_0'));
      const race = stored.season.calendar.find(r => r.status === 'completed' &&
        r.playerResult && r.raceNum === game.season.raceIndex);
      const rows = Array.from(document.querySelectorAll('#results-modal .result-row:not(.result-row-header)'));
      return {
        position: race?.playerResult.position,
        completed: game.season.calendar.filter(r => r.status === 'completed').length,
        rowText: rows.map(r => r.textContent),
        names: rows.map(r => r.querySelector('.res-name')?.textContent.trim()),
        positions: rows.map(r => r.querySelector('.res-pos')?.textContent.trim()).filter(Boolean),
      };
    });
    expect(saved.position).toBe(summary.position);
    expect(saved.completed).toBe(run + 1);
    expect(new Set(saved.positions).size).toBe(saved.positions.length);
    for (let i = 0; i < Math.min(10, saved.names.length); i++) {
      expect(saved.names[i]).toContain(summary.order[i].label);
    }
    console.log(JSON.stringify({ race: run + 1, position: summary.position,
      passingAttempts: summary.attempts, incidents: summary.wrecks, engineMs: Math.round(summary.cpuMs) }));
    await page.locator('#results-modal').getByRole('button', { name: /Continue|Close|Dashboard/i }).click();
  }
  expect(errors).toEqual([]);
});
