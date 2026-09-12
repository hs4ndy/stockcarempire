const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('playwright/test');

for (const [label, viewport, dpr] of [
  ['desktop', { width: 1440, height: 900 }, 1],
  ['mobile', { width: 844, height: 390 }, 2],
  ['direct-file', { width: 1440, height: 900 }, 1],
]) {
  test(`Kansas-inspired straight has continuous pavement and barriers (${label})`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: dpr });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /texture|cross.origin|CORS/i.test(message.text())) errors.push(message.text());
    });
    page.on('response', response => {
      if (response.url().includes('/assets/track/') && !response.ok()) errors.push(response.url());
    });
    await page.route('**/three.min.js', route => route.fulfill({
      path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'),
      contentType: 'application/javascript',
    }));
    await page.goto(label === 'direct-file'
      ? pathToFileURL(path.resolve(__dirname, '../../index.html')).href : '/');
    await page.locator('#btn-quick-race').click();
    await page.locator('.quick-series-btn').last().click();
    await page.waitForFunction(() => {
      const group = window._r3d?.trackGroup;
      return group && window._r3d.mirrorRT && window._r3d.racing && !window._r3d.paceMode && group.children.every(m =>
        !m.material.map || m.material.map.image?.complete && m.material.map.image.naturalWidth > 0);
    });
    const report = await page.evaluate(() => {
      const e = window._r3d;
      e.paused = true; e.paceMode = false; cancelAnimationFrame(e._raf);
      e.scene.updateMatrixWorld(true);
      const meshes = e.trackGroup.children;
      const asphalt = e.trackGroup.getObjectByName('track:asphalt');
      const wall = e.trackGroup.getObjectByName('track:wall');
      const fence = e.trackGroup.getObjectByName('track:fence');
      const finish = e.finishGroup;
      const ray = new THREE.Raycaster();
      // Raycasts across multiple module joins and both race endpoints catch
      // absent/reversed instances, cracks, and off-by-one coverage errors.
      let surface = true, barriers = true;
      for (const z of [-4100, -35, 0, 59.999, 60.001, 7499.999, 7500.001, 14999, 15030, 19100]) {
        for (const x of [-10.95, 0, 10.95]) {
          ray.set(new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0));
          const hits = ray.intersectObject(asphalt);
          surface &&= hits.length > 0 && Math.abs(hits[0].point.y) < .0001;
        }
        for (const side of [-1, 1]) {
          ray.set(new THREE.Vector3(0, .6, z), new THREE.Vector3(side, 0, 0));
          const hits = ray.intersectObject(wall);
          barriers &&= hits.length > 0 && Math.abs(hits[0].distance - 11.2) < .001;
        }
      }
      const geo = meshes.map(m => m.geometry);
      const startColors = [];
      e.scene.traverse(o => {
        for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
          if (m.color) startColors.push(m.color.getHex());
        }
      });
      // Every painted square must be at the real finish, not a raised block
      // or an off-by-several-units visual finish inherited from the old gantry.
      let finishPaint = true;
      for (const x of [-10.5, -3.5, .5, 3.5, 10.5]) {
        for (const z of [R3D.TRACK_LEN - .5, R3D.TRACK_LEN + .5]) {
          ray.set(new THREE.Vector3(x, 1, z), new THREE.Vector3(0, -1, 0));
          const hits = ray.intersectObjects(finish.children);
          finishPaint &&= hits.length > 0 && Math.abs(hits[0].point.y - .014) < .0001;
        }
      }
      return {
        surface, barriers, width: R3D.TRACK_W, length: R3D.TRACK_LEN,
        finishPaint, finishAtEnd: finish.position.z === R3D.TRACK_LEN && finish.children.length === 4,
        noYellowGrid: !startColors.includes(0xf0c020),
        finite: geo.every(g => Object.values(g.attributes).every(a => Array.from(a.array).every(Number.isFinite))),
        indices: geo.every(g => Array.from(g.index.array).every(i => i >= 0 && i < g.attributes.position.count)),
        uvs: geo.every(g => g.attributes.uv.count === g.attributes.position.count),
        fenceDepth: fence.material.depthWrite && !fence.material.transparent && fence.material.alphaTest > 0,
        meshes: meshes.length,
        trianglesPerModule: geo.reduce((sum,g) => sum + g.index.count / 3, 0),
      };
    });
    for (const key of ['surface','barriers','finite','indices','uvs','fenceDepth','finishPaint','finishAtEnd','noYellowGrid']) expect(report[key], key).toBe(true);
    expect(report.width).toBe(22); expect(report.length).toBe(15000);
    expect(report.meshes).toBe(7); expect(report.trianglesPerModule).toBeLessThan(2500);

    for (const z of [120, 7500, 14960, 14990, 15020]) {
      const mirror = await page.evaluate(z => {
        const e = window._r3d, p = e.player;
        e.cars.forEach((c,i) => {
          c.x = (i % 3 - 1) * 3.3;
          c.z = z + (8-i) * 8;
          c.mesh.position.set(c.x, 0, c.z);
          c.mesh.rotation.set(0,0,0);
        });
        p.x = 0; p.z = z; p.mesh.position.set(0,0,z);
        e._updateCamera(1);
        e.renderer.autoClear = true; e.renderer.render(e.scene,e.camera);
        e.renderer.autoClear = false; e._renderMirror(); e.renderer.autoClear = true;
        const pixels = new Uint8Array(e.mirrorRT.width * e.mirrorRT.height * 4);
        e.renderer.readRenderTargetPixels(e.mirrorRT,0,0,e.mirrorRT.width,e.mirrorRT.height,pixels);
        let min = 255, max = 0;
        for (let i=0;i<pixels.length;i+=4) { min=Math.min(min,pixels[i]); max=Math.max(max,pixels[i]); }
        return max-min;
      }, z);
      expect(mirror).toBeGreaterThan(80);
      await page.screenshot({ path: testInfo.outputPath(`track-${z}.png`) });
    }
    expect(errors).toEqual([]);
    await context.close();
  });
}
