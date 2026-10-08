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

test('sports career UI stays flat and free of decorative icons and em dashes', async ({ page }) => {
  await page.goto('/');
  const audit = await page.evaluate(async () => {
    const paths = [
      '/index.html', '/style.css', '/js/data.js', '/js/game.js',
      '/js/race.js', '/js/race3d.js', '/js/ui.js', '/js/main.js',
    ];
    const source = (await Promise.all(paths.map(async path => (await fetch(path)).text()))).join('\n');
    return {
      computedGradients: [...document.querySelectorAll('*')]
        .filter(el => getComputedStyle(el).backgroundImage.includes('gradient')).length,
      sourceGradient: /(?:linear|radial|conic|repeating-[a-z-]*)-gradient\s*\(/i.test(source),
      emDash: source.includes('\u2014'),
      emoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(source),
      iconMarkup: /class=["'][^"']*\bicon\b/i.test(source),
      iconData: /\bicon\s*:/i.test(source),
    };
  });
  expect(audit).toEqual({
    computedGradients: 0,
    sourceGradient: false,
    emDash: false,
    emoji: false,
    iconMarkup: false,
    iconData: false,
  });
});

for (const [label, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['laptop', { width: 1024, height: 768 }],
  ['tablet', { width: 768, height: 900 }],
  ['mobile', { width: 375, height: 812 }],
]) {
  test(`sports career dashboard preserves responsive panel alignment (${label})`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#btn-start-new').click();
    await page.locator('#inp-team-name').fill('Apex Test Racing');
    await page.locator('#inp-driver-name').fill('Taylor Tester');
    await page.locator('#inp-car-name').fill('Test Mule');
    await page.locator('#btn-create-team').click();
    await page.locator('#btn-begin-career').click();
    await page.locator('#career-tutorial [data-tutorial-action="skip"]').click();
    await expect(page.locator('.dashboard-grid .card')).toHaveCount(4);
    await page.waitForTimeout(250);
    await page.evaluate(() => document.getElementById('toast-container').replaceChildren());
    await page.keyboard.press('Tab');
    const audit = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.dashboard-grid .card')];
      const borders = cards.map(card => {
        const s = getComputedStyle(card);
        return [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth];
      });
      const selection = getComputedStyle(document.querySelector('.nav-btn.active'));
      const header = getComputedStyle(cards[0].querySelector('.card-header'));
      const gameHeader = getComputedStyle(document.querySelector('.game-header'));
      const gameNav = getComputedStyle(document.querySelector('.game-nav'));
      const focus = getComputedStyle(document.activeElement).outlineStyle;
      const panelRects = cards.map(card => {
        const r = card.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      });
      const metricTops = [...document.querySelectorAll('.cmd-cell')]
        .map(cell => cell.getBoundingClientRect().top);
      return {
        borders,
        selectionColor: selection.backgroundColor,
        selectionInk: selection.color,
        headerDivider: gameHeader.borderBottomWidth,
        navDivider: gameNav.borderBottomWidth,
        navAccentCount: document.querySelectorAll('.nav-flag-accent').length,
        headerBorder: header.borderBottomWidth,
        bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        focus,
        panelRects,
        metricTops,
      };
    });
    expect(audit.borders.flat().every(width => width === '0px')).toBe(true);
    expect(audit.selectionColor).toBe('rgb(245, 245, 242)');
    expect(audit.selectionInk).toBe('rgb(19, 21, 23)');
    expect(audit.headerDivider).toBe('1px');
    expect(audit.navDivider).toBe('1px');
    expect(audit.navAccentCount).toBe(0);
    expect(audit.headerBorder).toBe('0px');
    expect(audit.bodyOverflow).toBe(0);
    expect(audit.focus).not.toBe('none');
    if (viewport.width > 640) {
      for (const [a, b] of [[0, 1], [2, 3]]) {
        expect(Math.abs(audit.panelRects[a].top - audit.panelRects[b].top)).toBeLessThan(1);
        expect(Math.abs(audit.panelRects[a].bottom - audit.panelRects[b].bottom)).toBeLessThan(1);
      }
      expect(new Set(audit.metricTops).size).toBe(1);
    } else {
      expect(audit.panelRects.every((r, i) => i === 0 || r.top > audit.panelRects[i - 1].bottom)).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath(`sports-career-${label}.png`), fullPage: true });

    await page.locator('.nav-btn[data-tab="settings"]').click();
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  });
}

test('a win opens a dedicated race winner menu', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#btn-start-new').click();
  await page.locator('#inp-team-name').fill('Victory Test Racing');
  await page.locator('#inp-driver-name').fill('Taylor Winner');
  await page.locator('#inp-car-name').fill('Victory Car');
  await page.locator('#btn-create-team').click();
  await page.locator('#btn-begin-career').click();
  await page.locator('#career-tutorial [data-tutorial-action="skip"]').click();

  await page.evaluate(() => {
    const winner = {
      entrantId: 'player', isPlayer: true, position: 1,
      displayName: 'Victory Test Racing / Taylor Winner',
      points: SERIES[0].points[0], prize: SERIES[0].prize[0], dnf: false,
    };
    const runnerUp = {
      entrantId: 'ai-1', isPlayer: false, position: 2,
      displayName: 'Thunder Road Racing / Morgan Hill',
      points: SERIES[0].points[1], prize: SERIES[0].prize[1], dnf: false,
    };
    document.body.insertAdjacentHTML('beforeend', renderRaceResultsModal([winner, runnerUp], [], winner));
  });

  const modal = page.locator('#results-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.race-win-title')).toHaveText('Race Winner');
  await expect(modal).not.toContainText('Victory Lane');
  await expect(modal.locator('.race-win-series')).toHaveCount(0);
  await expect(modal.locator('.race-win-driver')).toHaveText('Taylor Winner');
  await expect(modal.locator('.race-win-team')).toHaveText('Victory Test Racing');
  await expect(modal.locator('.race-win-stats')).toContainText('$15,000');
  await expect(modal.getByRole('button', { name: 'Continue' })).toBeVisible();
  await expect(modal.locator('.big-pos')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('race-winner-menu.png'), fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  const mobileLayout = await modal.evaluate(element => {
    const bounds = element.querySelector('.race-win-modal').getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      viewportWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(mobileLayout.left).toBeGreaterThanOrEqual(0);
  expect(mobileLayout.right).toBeLessThanOrEqual(mobileLayout.viewportWidth);
  expect(mobileLayout.overflow).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('race-winner-menu-mobile.png'), fullPage: true });

  await page.evaluate(() => {
    document.getElementById('results-modal')?.remove();
    const runnerUp = {
      entrantId: 'player', isPlayer: true, position: 2,
      displayName: 'Victory Test Racing / Taylor Winner',
      points: SERIES[0].points[1], prize: SERIES[0].prize[1], dnf: false,
    };
    document.body.insertAdjacentHTML('beforeend', renderRaceResultsModal([runnerUp], [], runnerUp));
  });
  await expect(page.locator('#race-results-title')).toHaveText('Race Results');
  await expect(page.locator('#results-modal .big-pos')).toHaveText('2nd place');
  await expect(page.locator('#results-modal .race-win-modal')).toHaveCount(0);
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
  await page.locator('#career-tutorial [data-tutorial-action="skip"]').click();

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
