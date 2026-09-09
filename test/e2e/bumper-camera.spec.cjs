const path = require('node:path');
const { test, expect } = require('playwright/test');

test('bumper trains never put a forward car inside the rear-view image', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/three.min.js', route => route.fulfill({
    path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'),
    contentType: 'application/javascript',
  }));
  await page.goto('/');
  await page.locator('#btn-quick-race').click();
  await page.locator('.quick-series-btn').last().click();
  await page.waitForFunction(() => window._r3d?.mirrorRT);
  const results = await page.evaluate(() => {
    const e = window._r3d, r = e.renderer, p = e.player;
    e.paused = true; e.paceMode = false;
    cancelAnimationFrame(e._raf);
    e.cars.forEach((c, i) => {
      c.x = 0; c.z = 6000 - i * 50; c.speed = 200; c.lv = c.lvx = 0;
      c.mesh.visible = i < 4;
      c.mesh.rotation.set(0, 0, 0);
    });
    const leader = e.cars[1], rear = e.cars[2], alongside = e.cars[3];
    rear.z = p.z - R3D.CAR_SEP_Z;
    alongside.x = 3.5; alongside.z = p.z - 1;
    rear.mesh.children.forEach(m => { m.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide }); });
    alongside.mesh.children.forEach(m => { m.material = new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide }); });
    leader.mesh.children.forEach(m => { m.material = new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide }); });
    const read = () => {
      const data = new Uint8Array(e.mirrorRT.width * e.mirrorRT.height * 4);
      r.readRenderTargetPixels(e.mirrorRT, 0, 0, e.mirrorRT.width, e.mirrorRT.height, data);
      return data;
    };
    const results = [];
    for (const gap of [4.6, 5.4, 6.8, 8]) {
      leader.z = p.z + gap;
      e.cars.forEach(c => c.mesh.position.set(c.x, 0, c.z));
      e._updateCamera(1);
      // Same rear/adjacent traffic, first without the forward car.
      leader.mesh.visible = false;
      r.autoClear = true; r.render(e.scene, e.camera);
      r.autoClear = false; e._renderMirror();
      const baseline = read();
      leader.mesh.visible = true;
      r.autoClear = true; r.render(e.scene, e.camera);
      r.autoClear = false; e._renderMirror();
      const withLeader = read();
      let changed = 0, green = 0, magenta = 0, blue = 0;
      for (let i = 0; i < baseline.length; i += 4) {
        if (Math.abs(baseline[i] - withLeader[i]) + Math.abs(baseline[i + 1] - withLeader[i + 1]) + Math.abs(baseline[i + 2] - withLeader[i + 2]) > 15) changed++;
        if (withLeader[i + 1] > 200 && withLeader[i] < 50 && withLeader[i + 2] < 50) green++;
        if (withLeader[i] > 200 && withLeader[i + 1] < 50 && withLeader[i + 2] > 200) magenta++;
        if (withLeader[i] < 50 && withLeader[i + 1] < 50 && withLeader[i + 2] > 200) blue++;
      }
      results.push({ gap, changed, green, magenta, blue,
        restored: leader.mesh.visible && rear.mesh.visible && alongside.mesh.visible && p.mesh.visible && !e.cars[4].mesh.visible,
        chaseOutside: e.cars.every(c => !c.mesh.visible || !new THREE.Box3().setFromObject(c.mesh).containsPoint(e.camera.position)),
        targetReset: r.getRenderTarget() === null });
    }
    return results;
  });
  await page.screenshot({ path: testInfo.outputPath('bumper-train-mirror.png') });
  console.log(JSON.stringify(results));
  for (const result of results) {
    expect(result.magenta, `forward body in mirror at gap ${result.gap}`).toBe(0);
    // A forward car may cast a small shadow, but must not occlude the view.
    expect(result.changed).toBeLessThan(100);
    expect(result.green, 'rear bumper car remains visible').toBeGreaterThan(100);
    expect(result.blue, 'adjacent overlapping car remains visible').toBeGreaterThan(25);
    expect(result.restored && result.chaseOutside && result.targetReset).toBe(true);
  }
  expect(errors).toEqual([]);
  const failureState = await page.evaluate(() => {
    const e = window._r3d, r = e.renderer;
    const before = e.cars.map(c => c.mesh.visible);
    const original = r.render, shadows = r.shadowMap.autoUpdate;
    let caught = false;
    r.render = function(scene, camera) {
      if (camera === e.mirrorCam) throw new Error('Test mirror render failure');
      return original.call(this, scene, camera);
    };
    try { e._renderMirror(); } catch (error) { caught = error.message === 'Test mirror render failure'; }
    finally { r.render = original; }
    return caught && e.cars.every((c, i) => c.mesh.visible === before[i]) &&
      r.shadowMap.autoUpdate === shadows && r.getRenderTarget() === null;
  });
  expect(failureState, 'failed mirror pass restores all scene visibility').toBe(true);
});
