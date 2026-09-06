const path = require('node:path');
const { test, expect } = require('playwright/test');

const THREE_BUILD = path.resolve(__dirname, '../../node_modules/three/build/three.min.js');

test.beforeEach(async ({ page }) => {
  // The game uses a CDN in production. Route it to the identical r134 build so
  // tests remain deterministic and work without internet access.
  await page.route('**/three.min.js', route => route.fulfill({
    path: THREE_BUILD,
    contentType: 'application/javascript',
  }));
});

test('a new career completes both setup steps and creates a 20-entry field', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await page.locator('#btn-start-new').click();
  await page.locator('#inp-team-name').fill('Regression Racing');
  await page.locator('#inp-driver-name').fill('Taylor Tester');
  await page.locator('#inp-car-name').fill('Test Mule');
  await page.locator('#btn-create-team').click();
  await expect(page.locator('#setup-difficulty')).toBeVisible();
  await page.locator('#btn-begin-career').click();

  await expect(page.getByText('of 20 entries', { exact: true })).toBeVisible();
  await expect(page.locator('#screen-game')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('rear-view mirror stays readable and renders correctly across five real 3D launches', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  for (let run = 1; run <= 5; run++) {
    await page.setViewportSize({ width: [1440, 1024, 768, 390, 1440][run - 1], height: 900 });
    await page.goto('/');
    await page.locator('#btn-quick-race').click();
    await page.locator('.quick-series-btn').first().click();

    await expect(page.locator('#r3d-canvas')).toBeVisible();
    await expect(page.locator('#r3d-mirror-wrap')).toBeVisible();
    await page.waitForFunction(() => Boolean(window._r3d && window._r3d.mirrorRT));

    const mirror = await page.evaluate(() => {
      const engine = window._r3d;
      const wrap = document.getElementById('r3d-mirror-wrap');
      const canvas = document.getElementById('r3d-canvas');
      const direction = engine.mirrorCam.getWorldDirection(new THREE.Vector3());
      const aspect = wrap.clientWidth / wrap.clientHeight;
      const verticalFov = engine.mirrorCam.fov * Math.PI / 180;
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect) * 180 / Math.PI;
      const bounds = wrap.getBoundingClientRect();
      const canvasBounds = canvas.getBoundingClientRect();
      return {
        directionZ: direction.z,
        horizontalFov,
        targetWidth: engine.mirrorRT.texture.image.width,
        targetHeight: engine.mirrorRT.texture.image.height,
        mirrorWidth: bounds.width,
        mirrorHeight: bounds.height,
        insideCanvas: bounds.left >= canvasBounds.left && bounds.right <= canvasBounds.right &&
          bounds.top >= canvasBounds.top && bounds.bottom <= canvasBounds.bottom,
        textureFlipped: engine.mirrorRT.texture.repeat.x === -1 && engine.mirrorRT.texture.offset.x === 1,
      };
    });

    expect(mirror.directionZ).toBeLessThan(-0.9);
    expect(mirror.horizontalFov).toBeCloseTo(68, 0);
    expect(mirror.targetWidth).toBeGreaterThan(1);
    expect(mirror.targetHeight).toBeGreaterThan(1);
    expect(mirror.mirrorWidth / mirror.mirrorHeight).toBeGreaterThan(2);
    expect(mirror.insideCanvas).toBe(true);
    expect(mirror.textureFlipped).toBe(true);

    await page.evaluate(() => window._r3d?.destroy());
  }

  expect(pageErrors).toEqual([]);
});
