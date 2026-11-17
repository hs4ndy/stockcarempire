const {test, expect} = require('playwright/test');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

for (const [preset, players, file, series] of [
  ['medium', 1, 'index.html', 0],
  ['low', 2, 'index.html', 2],
  ['high', 1, 'index.html', 0],
  ['high', 2, 'releases/Stock-Car-Empire.html', 2],
]) {
  test(`Graphics preset ${preset} controls ${players}-player rendering (${file})`, async ({page}) => {
    await page.setViewportSize({width:1024,height:640});
    await page.route('**/three.min.js', route => route.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));
    await page.goto(pathToFileURL(path.resolve(file)).href);
    await page.evaluate(() => {
      localStorage.setItem('sce_graphics_mode', 'high');
      newGame('Team', 'Driver', 'Car');
      game.tutorial.status = 'skipped';
      enterGame();
      showTab('settings');
    });
    await expect(page.locator('#career-race-graphics')).toHaveValue('medium');
    await page.locator('#career-race-graphics').selectOption(preset);
    await page.reload();
    await page.locator('#btn-quick-race').click();
    await expect(page.locator('#quick-race-graphics')).toHaveValue(preset);
    await page.locator('.quick-series-btn').nth(series).click();
    await page.locator('#quick-next').click();
    await page.evaluate(players => setQuickRacePlayers(players), players);
    await page.locator('#btn-quick-race-confirm').click();
    await page.waitForFunction(() => window._r3d?.mirrorRT &&
      (window._r3d.paceMode || window._r3d.racing));
    const report = await page.evaluate(() => {
      const engine = window._r3d;
      const meshes = [...engine.trackGroup.children, ...engine.environmentGroup.children];
      const maps = meshes.map(mesh => mesh.material.map).filter(Boolean);
      const report = {
        preset: engine.graphicsMode,
        maps: maps.map(map => map.userData.loadState),
        shadows: engine.renderer.shadowMap.enabled,
        pixels: engine.canvas.width * engine.canvas.height,
        secondPlayer: !!engine.player2,
      };
      engine.destroy();
      return report;
    });
    expect(report.preset).toBe(preset);
    expect(report.secondPlayer).toBe(players === 2);
    expect(report.shadows).toBe(preset === 'high');
    if (preset === 'high') {
      expect(report.maps.length).toBeGreaterThanOrEqual(5);
      expect(report.maps.every(state => state === 'loaded')).toBe(true);
    } else {
      expect(report.maps).toEqual([]);
      expect(report.pixels).toBeLessThanOrEqual(preset === 'low' ? 750000 : 1350000);
    }
  });
}
