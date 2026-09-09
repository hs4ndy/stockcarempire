// Optional like-for-like renderer diagnostic. Start test/static-server.cjs first.
// Usage: node tools/benchmark_stock_car.cjs [baseline git ref]
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

(async () => {
  const ref = process.argv[2];
  const browser = await chromium.launch();
  try {
    const reports = [];
    for (const baseline of ref ? [true, false] : [false]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.route('**/three.min.js', route => route.fulfill({
        path: path.resolve(__dirname, '../node_modules/three/build/three.min.js'),
        contentType: 'application/javascript',
      }));
      if (baseline) {
        for (const file of ['js/race3d.js', 'assets/cars/stock-car-model.js']) {
          const body = execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8', maxBuffer: 5e6 });
          await page.route(`**/${file}`, route => route.fulfill({ body, contentType: 'application/javascript' }));
        }
      }
      await page.goto('http://127.0.0.1:4174');
      await page.locator('#btn-quick-race').click();
      await page.locator('.quick-series-btn').last().click();
      await page.waitForFunction(() => window._r3d?.mirrorRT);
      const report = await page.evaluate(async () => {
        const e = window._r3d, r = e.renderer;
        e.paused = true; e.paceMode = false; cancelAnimationFrame(e._raf);
        // Identical dense pack and pose for both versions, no random AI moves.
        e.cars.forEach((c, i) => {
          c.x = (i % 3 - 1) * 3.5; c.z = 6000 + (Math.floor(i / 3) - 6) * 5;
          c.speed = 200; c.lv = c.lvx = 0;
          c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.set(0, 0, 0);
        });
        e._updateCamera(1);
        const gl = r.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
        const samples = [];
        for (let i = 0; i < 40; i++) {
          await new Promise(requestAnimationFrame);
          const start = performance.now();
          r.autoClear = true; r.render(e.scene, e.camera);
          r.autoClear = false; e._renderMirror();
          // Synchronize GPU work so command submission time is not mistaken
          // for frame time. This intentionally differs from normal gameplay.
          gl.finish();
          if (i >= 10) samples.push(performance.now() - start);
        }
        samples.sort((a, b) => a - b);
        return { model: e.player.mesh.name, field: e.cars.length,
          renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
          medianRenderMs: samples[Math.floor(samples.length / 2)],
          p95RenderMs: samples[Math.floor(samples.length * .95)],
          geometryBuffers: r.info.memory.geometries };
      });
      reports.push({ version: baseline ? ref : 'working tree', ...report });
      await page.close();
    }
    console.log(JSON.stringify(reports, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
