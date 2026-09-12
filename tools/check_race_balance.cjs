// Repeatable balance diagnostics. Strategies are benchmarks, not human skill levels.
const { runRearStart } = require('../test/race-dynamics.test.js');
const baseline = process.argv[2] && process.argv[2] !== 'current' ? process.argv[2] : null;
for (const difficulty of process.argv[3] ? [process.argv[3]] : ['beginner','amateur','semipro','pro']) {
  for (const strategy of ['novice','managed']) {
    for (const seed of [3,17,41]) {
      console.log(JSON.stringify({baseline, difficulty, strategy, seed,
        ...runRearStart(seed, 26, difficulty, strategy, baseline)}));
    }
  }
}
