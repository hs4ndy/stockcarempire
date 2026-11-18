const {test, expect} = require('playwright/test');
const path = require('node:path');

test('chase and mirror culling preserve the picture for widely separated players', async ({page}) => {
  await page.route('**/three.min.js', route => route.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));
  await page.goto('/');
  await page.evaluate(() => { quickRacePlayers = 2; handleStartQuickRace(40); });
  await page.waitForFunction(() => window._r3d?.mirrorRT);
  const views = await page.evaluate(() => {
    const e = window._r3d, r = e.renderer;
    cancelAnimationFrame(e._raf);
    const meshes = [...e.trackGroup.children, ...e.environmentGroup.children, ...e.grandstandGroup.children];
    const callbacks = meshes.map(m => m.onBeforeRender);
    const target = new THREE.WebGLRenderTarget(320, 180);
    const render = camera => {
      r.setRenderTarget(target);
      r.autoClear = true;
      r.render(e.scene, camera);
      const triangles = r.info.render.triangles;
      const pixels = new Uint8Array(target.width * target.height * 4);
      r.readRenderTargetPixels(target, 0, 0, target.width, target.height, pixels);
      return {pixels, triangles};
    };
    const reports = [];
    try {
      for (const [player, z] of [[e.player, 530], [e.player2, 12973]]) {
        player.z = z;
        player.mesh.position.z = z;
        if (player === e.player2) e._withSecond(() => e._updateCamera(1));
        else e._updateCamera(1);
        for (const facing of [-1, 1]) {
          const camera = new THREE.PerspectiveCamera(59, 16 / 9, .5, 4000);
          camera.position.set(1, 5, z - facing * 7);
          camera.lookAt(0, 1, z + facing * 24);
          const optimized = render(camera);
          meshes.forEach(mesh => { mesh.onBeforeRender = () => {}; });
          const full = render(camera);
          meshes.forEach((mesh, i) => { mesh.onBeforeRender = callbacks[i]; });
          let changed = 0;
          for (let i = 0; i < full.pixels.length; i += 4) {
            if (Math.abs(full.pixels[i] - optimized.pixels[i]) > 8) changed++;
          }
          reports.push({changed, ratio:optimized.triangles / full.triangles});
        }
      }
      e._captureFinishPhoto(e.player);
      if (!e.finishPhoto?.canvas) throw Error('Missing finish photograph');
    } finally {
      r.setRenderTarget(null);
      target.dispose();
      e.destroy();
    }
    return reports;
  });
  for (const {changed, ratio} of views) {
    expect(changed).toBeLessThan(320 * 180 * .001);
    expect(ratio).toBeLessThan(.85);
  }
});
