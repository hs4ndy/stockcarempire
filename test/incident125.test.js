const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');function ctx(){const c=vm.createContext({console,Math:Object.create(Math),localStorage:{getItem(){return null},setItem(){},removeItem(){}}});for(const [f,s]of require('./helpers/race-sources.cjs').entries(['js/data.js','js/game.js','js/race3d.js']))vm.runInContext(s,c);return c;}
test('repeated played crashes apply bounded reputation penalty; clean and simulated races do not',()=>{assert.equal(vm.runInContext(`(()=>{newGame('T','D','C');game.difficulty='pro';const race=n=>postRaceUpdate({carId:game.cars[0]?.id,position:12,crashes:n},0,[]);race(1);if(game.lastCrashReputationPenalty!==0)return false;race(1);if(game.lastCrashReputationPenalty!==.5)return false;race(10);if(game.lastCrashReputationPenalty!==2)return false;race(0);if(game.lastCrashReputationPenalty!==0)return false;race(undefined);return game.lastCrashReputationPenalty===0&&game.reputation>=0;})()`,ctx()),true);});
test('All-Out human-caused AI strain closes a quarter of the gap to Pro', () => {
  const result = vm.runInContext(`(() => {
    const strains = {};
    for (const difficulty of ['semipro', 'pro', 'allout']) {
      const engine = Object.create(Race3DEngine.prototype);
      engine.config = {difficulty, raceRules:{crashes:true, damage:false}};
      const player = {isPlayer:true, raceHealth:100};
      const ai = {raceHealth:100};
      engine.cars = [player, ai];
      engine._sideContact(player, ai, 4, 1, .1, 1);
      strains[difficulty] = ai.sideStrain / 1.05;
      if (Math.abs(player.sideStrain - 1.05) > 1e-8) return false;
      if (engine._crashThreshold(player) !== (difficulty === 'allout' ? 88 : 80)) return false;
      // Contact between two AI cars retains its separate strain scale.
      const a = {raceHealth:100}, b = {raceHealth:100};
      engine.cars = [a, b];
      engine._sideContact(a, b, 4, 1, .1, 1);
      const aiOnly = difficulty === 'allout' ? .24 : .28;
      if (Math.abs(a.sideStrain - 1.05 * aiOnly) > 1e-8) return false;
    }
    return Math.abs(strains.semipro - .80) < 1e-8 &&
      Math.abs(strains.pro - .72) < 1e-8 &&
      Math.abs(strains.allout - (.15 + (.72 - .15) * .25)) < 1e-8;
  })()`, ctx());
  assert.equal(result, true);
});
