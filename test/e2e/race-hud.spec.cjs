const path = require('node:path');
const { test, expect } = require('playwright/test');
const { pathToFileURL } = require('node:url');

for (const [series, name] of [[0, 'Grassroots'], [1, 'Challenger'], [2, 'Premier']]) {
  test(`${name} HUD maps lateral positions correctly and uses compact translucent panels`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.route('**/three.min.js', route => route.fulfill({ path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'), contentType: 'application/javascript' }));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(process.env.STOCKCAR_TEST_FILE ? pathToFileURL(path.resolve(process.env.STOCKCAR_TEST_FILE)).href : '/');
    await page.locator('#btn-quick-race').click();
    await page.locator('.quick-series-btn').nth(series).click();
    await page.locator('#btn-quick-race-confirm').click();
    await page.waitForFunction(() => window._r3d?.mirrorRT);
    // Freeze physics while leaving the real camera and WebGL render loop active.
    const lateral = await page.evaluate(() => {
      const engine = window._r3d;
      engine.done = true;
      engine.paused = false;
      document.getElementById('r3d-countdown').style.display = 'none';
      const hw = engine.trackHalfWidth ?? R3D.HALF_W;
      const [leftCar, rightCar, centreCar] = engine.cars;
      leftCar.x = hw / 2; rightCar.x = -hw / 2; centreCar.x = 0;
      engine.cars.forEach((car, i) => { car.z = 5500 + i * 8; car.speed = 210; car.mesh.position.set(car.x, 0, car.z); });
      engine._updateCamera(1);
      engine._updateHUD(1);
      return { left: parseFloat(leftCar._dot.style.left), right: parseFloat(rightCar._dot.style.left), centre: parseFloat(centreCar._dot.style.left) };
    });
    expect(lateral.left).toBeLessThan(50);
    expect(lateral.right).toBeGreaterThan(50);
    expect(lateral.centre).toBe(50);
    await expect(page.locator('.r3d-order-head')).toHaveText('Leaderboard');
    await expect(page.locator('.r3d-mirror-label')).toHaveCount(0);
    await expect(page.locator('.r3d-progress-label')).toHaveText('StartFinish');
    const sizes = await page.evaluate(() => {
      const alpha = selector => {
        const color = getComputedStyle(document.querySelector(selector)).backgroundColor;
        return color.startsWith('rgba') ? Number(color.match(/,\s*([\d.]+)\)$/)[1]) : 1;
      };
      return { tower: document.querySelector('.r3d-order').getBoundingClientRect().width,
        telemetry: document.querySelector('.r3d-telemetry').getBoundingClientRect().width,
        mirror: document.getElementById('r3d-mirror-wrap').getBoundingClientRect().width,
        panels: ['.r3d-order', '.r3d-telemetry', '.r3d-map', '.r3d-pause-btn'].map(alpha),
        textOpacity: getComputedStyle(document.querySelector('.r3d-order-name')).opacity };
    });
    expect(sizes.tower).toBeLessThan(236);
    expect(sizes.telemetry).toBeLessThan(250);
    expect(sizes.mirror).toBeLessThan(640);
    for (const alpha of sizes.panels) { expect(alpha).toBeGreaterThanOrEqual(.65); expect(alpha).toBeLessThan(1); }
    expect(sizes.textOpacity).toBe('1');
    const capture = async suffix => {
      await page.waitForTimeout(180);
      await page.evaluate(() => {
        const engine = window._r3d;
        cancelAnimationFrame(engine._raf);
        engine.renderer.autoClear = true;
        engine.renderer.render(engine.scene, engine.camera);
        engine.renderer.autoClear = false;
        engine._renderMirror();
        engine.renderer.autoClear = true;
      });
      const fits = await page.evaluate(() => {
        const mirror = document.getElementById('r3d-mirror-wrap').getBoundingClientRect();
        const pause = document.getElementById('r3d-pause-btn').getBoundingClientRect();
        const tele = document.querySelector('.r3d-telemetry').getBoundingClientRect();
        const bar = document.querySelector('.r3d-progress-wrap').getBoundingClientRect();
        return { mirrorClear: mirror.right < pause.left, controlsVisible: pause.height >= 44,
          teleFits: tele.left >= 0 && tele.right <= innerWidth && tele.bottom <= innerHeight,
          progressClear: bar.bottom < tele.top || bar.left > tele.right, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      expect(fits).toEqual({ mirrorClear: true, controlsVisible: true, teleFits: true, progressClear: true, overflow: false });
      await page.screenshot({ path: path.resolve(__dirname, `../../.impeccable/review/race-hud-${name.toLowerCase()}-${suffix}.png`) });
    };
    await capture('desktop');
    await page.evaluate(() => { window._r3d.done = false; window._r3d.paused = false; });
    await page.locator('#r3d-pause-btn').click();
    await expect(page.locator('#r3d-pause-overlay')).toHaveClass(/active/);
    await page.locator('#r3d-pause-resume').click();
    await expect(page.locator('#r3d-pause-overlay')).not.toHaveClass(/active/);
    await page.evaluate(() => { window._r3d.done = true; });
    if (series === 2) {
      for (const [suffix, viewport] of [['mobile', {width:375,height:812}], ['landscape', {width:844,height:390}]]) {
        await page.setViewportSize(viewport);
        await capture(suffix);
      }
    }
    await page.evaluate(() => window._r3d.destroy());
  });
}
