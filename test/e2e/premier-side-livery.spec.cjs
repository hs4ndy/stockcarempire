const { test, expect } = require('playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

for (const [series, entry] of [[0, 'index.html'], [1, 'index.html'], [2, 'releases/Stock-Car-Empire.html']]) {
  test(`Series ${series} door numbers and primary sponsor in the garage and race`, async ({ page }, info) => {
    await page.route('**/three.min.js', route => route.fulfill({
      path: path.resolve('node_modules/three/build/three.min.js'),
      contentType: 'application/javascript',
    }));
    await page.goto(pathToFileURL(path.resolve(entry)).href);
    await page.evaluate(series => {
      newGame('Empire Racing', 'Test Driver', 'Test Car');
      game.tutorial.status = 'skipped';
      game.currentSeries = series;
      Object.assign(game.cars[0], { classId: SERIES[series].carClass, color: '#85adbb', number: 27 });
      const sponsor = SPONSOR_CATALOG.find(c => c.series === series && c.tier === 'primary');
      game.sponsorship.contracts = [{ companyId: sponsor.id, pay: 2000 }];
      enterGame();
      showTab('garage');
      openCarStudio('career', game.cars[0].id);
    }, series);

    function measure(car) {
      const numbers = car.mesh.children.filter(m => m.name === 'Door number');
      const sponsor = car.mesh.getObjectByName('Primary hood sponsor');
      const { position, uv } = sponsor.geometry.attributes;
      const panels = [-1, 1].map(side => {
        const points = [];
        for (let i = 0; i < position.count; i++) {
          if (position.getX(i) * side > 1) points.push({z:position.getZ(i), u:uv.getX(i)});
        }
        if (!points.length) return null;
        const start = points.find(p => p.u === 0), end = points.find(p => p.u === 1);
        return {
          readable: (start.z - end.z) * side > 0,
          behind: Math.max(...points.map(p => p.z)) < numbers[0].position.z - .4,
        };
      });
      return { doors: numbers.map(n => n.position.z), panels };
    }
    const expected = {
      doors: series === 2 ? [.50, .50] : [.04, .04],
      panels: series === 2 ? Array(2).fill({readable:true, behind:true}) : [null, null],
    };
    await page.waitForFunction(() => carStudio?.preview?.mesh.getObjectByName('Primary hood sponsor')
      ?.material.map.image.naturalWidth && !carStudio.frame);
    const preview = await page.evaluateHandle(() => carStudio.preview);
    expect(await preview.evaluate(measure)).toEqual(expected);
    for (const side of [-1, 1]) {
      await page.evaluate(side => {
        Object.assign(carStudio, {yaw:side < 0 ? -1.34 : .99, elevation:.22, distance:5.25});
        carStudio.render();
      }, side);
      await page.waitForFunction(() => carStudio.frame === 0);
      await page.locator('.studio-viewport').screenshot({path:info.outputPath(`side-${side}.png`)});
    }
    await page.getByRole('button', {name:'Cancel', exact:true}).click();
    await page.evaluate(() => handleStartRace());
    await page.waitForFunction(() => window._r3d?.mirrorRT);
    const field = await page.evaluateHandle(() => window._r3d.player);
    expect(await field.evaluate(measure)).toEqual(expected);
    const ai = await page.evaluateHandle(() => window._r3d.cars.find(c => !c.isPlayer && !c.isTeammate));
    expect(await ai.evaluate(measure)).toEqual(expected);
  });
}
