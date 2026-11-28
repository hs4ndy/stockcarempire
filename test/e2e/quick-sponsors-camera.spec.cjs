const { test, expect } = require('playwright/test');
const { chooseHomeAction } = require('../helpers/home-menu.cjs');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

for (const [series, players] of [[0,1],[1,1],[2,2]]) {
  test(`Series ${series} Quick Race decals and camera cycle`, async ({page}, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/three.min.js', route => route.fulfill({
      path:path.resolve('node_modules/three/build/three.min.js'),
      contentType:'application/javascript',
    }));
    await page.goto(series === 2 ? pathToFileURL(path.resolve('releases/Stock-Car-Empire.html')).href : '/');
    await chooseHomeAction(page, players === 2 ? '#btn-dual-race' : '#btn-quick-race');
    await page.locator('.quick-series-btn').nth(series).click();
    await page.locator('#quick-next').click();
    const ids = await page.evaluate(() => Object.keys(SC_HOOD_LOGOS));
    const sponsorIds = [ids[0], ids.at(-1)];
    for (let i=0; i<players; i++) {
      const customize = page.locator(`#quick-player-${i+1} .car-studio-open`);
      await customize.click();
      const sponsor = page.locator('#studio-sponsor');
      expect((await sponsor.locator('option').evaluateAll(rows => rows.map(row=>row.value))).sort()).toEqual(['',...ids].sort());
      await sponsor.selectOption(sponsorIds[i]);
      expect(await page.evaluate(id => {
        const m = carStudio.preview.mesh.getObjectByName('Primary hood sponsor');
        return m.visible && m.material.map === hoodLogoTexture(id);
      }, sponsorIds[i])).toBe(true);
      await page.getByRole('button',{name:'Save Appearance'}).click();
      await customize.click();
      await expect(sponsor).toHaveValue(sponsorIds[i]);
      await sponsor.selectOption('');
      expect(await page.evaluate(() => carStudio.preview.mesh.getObjectByName('Primary hood sponsor').visible)).toBe(false);
      await page.getByRole('button',{name:'Cancel',exact:true}).click();
    }
    await page.locator('#btn-quick-race-confirm').click();
    await page.waitForFunction(() => window._r3d?.paceMode);
    await expect(page.locator('#r3d-hint')).toContainText(/C\s+Camera/);
    expect(await page.evaluate(ids => {
      const e = window._r3d;
      return [e.player, ...(e.player2 ? [e.player2] : [])].every((p,i) =>
        p.mesh.getObjectByName('Primary hood sponsor')?.material.map === hoodLogoTexture(ids[i]));
    }, sponsorIds)).toBe(true);

    const followDistance = () => page.evaluate(() => window._r3d.player.z - window._r3d.camera.position.z);
    const initial = await followDistance();
    await page.keyboard.press('c');
    await page.waitForFunction(() => window._r3d.player.cameraView === 1 && window._r3d.player.z - window._r3d.camera.position.z < 15);
    expect(await followDistance()).toBeLessThan(initial);
    await page.keyboard.press('c');
    await page.waitForFunction(() => window._r3d.player.cameraView === 2 && window._r3d.camera.position.y < 2);
    const mounted = await page.evaluate(() => {
      const e = window._r3d;
      const pose = e.player.mesh.worldToLocal(e.camera.position.clone());
      return { x:pose.x, y:pose.y, z:pose.z, p2:e.player2?.cameraView ?? 0 };
    });
    expect(mounted.x).toBeCloseTo(.29,2);
    expect(mounted.y).toBeCloseTo(series === 0 ? 1.46 : 1.42,2);
    expect(mounted.z).toBeCloseTo(series === 0 ? .49 : .44,2);
    expect(mounted.p2).toBe(0);
    await page.screenshot({path:info.outputPath('roof-camera.png')});
    await page.keyboard.press('c');
    if (players === 2) {
      await expect(page.locator('#r3d-hint')).toContainText(/N\s+Camera/);
      await page.keyboard.press('n');
      await page.keyboard.press('n');
    }
    expect(await page.evaluate(() => [window._r3d.player.cameraView,window._r3d.player2?.cameraView ?? 0]))
      .toEqual([0,players === 2 ? 2 : 0]);
    expect(errors).toEqual([]);
  });
}
