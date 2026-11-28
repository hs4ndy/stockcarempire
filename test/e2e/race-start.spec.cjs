const { test, expect } = require('playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

for (const [width, height, players, offline] of [[1440,900,1,false],[1280,720,2,false],[390,680,2,true]]) {
  test(`rolling start at ${width}px with ${players} player(s)`, async ({ page }) => {
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
    await page.waitForFunction(() => window._r3d && document.querySelectorAll('#r3d-countdown .r3d-start-lights i').length === 6 && !document.querySelector('#r3d-countdown .lit'));
    await page.evaluate(() => {
      const engine = window._r3d;
      const cue = document.getElementById('r3d-countdown');
      window.startTrace = [];
      const record = () => {
        const {left,right,width,top,height} = cue.getBoundingClientRect();
        const style = getComputedStyle(cue);
        const text = cue.querySelector('strong');
        window.startTrace.push({
          phase:cue.textContent.replace(/\s+/g,' ').trim(), lights:cue.querySelectorAll('.lit').length,
          lampCount:cue.querySelectorAll('.r3d-start-lights i').length,
          width, height, center:(top + height/2)/innerHeight, background:style.backgroundColor, italic:text && getComputedStyle(text).fontStyle,
          grid:engine.cars.map(c=>[c.x,c.z,c.speed]), pace:engine.paceMode, racing:engine.racing, fits:left>=0 && right<=innerWidth && width<=304,
          animation:style.animationName, time:performance.now(),
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
    expect(events.map(e=>e.phase)).toEqual(['','','','','','','','Green flag','']);
    expect(events.map(e=>e.lights)).toEqual([0,1,2,3,4,5,6,0,0]);
    expect(events.slice(0,7).every(e=>e.pace && !e.racing && e.fits && e.lampCount===6)).toBe(true);
    expect(events[0].center).toBeCloseTo(width < 700 ? .44 : .33, 2);
    expect(events[0].grid.every(car=>car[2]>0)).toBe(true);
    for (let i = 1; i < 7; i++) {
      const before = events[i-1].grid;
      const distance = events[i].grid[0][1] - before[0][1];
      expect(distance).toBeGreaterThan(0);
      for (const [j, car] of events[i].grid.entries()) {
        expect(car[1] - before[j][1]).toBeCloseTo(distance, 6);
        expect(car[2]).toBe(before[j][2]);
      }
    }
    expect(events[7]).toMatchObject({
      pace:false, racing:true, fits:true, animation:offline?'none':'r3d-start-release',
      background:'rgb(33, 120, 70)', italic:'italic',
      width:events[0].width, height:events[0].height, center:events[0].center,
    });
    for (const [i, delay] of [1000,1000,1000,1000,1000,1000,1000,1100].entries()) {
      expect(events[i+1].time-events[i].time).toBeGreaterThanOrEqual(delay-(i===0 ? 500 : 60));
    }
  });
}
