const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function context(){const c=vm.createContext({console,Math:Object.create(Math),localStorage:{getItem:()=>null,setItem(){},removeItem(){}}});for(const f of ['js/data.js','js/sponsor-data.js','js/sponsors.js','js/game.js','js/race.js','js/ui.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);vm.runInContext("newGame('Team','Driver','Car');game.money=1e6;game.reputation=100;buyCar('Second');",c);return c;}
test('46 unique rated drivers include all original IDs and a broad range of prices',()=>{const c=context();assert.equal(vm.runInContext(`HIREABLE_DRIVERS.length===46&&new Set(HIREABLE_DRIVERS.map(d=>d.id)).size===46&&new Set(HIREABLE_DRIVERS.map(d=>d.name)).size===46&&Array.from({length:45},(_,i)=>'drv'+String(i+1).padStart(2,'0')).every(id=>HIREABLE_DRIVERS.some(d=>d.id===id))&&HIREABLE_DRIVERS.every(d=>d.skill>=40&&d.skill<=99&&d.weeklyCost>0&&d.potential>=d.skill&&d.potential<=99)&&new Set(HIREABLE_DRIVERS.map(d=>d.weeklyCost)).size>20`,c),true);});
test('new driver hires retain actual skill, signing fees, salary and release semantics',()=>{const c=context();assert.equal(vm.runInContext(`(()=>{const d=HIREABLE_DRIVERS.find(d=>d.name==='Naomi Brooks'),car=game.cars[1],before=game.money;if(!hireDriver(d.id,car.id).ok)return false;const h=game.hiredDrivers[0];if(h.skill!==d.skill||h.weeklyCost!==Math.round(d.weeklyCost*1.10)||h.potential!==d.potential||game.money!==before-d.weeklyCost*4||car.assignedDriverId!==d.id)return false;fireDriver(d.id);return !game.hiredDrivers.length&&car.assignedDriverId===null;})()`,c),true);});
test('elite candidates enforce reputation and cash guards without a partial hire',()=>{const c=context();assert.equal(vm.runInContext(`(()=>{const d=HIREABLE_DRIVERS.find(d=>d.name==='Miles Benton'),car=game.cars[1];game.reputation=0;const money=game.money;if(hireDriver(d.id,car.id).ok||game.money!==money)return false;game.reputation=100;game.money=0;return !hireDriver(d.id,car.id).ok&&!game.hiredDrivers.length;})()`,c),true);});

test('Blake Moon starts at 91 and can develop to his advertised 99 ceiling', () => {
  const c = context();
  const result = vm.runInContext(`(() => {
    const d = HIREABLE_DRIVERS.find(driver => driver.name === 'Blake Moon');
    const car = game.cars[1];
    if (!hireDriver(d.id, car.id).ok) return false;
    const hire = hireForCar(car.id);
    if (hire.startSkill !== 91 || hire.skill !== 91 || hire.potential !== 99 || hire.weeklyCost !== 13200) return false;
    for (let i = 0; i < 120; i++) {
      developHiredDrivers([{carId:car.id,position:3}], 20);
      if (hire.skill > 99) return false;
    }
    return hire.skill === 99;
  })()`, c);
  assert.equal(result, true);
});
