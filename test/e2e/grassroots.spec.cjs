const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('playwright/test');

test('Grassroots has its own track, legacy cars and 90-percent player and AI pace', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/three.min.js', route => route.fulfill({
    path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'),
    contentType: 'application/javascript',
  }));
  for (const series of [0, 1, 2]) {
    await page.goto('/');
    await page.locator('#btn-quick-race').click();
    await page.locator('.quick-series-btn').nth(series).click();
    await page.waitForFunction(() => window._r3d?.mirrorRT && window._r3d.trackGroup.children.every(m =>
      !m.material.map || m.material.map.image?.complete && m.material.map.image.naturalWidth > 0));
    const report = await page.evaluate(() => {
      const e = window._r3d;
      cancelAnimationFrame(e._raf); e.paused = true; e.paceMode = false;
      const actualScale = e.speedScale;
      const roster = e.cars;
      const p = e.player, ai = roster.find(c => !c.isPlayer);
      // Identical clean-air states isolate the actual longitudinal speed targets.
      const pace = (car, scale) => {
        e.speedScale = scale; e.cars = [car];
        Object.assign(car, { x: 0, z: 500, speed: 0, lv: 0, lvx: 0, draftBoost: 0,
          finished: false, dnf: false, spinning: false, targetX: 0 });
        e.keys = { a: false, d: false, s: false };
        if (car.isPlayer) e._updatePlayer(.1); else e._updateAI(.1);
        return car.speed;
      };
      const playerRatio = pace(p, actualScale) / pace(p, 1);
      const aiRatio = pace(ai, actualScale) / pace(ai, 1);
      e.speedScale = actualScale; e.cars = roster;
      const half = e.trackHalfWidth;
      p.x = half; p.lv = 2; e.keys.a = true; e._updatePlayer(.1);
      const contactInside = p.x + 1.075 < e.trackGroup.userData.wallInnerX;
      e.scene.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      let surface = true, walls = true;
      for (const z of [59.999, 60.001, 14999]) {
        ray.set(new THREE.Vector3(half - .1, 2, z), new THREE.Vector3(0, -1, 0));
        surface &&= ray.intersectObject(e.trackGroup.getObjectByName('track:asphalt')).length > 0;
        for (const sign of [-1, 1]) {
          ray.set(new THREE.Vector3(0, .6, z), new THREE.Vector3(sign, 0, 0));
          const hit = ray.intersectObject(e.trackGroup.getObjectByName('track:wall'))[0];
          walls &&= !!hit && Math.abs(hit.distance - e.trackGroup.userData.wallInnerX) < .001;
        }
      }
      e.cars.forEach((c, i) => {
        c.x = (i % 2 ? -1 : 1) * 3.5; c.z = 500 + (4 - i) * 10;
        c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.set(0,0,0);
      });
      p.x = 0; p.z = 500; p.mesh.position.set(0,0,500);
      e._updateCamera(1); e.renderer.render(e.scene, e.camera); e._renderMirror();
      const pixels = new Uint8Array(e.mirrorRT.width * e.mirrorRT.height * 4);
      e.renderer.readRenderTargetPixels(e.mirrorRT, 0, 0, e.mirrorRT.width, e.mirrorRT.height, pixels);
      let min=255, max=0;
      for(let i=0;i<pixels.length;i+=4){min=Math.min(min,pixels[i]); max=Math.max(max,pixels[i]);}
      return { playerRatio, aiRatio, surface, walls, contactInside,
        mirrorRange: max-min, ...e.trackGroup.userData,
        model: p.mesh.name, allSameModel: e.cars.every(c => c.mesh.name === p.mesh.name),
        absorber: !!e.trackGroup.getObjectByName('track:absorber'),
      };
    });
    expect(report.playerRatio).toBeCloseTo(series === 0 ? .9 : 1, 6);
    expect(report.aiRatio).toBeCloseTo(series === 0 ? .9 : 1, 6);
    expect(report.width).toBeCloseTo(series === 0 ? 20.68 : 22);
    expect(report.fenceHeight).toBeCloseTo(series === 0 ? 4.1156 : 6.48);
    expect(report.model).toBe(series === 0 ? 'Empire SC-01' : 'Empire Gen-7');
    expect(report.absorber).toBe(series !== 0);
    for(const key of ['surface','walls','contactInside','allSameModel']) expect(report[key], key).toBe(true);
    expect(report.mirrorRange).toBeGreaterThan(30);
    await page.screenshot({ path: testInfo.outputPath(`series-${series}.png`) });
    await page.evaluate(() => window._r3d.destroy());
  }
  // Verify the new embedded textures also load from the user's local HTML file.
  await page.goto(pathToFileURL(path.resolve(__dirname, '../../index.html')).href);
  await page.locator('#btn-quick-race').click();
  await page.locator('.quick-series-btn').first().click();
  await page.waitForFunction(() => window._r3d?.trackGroup.children.every(m =>
    !m.material.map || m.material.map.image?.complete && m.material.map.image.naturalWidth > 0));
  await page.evaluate(() => window._r3d.destroy());
  expect(errors).toEqual([]);
});
