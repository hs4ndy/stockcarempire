// Repeatable driving policies for Node diagnostics and browser playthroughs.
// "novice" holds its starting line; "managed" follows gaps and times exits.
function raceDriverStep(e, state, dt, strategy = 'managed') {
  state.time = (state.time || 0) + dt;
  if (strategy !== 'managed') { e.keys.a = e.keys.d = e.keys.s = false; return; }
  const p = e.player, active = e.cars.filter(c => c !== p && !c.dnf && !c.finished && !c.spinning);
  const ahead = active.filter(c => c.z > p.z).sort((a,b) =>
    a.z-p.z + Math.abs(a.x-p.x)*10 - (b.z-p.z + Math.abs(b.x-p.x)*10))[0];
  const front = Math.max(p.z, ...active.map(c => c.z));
  const progress = p.z / R3D.TRACK_LEN;
  let target = state.target ?? p.x;
  const passed = active.find(c => c.entrantId === state.passCar);
  if (passed && p.z-passed.z > R3D.CAR_SEP_Z+2) state.passUntil = 0;
  if (state.time >= (state.passUntil || 0)) {
    if (ahead) {
      target = ahead.x;
      const closing = p.speed-ahead.speed;
      const attack = progress > .78 || front-p.z < 65;
      if (attack && ahead.z-p.z < 19 && p.draftMomentum > 16 && closing > (progress > .78 ? -.2 : 1)) {
        const options = [ahead.x-3.1,ahead.x+3.1].filter(x => e._laneSafe(p,x));
        if (options.length) {
          target = options.sort((a,b) => Math.abs(a-p.x)-Math.abs(b-p.x))[0];
          state.passCar = ahead.entrantId;
          state.passUntil = state.time+4;
        }
      }
    } else {
      const behind = active.filter(c => c.z < p.z && p.z-c.z < 35).sort((a,b) => b.z-a.z)[0];
      if (behind && e._laneSafe(p, behind.x)) target = behind.x;
    }
  }
  state.target = clamp(target, -9, 9);
  const error = state.target-p.x-p.lv*.22;
  e.keys.a = error > .3;
  e.keys.d = error < -.3;
  e.keys.s = false;
}
