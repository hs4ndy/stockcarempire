const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {entries} = require('./helpers/race-sources.cjs');

function context() {
  const storage = new Map();
  const c = vm.createContext({console, localStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  }});
  for (const [file, source] of entries(['js/data.js', 'js/game.js', 'js/race.js'])) {
    vm.runInContext(source, c, {filename: file});
  }
  vm.runInContext(`
    newGame('Team', 'Player', 'Car');
    game.currentSeries = 2;
    game.money = 1e8;
    game.reputation = 100;
    game.season.aiTeams = generateAITeams(2);
    for (const driver of HIREABLE_DRIVERS.slice(0, 3)) {
      buyCar(driver.name);
      hireDriver(driver.id, game.cars.at(-1).id);
    }
    rebuildStandings();
  `, c);
  return c;
}

test('replacing all three teammate cars keeps 43 standings entries and each driver total', () => {
  const c = context();
  const result = vm.runInContext(`(() => {
    const oldIds = game.hiredDrivers.map(h => h.carId);
    applyRaceResults(oldIds.map((id, i) => ({entrantId:id, carId:id, position:i+2})));
    for (const hire of game.hiredDrivers) {
      retireOwnedCar(hire.carId);
      buyCar('Replacement');
      hire.carId = game.cars.at(-1).id;
      game.cars.at(-1).assignedDriverId = hire.driverId;
    }
    const ids = game.hiredDrivers.map(h => h.carId);
    applyRaceResults(ids.map((id, i) => ({entrantId:id, carId:id, position:i+2})));
    const rows = getStandings();
    return JSON.stringify({count:rows.length, mates:rows.filter(e=>e.isTeamCar).map(e=>({
      id:e.id, races:e.races, points:e.points
    })), ids, points:[2,3,4].map(pos=>SERIES[2].points[pos-1]*2)});
  })()`, c);
  const data = JSON.parse(result);
  assert.equal(data.count, 43);
  assert.deepEqual(data.mates.map(e => e.id), data.ids);
  assert.deepEqual(data.mates.map(e => e.races), [2, 2, 2]);
  assert.deepEqual(data.mates.map(e => e.points), data.points);
});

test('loading a legacy 46-row save merges teammate history once without resetting rivals', () => {
  const c = context();
  const result = vm.runInContext(`(() => {
    for (const row of game.season.standings.filter(e=>e.isTeamCar)) {
      delete row.driverId;
      row.points=40; row.races=2;
      game.season.standings.push({...row,id:'old-'+row.id,points:20,races:1});
    }
    const rivals=JSON.stringify(game.season.standings.filter(e=>!e.isTeamCar));
    game.teamName = 'Renamed Team';
    saveToSlot(0); loadFromSlot(0); saveToSlot(0); loadFromSlot(0);
    return JSON.stringify({count:game.season.standings.length,
      totals:game.season.standings.filter(e=>e.isTeamCar).map(e=>[e.points,e.races]),
      rivalsSame:rivals===JSON.stringify(game.season.standings.filter(e=>!e.isTeamCar))});
  })()`, c);
  const data = JSON.parse(result);
  assert.equal(data.count, 43);
  assert.deepEqual(data.totals, [[60,3],[60,3],[60,3]]);
  assert.equal(data.rivalsSame, true);
});

test('reusing a departed driver car preserves separate driver histories', () => {
  const c = context();
  assert.equal(vm.runInContext(`(() => {
    const first=game.hiredDrivers[0],carId=first.carId,driverId=first.driverId;
    applyRaceResults([{entrantId:carId,carId,position:2}]);
    fireDriver(driverId);
    hireDriver('drv04',carId);
    applyRaceResults([{entrantId:carId,carId,position:4}]);
    const rows=getStandings().filter(e=>e.driverId===driverId||e.driverId==='drv04');
    return rows.length===2&&new Set(rows.map(e=>e.id)).size===2&&rows.every(e=>e.races===1)&&
      rows.find(e=>e.driverId===driverId).points===SERIES[2].points[1]&&
      rows.find(e=>e.driverId==='drv04').points===SERIES[2].points[3];
  })()`, c), true);
});
