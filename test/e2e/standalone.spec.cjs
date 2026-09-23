const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('playwright/test');

test('standalone game launches directly from a local file without network assets', async ({ page }) => {
  const errors = [];
  const remoteRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (!request.url().startsWith('file:')) remoteRequests.push(request.url());
  });

  const standalone = pathToFileURL(path.resolve(__dirname, '../../releases/Stock-Car-Empire.html')).href;
  await page.goto(standalone);
  await page.locator('#btn-quick-race').click();
  await page.locator('.quick-series-btn').first().click();
  await page.waitForFunction(() => window._r3d?.racing && window._r3d?.mirrorRT);

  const report = await page.evaluate(() => {
    const race = window._r3d;
    const track = race.trackGroup;
    const road = track.getObjectByName('track:asphalt');
    const wall = track.getObjectByName('track:wall');
    const fence = track.getObjectByName('track:fence');
    cancelAnimationFrame(race._raf);
    race.destroy();
    return {
      title: document.title,
      road: !!road,
      wall: !!wall,
      fence: !!fence,
      legacyPlayer: race.player.mesh.name === 'Empire SC-01',
    };
  });

  expect(report).toEqual({
    title: 'Stock Car Empire Beta', road: true, wall: true, fence: true, legacyPlayer: true,
  });
  await page.goto(standalone);
  await page.locator('#btn-start-new').click();
  await page.locator('#inp-team-name').fill('Offline Team');
  await page.locator('#inp-driver-name').fill('Offline Driver');
  await page.locator('#inp-car-name').fill('Offline Car');
  await page.locator('#btn-create-team').click();
  await page.locator('#btn-begin-career').click();
  await expect(page.locator('#career-tutorial-title')).toHaveText('Learn the ropes');
  expect(remoteRequests).toEqual([]);
  expect(errors).toEqual([]);
});
