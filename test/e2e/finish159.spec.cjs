const {test, expect} = require('playwright/test');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

test('Continue reaches results for every finish in Career and Quick Race', async ({page}) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/three.min.js', route => route.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));
  await page.goto(pathToFileURL(path.resolve('index.html')).href);
  const completed = await page.evaluate(async () => {
    // Supply lightweight cars for the matrix and keep the production launcher,
    // finish overlay, button callback, scoring, saves and news flow.
    Race3DEngine.prototype._init = function () {
      this.player = {isPlayer:true, entrantId:'player', carId:this.config.playerCarId, number:1, hex:0xe8001d, label:'Driver'};
      this.cars = [this.player, ...this.config.aiEntries.map(entry => ({
        entrantId:entry.entrantId, carId:entry.carId, number:entry.number, hex:0x58a6ff,
        isPlayer:!!entry.isSecondPlayer, label:entry.name,
      }))];
      this.player2 = this.cars.find(car => car.isPlayer && car !== this.player);
      this._newsGrid = {player:1, player2:2};
    };
    const check = (ok, label) => { if (!ok) throw Error(label); };
    const finish = async (position, otherPosition) => {
      await new Promise(requestAnimationFrame);
      const engine = window._r3d;
      const order = engine.cars.filter(car => !car.isPlayer);
      const players = [[position, engine.player]];
      if (engine.player2) players.push([otherPosition, engine.player2]);
      players.sort((a,b) => a[0] - b[0]).forEach(([rank,car]) => order.splice(rank-1,0,car));
      order.forEach((car,i) => { car.z = engine.raceLength + order.length - i; });
      engine._checkFinish();
      const button = document.querySelector('#r3d-finish button');
      check(button?.getClientRects().length, 'Missing finish button at ' + position);
      button.click();
    };
    const counts = {career:0, single:0, dual:0};
    for (const series of SERIES) {
      for (let position = 1; position <= series.fieldSize + 3; position++) {
        newGame('Team','Driver','Car');
        game.currentSeries = series.level;
        game.cars[0].classId = series.carClass;
        game.season.aiTeams = generateAITeams(series.level);
        game.season.calendar = generateCalendar(series.level);
        game.tutorial.status = 'skipped';
        game.money = 1e8;
        game.reputation = 100;
        for (const driver of HIREABLE_DRIVERS.slice(0,3)) {
          buyCar('Mate');
          hireDriver(driver.id, game.cars.at(-1).id);
        }
        rebuildStandings();
        saveToSlot(0);
        enterGame();
        handleStartRace();
        await finish(position);
        const result = game.season.calendar[0].playerResult;
        check(document.querySelector('#results-modal'), 'Missing Career results at ' + series.id + ' ' + position);
        check(result.position === position && result.points === (series.points[position-1] || 0), 'Wrong Career finish or points');
        check(JSON.parse(localStorage.getItem('sce_slot_0')).season.calendar[0].playerResult.position === position, 'Wrong saved finish');
        check(pendingRaceNews.reports[0].position === position, 'Wrong news position');
        document.querySelector('#results-modal').remove();
        counts.career++;
      }
      for (const [players, mode] of [[1,'single'],[2,'dual']]) {
        for (let position = 1; position <= series.fieldSize; position++) {
          quickRacePlayers = players;
          handleStartQuickRace(series.fieldSize);
          const other = series.fieldSize + 1 - position;
          // For an odd field the two humans still need different positions.
          await finish(position, other === position ? other + 1 : other);
          check(document.querySelector('#screen-quick-results'), 'Missing Quick Race results');
          check(quickRaceLastResult.players[0].position === position, 'Wrong Quick Race finish');
          if (players === 2) check(quickRaceLastResult.players[1].position === other, 'Wrong second player finish');
          leaveQuickRaceResults();
          counts[mode]++;
        }
      }
    }
    return counts;
  });
  expect(completed).toEqual({career:95,single:86,dual:86});
  expect(errors).toEqual([]);
});
