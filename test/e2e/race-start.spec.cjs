const { test, expect } = require('playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

for (const [width, height, players, offline] of [[1440,900,1,false],[1280,720,2,false],[390,680,2,true]]) {
  test(`standing start at ${width}px with ${players} player(s)`, async ({ page }) => {
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
    await page.waitForFunction(() => window._r3d && document.getElementById('r3d-countdown')?.textContent === '5');
    await page.evaluate(() => {
      const engine = window._r3d;
      const cue = document.getElementById('r3d-countdown');
      window.startTrace = [];
      const record = () => {
        const {left,right,width} = cue.getBoundingClientRect();
        window.startTrace.push({
          phase:cue.textContent.replace(/\s+/g,' ').trim(), lights:cue.querySelectorAll('.lit').length,
          grid:engine.cars.map(c=>[c.x,c.z,c.speed]), pace:engine.paceMode, racing:engine.racing, fits:left>=0 && right<=innerWidth && width<=304,
          animation:getComputedStyle(cue).animationName, time:performance.now(),
        });
      };
      record();
      new MutationObserver(record).observe(cue, {childList:true});
    });
    const cue = page.locator('#r3d-countdown');
    await page.keyboard.down('a');
    await expect(cue).toBeHidden();
    await page.keyboard.up('a');
    const events = await page.evaluate(() => window.startTrace);
    expect(events.map(e=>e.phase)).toEqual(['5','4','3','2','1','Green flag','']);
    expect(events.map(e=>e.lights)).toEqual([1,2,3,4,5,0,0]);
    expect(events.slice(0,5).every(e=>e.pace && !e.racing && e.fits)).toBe(true);
    expect(events[0].grid.every(car=>car[2]===0)).toBe(true);
    for (const beat of events.slice(1,5)) expect(beat.grid).toEqual(events[0].grid);
    expect(events[5]).toMatchObject({ pace:false, racing:true, fits:true, animation:offline?'none':'r3d-start-release' });
    for (const [i, delay] of [1000,1000,1000,1000,1000,1100].entries()) {
      expect(events[i+1].time-events[i].time).toBeGreaterThanOrEqual(delay-(i===0 ? 500 : 60));
    }
  });
}
