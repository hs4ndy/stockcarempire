const path = require('node:path');
const {test, expect} = require('playwright/test');

for (const difficulty of ['beginner','amateur','semipro','pro']) {
  test(`complete a contested race on ${difficulty}`, async ({page}, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      let seed = 1709;
      Math.random = () => { seed = (seed*1664525+1013904223) >>> 0; return seed/4294967296; };
    });
    await page.route('**/three.min.js', route => route.fulfill({
      path:path.resolve(__dirname,'../../node_modules/three/build/three.min.js'), contentType:'application/javascript'
    }));
    await page.goto('/');
    await page.addScriptTag({path:path.resolve(__dirname,'../helpers/race-driver.js')});
    await page.locator('#btn-quick-race').click();
    await page.locator(`#quick-race-modal [data-diff="${difficulty}"]`).click();
    await page.locator('.quick-series-btn').last().click();
    await page.waitForFunction(() => window._r3d?.racing && !window._r3d.paceMode);
    await page.evaluate(() => {
      const e = window._r3d; cancelAnimationFrame(e._raf);
      window.balanceRun = {driver:{}, steps:0, nearby:[], passing:0, joining:0, previous:new Map()};
    });
    for (const fraction of [.25,.55,.8,1.1]) {
      const report = await page.evaluate(fraction => {
        const e=window._r3d, run=window.balanceRun;
        while (!e.done && e.player.z < R3D.TRACK_LEN*fraction && run.steps < 60*140) {
          raceDriverStep(e,run.driver,1/60);
          e._update(1/60); run.steps++;
          for (const c of e.cars) {
            if (run.previous.get(c) !== c._tactic) {
              if (c._tactic === 'pass') run.passing++;
              if (['push','join','receive'].includes(c._tactic)) run.joining++;
            }
            run.previous.set(c,c._tactic);
          }
          if (run.steps%60 === 0) run.nearby.push(e.cars.filter(c => c !== e.player && !c.dnf && !c.finished && Math.abs(c.z-e.player.z)<100).length);
        }
        e.renderer.autoClear=true; e.renderer.render(e.scene,e.camera);
        e.renderer.autoClear=false; e._renderMirror(); e.renderer.autoClear=true;
        const sorted=run.nearby.slice().sort((a,b)=>a-b);
        return {done:e.done, difficulty:e.diff.id, passing:run.passing, joining:run.joining,
          nearby:sorted[Math.floor(sorted.length/2)], steps:run.steps,
          position:e.finalOrder().find(c=>c.isPlayer).position,
          count:e.finalOrder().length, unique:new Set(e.finalOrder().map(c=>c.entrantId)).size};
      },fraction);
      await page.screenshot({path:testInfo.outputPath(`race-${fraction}.png`)});
      expect(report.difficulty).toBe(difficulty);
      if (fraction > 1) {
        expect(report.done).toBe(true);
        expect(report.passing).toBeGreaterThan(5);
        expect(report.joining).toBeGreaterThan(5);
        expect(report.nearby).toBeGreaterThan(1);
        expect(report.count).toBe(36); expect(report.unique).toBe(36);
        console.log(JSON.stringify(report));
      }
    }
    expect(errors).toEqual([]);
  });
}
