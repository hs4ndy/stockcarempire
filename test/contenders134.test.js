const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {entries}=require('./helpers/race-sources.cjs');
function context(seed=17){let state=seed;const math=Object.create(Math);math.random=()=>((state=(state*1664525+1013904223)>>>0)/4294967296);const store=new Map(),c=vm.createContext({console,Math:math,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});for(const [file,source]of entries(['js/data.js','js/game.js','js/race.js']))vm.runInContext(source,c,{filename:file});return c;}
test('new series rosters contain unique Parker/Joshua/Tanner identities and six contenders',()=>{for(const seed of [3,17,41,73,101])assert.equal(vm.runInContext(`[0,1,2].every(level=>{newGame('T','D','C');game.currentSeries=level;game.season.aiTeams=generateAITeams(level);const cars=game.season.aiTeams.flatMap(t=>t.cars),ids=championshipContenderIds();return cars.length===SERIES[level].fieldSize-1&&new Set(cars.map(c=>c.driverName)).size===cars.length&&ids.size===6&&['Parker Holt','Joshua Enright','Tanner Boyd'].every(name=>{const matches=cars.filter(c=>c.driverName===name);return matches.length===1&&ids.has(matches[0].id);});})`,context(seed)),true);});
test('existing weak Parker gains contender preparation without resetting points, raw stats or save identity',()=>{const c=context();assert.equal(vm.runInContext(`(()=>{newGame('T','D','C');const car=game.season.aiTeams.flatMap(t=>t.cars).find(c=>c.driverName==='Parker Holt');car.power=.4;car.condition=25;game.season.standings[0].points=234;const before=JSON.stringify(game.season);if(!championshipContenderIds().has(car.id)||careerRivalPower(car,true)<=careerRivalPower(car,false)||JSON.stringify(game.season)!==before)return false;saveToSlot(0);loadFromSlot(0);return JSON.stringify(game.season)===before&&championshipContenderIds().has(car.id);})()`,c),true);});
test('established rivals have competitive preparation even with weak equipment',()=>{assert.equal(vm.runInContext(`(()=>{newGame('T','D','C');return [0,1,2].every(level=>{game.currentSeries=level;const car={id:'anchor',driverName:'Parker Holt',power:.4,condition:96};return careerRivalPower(car,true)>.87&&careerRivalPower(car,true)>careerRivalPower(car,false);});})()`,context()),true);});
test('contender selection tolerates legacy rosters with neither named rival and never invents a missing entrant',()=>{assert.equal(vm.runInContext(`(()=>{newGame('T','D','C');game.season.aiTeams.forEach(t=>t.cars.forEach(c=>c.driverName='Legacy '+c.id));const before=JSON.stringify(game.season.aiTeams),ids=championshipContenderIds();return ids.size===6&&JSON.stringify(game.season.aiTeams)===before&&[...ids].every(id=>game.season.aiTeams.some(t=>t.cars.some(c=>c.id===id)));})()`,context()),true);});

test('yearly rival form carries over through rollover, save and load', () => {
  const c = context(41);
  const result = vm.runInContext(`(() => {
    newGame('T','D','C');
    const roster = game.season.aiTeams.flatMap(t => t.cars);
    const anchor = roster.find(c => c.driverName === 'Parker Holt');
    const rising = roster.find(c => !RECURRING_RIVALS.includes(c.driverName));
    game.rivalForm = {[rising.driverName]: {rating:.92,trend:.035}};
    const before = careerRivalForm(rising).rating;
    game.season.standings.find(e => e.id === 'player').points = -1;
    endSeason();
    const after = careerRivalForm(rising).rating;
    const serialized = JSON.stringify(game.rivalForm);
    saveToSlot(0);
    loadFromSlot(0);
    return game.season.year === 2 && game.season.aiTeams.flatMap(t => t.cars).some(car => car.id === rising.id)
      && after !== before && Math.abs(after - before) <= .07
      && JSON.stringify(game.rivalForm) === serialized && championshipContenderIds().has(anchor.id);
  })()`, c);
  assert.equal(result, true);
});
