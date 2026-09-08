const path = require('node:path');
const { test, expect } = require('playwright/test');

test('Blender stock cars share geometry, retain identities and render in a full field', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/three.min.js', route => route.fulfill({
    path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'),
    contentType: 'application/javascript',
  }));
  await page.goto('/');
  await page.locator('#btn-quick-race').click();
  await page.locator('.quick-series-btn').last().click();
  await page.waitForFunction(() => window._r3d?.mirrorRT && window._r3d.racing && !window._r3d.paceMode);
  const report = await page.evaluate(() => {
    const e = window._r3d;
    e.paused = true;
    const p = e.player;
    const geometry = Object.values(e.G.parts).concat(e.G.wheel);
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
    return {
      count: e.cars.length, wheels: p.wheels.length, shared, finite, indexValid,
      color: p.mesh.getObjectByName('paint').material.color.getHex() === p.hex,
      decals: p.mesh.children.filter(m => /number/.test(m.name)).length,
      rolling: after.every((v, i) => v !== before[i]),
      meshes: p.mesh.children.length,
      triangles: geometry.slice(0, -1).reduce((sum, g) => sum + g.index.count / 3, 0) + e.G.wheel.index.count / 3 * 4,
    };
  });
  expect(report.count).toBe(36);
  expect(report.wheels).toBe(4);
  expect(report.decals).toBe(3);
  for (const key of ['shared', 'finite', 'indexValid', 'color', 'rolling']) expect(report[key], key).toBe(true);
  expect(report.meshes).toBeLessThanOrEqual(15);
  expect(report.triangles).toBeLessThan(10000);
  await page.screenshot({ path: testInfo.outputPath('stock-car-race.png') });

  // Capture both ends in the game's actual materials and lighting, not just Blender's studio.
  for (const view of ['front', 'rear']) {
    await page.evaluate(view => {
      const e = window._r3d;
      cancelAnimationFrame(e._raf);
      e.cars.forEach(c => { c.mesh.visible = c === e.player; });
      const p = e.player;
      p.mesh.position.set(0, 0, p.z);
      e.camera.fov = 38;
      e.camera.position.set(view === 'front' ? 5.5 : -5.5, 3.7, p.z + (view === 'front' ? 7 : -7));
      e.camera.lookAt(0, .55, p.z);
      e.camera.updateProjectionMatrix();
      e.renderer.autoClear = true;
      e.renderer.render(e.scene, e.camera);
    }, view);
    await page.screenshot({ path: testInfo.outputPath(`stock-car-${view}.png`) });
  }
  expect(errors).toEqual([]);
});
