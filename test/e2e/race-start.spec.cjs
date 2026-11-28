const { test, expect } = require('playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

for (const [width, height, players, offline] of [[1440,900,1,false],[1280,720,2,false],[390,680,2,true]]) {
  test(`rolling start at ${width}px with ${players} player(s)`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    if (offline) await page.emulateMedia({ reducedMotion:'reduce' });
    await page.route('**/three.min.js', route => route.fulfill({
      path: path.resolve('node_modules/three/build/three.min.js'),
      contentType: 'application/javascript',
    }));
    await page.goto(offline ? pathToFileURL(path.resolve('releases/Stock-Car-Empire.html')).href : '/');
    await page.evaluate(players => {
      quickRacePlayers = players;
      handleStartQuickRace(20);
    }, players);
    await page.waitForFunction(() => window._r3d && document.getElementById('r3d-countdown')?.dataset.phase === 'formation');
    await page.evaluate(() => {
      const engine = window._r3d;
      const cue = document.getElementById('r3d-countdown');
      window.startTrace = [];
      const record = () => {
        const {left,right,width} = cue.getBoundingClientRect();
        window.startTrace.push({
          phase:cue.textContent.replace(/\s+/g,' ').trim(), lights:cue.querySelectorAll('.lit').length,
          pace:engine.paceMode, racing:engine.racing, fits:left>=0 && right<=innerWidth && width<=304,
          animation:getComputedStyle(cue).animationName, time:performance.now(),
        });
      };
      record();
      new MutationObserver(record).observe(cue, {childList:true});
    });
    const cue = page.locator('#r3d-countdown');
    await expect(cue).toContainText('Formation lap');
    if (players === 2) await expect(cue).toContainText(/Player 1 · P\d+.*Player 2 · P\d+/);
    await cue.screenshot({ path:info.outputPath('formation.png'), animations:'disabled' });
    await expect(cue).toHaveText('2');
    await cue.screenshot({ path:info.outputPath('count.png'), animations:'disabled' });
    await expect(cue).toHaveText('Green flag');
    await cue.screenshot({ path:info.outputPath('green.png'), animations:'disabled' });
    await expect(cue).toBeHidden();
    const events = await page.evaluate(() => window.startTrace);
    expect(events.map(e=>e.phase)).toEqual([expect.stringContaining('Formation lap'),'3','2','1','Green flag','']);
    expect(events.map(e=>e.lights)).toEqual([0,1,2,3,0,0]);
    expect(events.slice(0,4).every(e=>e.pace && !e.racing && e.fits)).toBe(true);
    expect(events[4]).toMatchObject({ pace:false, racing:true, fits:true, animation:offline?'none':'r3d-start-release' });
    for (const [i, delay] of [3000,1000,1000,1000,1100].entries()) {
      expect(events[i+1].time-events[i].time).toBeGreaterThanOrEqual(delay-(i===0 ? 500 : 60));
    }
  });
}
