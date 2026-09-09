const path = require('node:path');
const { test, expect } = require('playwright/test');

for (const [series, fieldSize] of [[0, 20], [1, 26], [2, 36]]) {
test(`Gen-7 cars share geometry and retain identities in the ${fieldSize}-car series`, async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/three.min.js', route => route.fulfill({
    path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'),
    contentType: 'application/javascript',
  }));
  await page.goto('/');
  await page.locator('#btn-quick-race').click();
  await page.locator('.quick-series-btn').nth(series).click();
  await page.waitForFunction(() => window._r3d?.mirrorRT && window._r3d.racing && !window._r3d.paceMode);
  // Record real RAF pacing after launch. This is diagnostic, not a universal
  // FPS assertion: GPU, power mode and automated browser scheduling vary.
  const pacing = await page.evaluate(() => new Promise(resolve => {
    const samples = [];
    let last = performance.now();
    const sample = now => {
      samples.push(now - last); last = now;
      if (samples.length < 45) return requestAnimationFrame(sample);
      const steady = samples.slice(15).sort((a, b) => a - b);
      resolve({ meanMs: steady.reduce((a, b) => a + b, 0) / steady.length,
        p95Ms: steady[Math.floor(steady.length * .95)] });
    };
    requestAnimationFrame(sample);
  }));
  console.log(JSON.stringify({ fieldSize, pacing }));
  const report = await page.evaluate(() => {
    const e = window._r3d;
    e.paused = true;
    const p = e.player;
    const geometry = Object.values(e.G.parts).concat(e.G.wheel);
    const overlays = [e.G.decalRoof, e.G.teamBand];
    // Check the unrotated model envelope, not a world-axis box enlarged by a
    // legitimate steering/contact yaw after the real-time pacing sample.
    const box = new THREE.Box3();
    for (const child of p.mesh.children) {
      child.updateMatrix();
      child.geometry.computeBoundingBox();
      box.union(child.geometry.boundingBox.clone().applyMatrix4(child.matrix));
    }
    const finite = geometry.every(g => ['position', 'normal'].every(name =>
      Array.from(g.attributes[name].array).every(Number.isFinite)));
    const indexValid = geometry.every(g => Array.from(g.index.array)
      .every(index => index < g.attributes.position.count));
    const shared = e.cars.every(c =>
      c.mesh.getObjectByName('paint').geometry === e.G.parts.paint &&
      c.wheels.every(w => w.geometry === e.G.wheel));
    const before = p.wheels.map(w => w.rotation.x);
    e._animateCars(1 / 60);
    const after = p.wheels.map(w => w.rotation.x);
    const teammate = e._makeCar(1000, 0, { entrantId: 'model-test-teammate', color: '#ffffff',
      number: 88, power: .6, isPlayer: false, isTeammate: true, label: 'Model test',
      teamName: 'Model test', carId: 'model-test' });
    teammate.mesh.visible = false;
    return {
      count: e.cars.length, wheels: p.wheels.length, shared, finite, indexValid,
      model: p.mesh.name,
      overlayUVs: overlays.every(g => g.attributes.uv.count === g.attributes.position.count &&
        Array.from(g.attributes.position.array).every(Number.isFinite)),
      length: box.max.z - box.min.z,
      width: box.max.x - box.min.x,
      color: p.mesh.getObjectByName('paint').material.color.getHex() === p.hex,
      decals: p.mesh.children.filter(m => /number/.test(m.name)).length,
      rolling: after.every((v, i) => v !== before[i]),
      teammate: teammate.mesh.getObjectByName('accent').material.color.getHex() === 0xe0a800 &&
        teammate.mesh.children.some(m => m.geometry === e.G.teamBand) &&
        teammate.mesh.getObjectByName('paint').geometry === e.G.parts.paint,
      meshes: p.mesh.children.length,
      triangles: geometry.slice(0, -1).reduce((sum, g) => sum + g.index.count / 3, 0) + e.G.wheel.index.count / 3 * 4,
    };
  });
  expect(report.count).toBe(fieldSize);
  expect(report.model).toBe('Empire Gen-7');
  expect(report.overlayUVs).toBe(true);
  expect(report.length).toBeLessThanOrEqual(4.6);
  expect(report.width).toBeLessThanOrEqual(2.15);
  expect(report.wheels).toBe(4);
  expect(report.decals).toBe(3);
  for (const key of ['shared', 'finite', 'indexValid', 'color', 'rolling', 'teammate']) expect(report[key], key).toBe(true);
  expect(report.meshes).toBeLessThanOrEqual(15);
  expect(report.triangles).toBeLessThan(10000);
  await page.screenshot({ path: testInfo.outputPath('stock-car-race.png') });

  // Capture both ends in the game's actual materials and lighting, not just Blender's studio.
  for (const view of ['front', 'rear', 'side']) {
    await page.evaluate(view => {
      const e = window._r3d;
      cancelAnimationFrame(e._raf);
      e.cars.forEach(c => { c.mesh.visible = c === e.player; });
      const p = e.player;
      p.mesh.position.set(0, 0, p.z);
      e.camera.fov = 38;
      e.camera.position.set(view === 'front' ? 5.5 : -5.5, view === 'side' ? 1.8 : 3.7,
        p.z + (view === 'side' ? 0 : view === 'front' ? 7 : -7));
      e.camera.lookAt(0, .55, p.z);
      e.camera.updateProjectionMatrix();
      e.renderer.autoClear = true;
      e.renderer.render(e.scene, e.camera);
    }, view);
    await page.screenshot({ path: testInfo.outputPath(`stock-car-${view}.png`) });
  }
  expect(errors).toEqual([]);
});
}
