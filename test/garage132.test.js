const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{entries}=require('./helpers/race-sources.cjs');function c(){const c=vm.createContext({console,localStorage:{getItem(){return null},setItem(){},removeItem(){}}});for(const[f,s]of entries(['js/data.js','js/game.js']))vm.runInContext(s,c);return c;}
test('repair all charges summed existing costs, preserves lifetime and rejects insufficient money',()=>{assert.equal(vm.runInContext(`(()=>{newGame('T','D','C');game.money=1e6;buyCar('Second');game.cars[0].condition=60;game.cars[1].condition=80;game.cars[0].lifetimeHealth=72;const cost=game.cars.reduce((n,c)=>n+carRepairCost(c),0);game.money=cost-1;const before=JSON.stringify(game);if(repairAllCars().ok||JSON.stringify(game)!==before)return false;game.money=cost+100;const r=repairAllCars();return r.ok&&r.cost===cost&&game.money===100&&game.cars.every(c=>c.condition===100)&&game.cars[0].lifetimeHealth===72;})()`,c()),true);});
test('full upgrade state follows installed parts and current tier capacity',()=>{assert.equal(vm.runInContext(`(()=>{newGame('T','D','C');const car=game.cars[0],cls=CAR_CLASSES[car.classId];if(carFullyUpgraded(car))return false;for(const t of UPGRADE_TIERS)car.appliedUpgrades.push(...cls.upgrades.filter(u=>u.tier===t.tier).slice(0,tierCapacity()).map(u=>u.id));if(!carFullyUpgraded(car))return false;car.appliedUpgrades.pop();return !carFullyUpgraded(car);})()`,c()),true);});
test('failed fleet repair save restores money and all conditions',()=>{const x=c();assert.equal(vm.runInContext(`(()=>{newGame('T','D','C');game.money=1e6;buyCar('Second');game.cars.forEach(c=>c.condition=50);currentSlot=0;const before=JSON.stringify(game);localStorage.setItem=()=>{throw Error('quota');};return !repairAllCars().ok&&JSON.stringify(game)===before;})()`,x),true);});

test('bulk upgrade fills successive tiers with the lowest-cost remaining parts and charges once', () => {
  const context = c();
  assert.equal(vm.runInContext(`(() => {
    newGame('T','D','C');
    game.money = 1e6;
    const car = game.cars[0];
    upgradeCar(car.id, 'engine_tune');
    const baseQuote = planAllCarUpgrades(car);
    if (baseQuote.parts.length !== 8 || baseQuote.parts.some(part => part.id === 'race_brakes' || part.id === 'wind_tunnel')) return false;
    hireStaff('analyst04');
    const expected = CAR_CLASSES[car.classId].upgrades;
    const quote = planAllCarUpgrades(car);
    if (tierCapacity() !== 5 || quote.parts.length !== 14) return false;
    const before = game.money;
    game.money = quote.cost - 1;
    const untouched = JSON.stringify(car);
    if (upgradeAllCarParts(car.id, quote).ok || JSON.stringify(car) !== untouched) return false;
    game.money = before;
    const result = upgradeAllCarParts(car.id, quote);
    return result.ok && result.count === 14 && carFullyUpgraded(car) &&
      car.appliedUpgrades.length === expected.length && game.money === before - quote.cost &&
      !upgradeAllCarParts(car.id, quote).ok;
  })()`,context),true);
});

test('bulk upgrade restores both car and slot if updating save metadata fails', () => {
  const context = c();
  assert.equal(vm.runInContext(`(() => {
    const storage = new Map();
    localStorage.getItem = key => storage.get(key) ?? null;
    localStorage.setItem = (key, value) => storage.set(key,value);
    newGame('T','D','C');
    game.money = 1e6;
    saveToSlot(0);
    const car = game.cars[0], quote = planAllCarUpgrades(car);
    const original = localStorage.getItem('sce_slot_0');
    const before = JSON.stringify(game);
    localStorage.setItem = (key, value) => {
      if (key === 'sce_meta') throw Error('quota');
      storage.set(key,value);
    };
    return !upgradeAllCarParts(car.id, quote).ok &&
      JSON.stringify(game) === before && localStorage.getItem('sce_slot_0') === original;
  })()`,context),true);
});
