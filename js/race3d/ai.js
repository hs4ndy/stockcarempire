// Ai responsibilities for the shared race engine.
(() => {
  class Methods {
  _updateAI(dt) {
    // Where the race leader is, so stragglers know how much ground to make up
    this._leadZ = this.cars.reduce(
      (m, c) => (!c.dnf && !c.finished && c.z > m ? c.z : m), -Infinity);
    if (!isFinite(this._leadZ)) this._leadZ = this.player.z;
    const naturalLeaderPace = Math.min(R3D.SPEED_MAX, this.cars.reduce((pace,c) => !c.dnf && !c.finished && !c.spinning && c.z >= this._leadZ - 60
      ? Math.max(pace, (c.isPlayer ? R3D.SPEED_BASE * (.83 + c.power * .28) : this._naturalAIPace(c)) + this._aeroPace(c)) : pace, 0));
    const {membership} = this._racingGroups();

    for (const car of this.cars) {
      if (car.isPlayer) continue;
      if (car.contactCooldown > 0) car.contactCooldown -= dt;
      if (car.finished) continue;

      if (car.dnf) { car.mesh.rotation.y += 0.35 * dt; continue; }
      if (this._advanceCrash(car,dt)) continue;
      const aggro = this._raceAggression(car);
      const aggroMul = this.diff.aiAggro;
      const mix = (calm, wild) => calm + (wild - calm) * aggro;
      this._chooseAILine(car, aggro, dt);
      this._shoulderRace(car,dt);

      // Difficulty lifts both the AI's pace and its ceiling. Individual power
      // creates natural separation; bounded recovery helps detached cars
      // reconnect without changing their positions or slowing the leaders.
      const lead = this._leadZ || car.z;
      const pressure = this.diff.packPressure || 0;
      const gapStart = this.diff.recoveryStart ?? R3D.PACK_GAP_START * (1 - pressure * 0.8);
      const gapFull = this.diff.recoveryFull ?? gapStart + (R3D.PACK_GAP - R3D.PACK_GAP_START) * (1 - pressure * 0.6);
      const back = clamp((lead - car.z - gapStart) /
        (gapFull - gapStart), 0, 1);
      const basePace = this._naturalAIPace(car);
      // Recover through acceleration, never position snapping or leader braking.
      const leaderPace = Math.max(basePace, naturalLeaderPace);
      const catchUp = back * (this.diff.packRecovery ?? 1) * (R3D.PACK_CATCHUP * (1 + pressure * 0.5)
        + Math.max(0, Math.min(leaderPace, R3D.SPEED_MAX) - basePace) * pressure);
      const normalPace = Math.min(R3D.SPEED_MAX, basePace + this._aeroPace(car));
      const group = membership.get(car), ahead = group?.ahead;
      const next = car._pursuing && !ahead ? this.cars.reduce((n,c) => c!==car && !c.dnf && !c.finished && !c.spinning && c.z>car.z && (!n || c.z<n.z) ? c : n,null) : null;
      const pursuitGap = ahead ? ahead.tail.z-group.front.z : next ? next.z-car.z : 0;
      car._pursuing = !!this.diff.pursuitMargin && (pursuitGap>120 || (!!car._pursuing && pursuitGap>18));
      // Keep pursuing after the60-unit group merge, until an actual close tow
      // can sustain the run. Capping the reference at normal pace prevents
      // assisted cars from recursively accelerating every follower.
      const pursuitReference = ahead ? ahead.pace : next ? Math.min(R3D.SPEED_MAX,next.speed/(this.speedScale ?? 1)) : 0;
      const pursuit = car._pursuing
        ? Math.max(normalPace,pursuitReference+this.diff.pursuitMargin*r3dSmooth(clamp((pursuitGap-18)/42,0,1))) : 0;
      // Ordinary pack pressure cannot consume the headroom reserved for
      // detached groups. In-pack humans no longer receive the same free pace.
      const ordinary = Math.min(normalPace+catchUp,Math.max(normalPace,leaderPace+6),ahead ? R3D.RECOVERY_MAX : R3D.SPEED_MAX);
      const tgt = Math.min(Math.max(ordinary,pursuit), R3D.RECOVERY_MAX) * (this.speedScale ?? 1) * this._healthPace(car);
      car.speed += (tgt - car.speed) * (1 - Math.exp(-2.2 * dt));   // frame-rate independent

      // ── Lateral motion with inertia ─────────────────────────
      // A stock car has mass: it cannot reverse direction instantly. Steering
      // sets a DESIRED lateral velocity, and real velocity is accelerated
      // toward it under a hard limit, so every line change is a smooth arc and
      // a bump is absorbed rather than teleporting the car sideways.
      const maxLat  = mix(R3D.AI_LAT_MAX * 0.75, R3D.AI_LAT_MAX) * aggroMul;
      const latAcc  = mix(R3D.AI_LAT_ACC * 0.7, R3D.AI_LAT_ACC) * aggroMul;
      const err     = car.targetX - car.x;
      // Ease into the target so cars settle instead of overshooting and hunting
      const desired = clamp(err * R3D.AI_STEER_GAIN, -maxLat, maxLat);
      car.lvx = car.lvx || 0;
      car.lvx += clamp(desired - car.lvx, -latAcc * dt, latAcc * dt);
      car.lvx *= Math.pow(R3D.AI_LAT_DAMP, dt);
      car.x += car.lvx * dt;
      car.z += car.speed * dt;
      car.mesh.position.set(car.x, 0, car.z);
      // Subtle AI body roll based on lateral movement
      const aiRoll = clamp((car.lvx / R3D.AI_LAT_MAX) * 0.055, -0.055, 0.055);
      car.mesh.rotation.z += (aiRoll - car.mesh.rotation.z) * (1 - Math.exp(-6 * dt));
    }
  }

  _raceAggression(car) {
    const calm = R3D.CALM_FRAC / Math.max(0.5, this.diff.aiAggro);
    const phase = r3dSmooth((car.z / (this.raceLength || R3D.TRACK_LEN) - calm) /
      Math.max(0.01, R3D.ENDGAME_FRAC - calm));
    const temperament = clamp(((car.raceNerve || 1) - 1) * 0.45, -0.08, 0.08);
    const rivalry=car.isRival&&this.cars.some(p=>p.isPlayer&&!p.finished&&!p.dnf&&Math.abs(p.z-car.z)<90&&Math.abs(p.x-car.x)<5)?.04:0;
    return clamp(0.38 + phase * 0.44 + temperament + rivalry, 0.3, 0.9);
  }

  _wantsTrain(car) {
    const lead = this._leadZ ?? Math.max(...this.cars.filter(c => !c.dnf && !c.finished).map(c => c.z));
    // Cooperation is a way to catch the leaders. Drivers contest the finish,
    // and drivers already in the leading group take their own opportunities.
    return lead - car.z > 65 - (this.diff.packPressure || 0) * 35 && car.z / (this.raceLength || R3D.TRACK_LEN) < 0.80 + (this.diff.racecraft || 0) * 0.07;
  }

  _laneSafe(car, x) {
    if (Math.abs(x) > (this.trackHalfWidth ?? R3D.HALF_W) - 1.4) return false;
    // Check the swept lane corridor, including a car closing from behind.
    return !this.cars.some(other => {
      if (other === car || other.dnf || other.finished) return false;
      const dz = other.z - car.z;
      // Pulling away from an overlapping lane increases clearance, including
      // at bumper contact. Do not mistake the car being passed for a blocker
      // in the destination lane, or the move will be cancelled halfway out.
      // Tiny alignment offsets at opposite bumpers must not veto both exits.
      if (Math.abs(other.x - car.x) < R3D.CAR_SEP_X &&
          Math.abs(x - other.x) > R3D.CAR_SEP_X + 0.4 &&
          ((x - car.x) * (car.x - other.x) >= 0 ||
            (Math.abs(other.x - car.x) < 0.35 && Math.abs(dz) > R3D.CAR_SEP_Z * 0.8))) return false;
      const nearPath = other.x > Math.min(car.x, x) - R3D.CAR_SEP_X - 0.25 &&
        other.x < Math.max(car.x, x) + R3D.CAR_SEP_X + 0.25;
      const future = dz + (other.speed - car.speed) * 0.9;
      return nearPath && ((dz > -9 && dz < 9) || (future > -9 && future < 9));
    });
  }

  _chooseAILine(car, aggro, dt) {
    const hw = (this.trackHalfWidth ?? R3D.HALF_W) - 1.4;
    const step = R3D.LANE_STEP + 0.6;
    const alternatives = [car.x - step, car.x + step].filter(x => this._laneSafe(car, x));
    const hazard = [...this.wrecks, ...this.cars.filter(c => c !== car && c.spinning)]
      .find(w => w.z > car.z && w.z - car.z < Math.max(90, car.speed * 2) &&
        Math.abs(w.x - car.x) < 3.5);
    car.laneTimer = (car.laneTimer || 0) - dt;
    car.tacticTimer = (car.tacticTimer || 0) - dt;
    if (hazard) {
      const safe = alternatives.filter(x => Math.abs(x - hazard.x) > 3);
      if (safe.length) {
        car.targetX = safe.sort((a, b) => Math.abs(b - hazard.x) - Math.abs(a - hazard.x))[0];
        car._tactic = 'avoid';
        car.tacticTimer = 1.4;
      }
      return;
    }

    // A prolonged bumper partnership is useful, but not a permanent escort.
    // Break into clear racing room before the pusher banks a free late pass.
    // This applies to rivals and teammates, with earlier responses on Pro.
    // Race-local memory survives brief separations and swaps of the leading car.
    const partners = car._partnerships || (car._partnerships = new Map());
    let rideTime = 0;
    for (const other of this.cars) {
      if (other === car) continue;
      const close = !other.dnf && !other.finished && !other.spinning &&
        Math.abs(car.z-other.z) < R3D.PUSH_Z+3 && Math.abs(car.x-other.x) < R3D.PUSH_X;
      let record = partners.get(other);
      if (close) {
        if (!record) { record={time:0,apart:0}; partners.set(other,record); }
        record.time += dt; record.apart=0;
        rideTime = Math.max(rideTime,record.time);
      } else if (record) {
        record.apart += dt;
        if (record.apart > 2) record.time = Math.max(0,record.time-dt*.25);
        if (!record.time) partners.delete(other);
      }
    }
    car._rideTime = rideTime;
    if (car._rideTime >= (this.diff.rideLimit ?? 6) && alternatives.length &&
        !(car._tactic === 'breakaway' && car.tacticTimer > 0)) {
      car.targetX = alternatives.sort((a,b) => this._scoreLane(car,b,aggro)-this._scoreLane(car,a,aggro))[0];
      car._tactic = 'breakaway';
      car.tacticTimer = car.laneTimer = 2.6;
      return;
    }
    if (car._tactic === 'breakaway' && car.tacticTimer > 0) {
      if (!this._laneSafe(car, car.targetX)) {
        car.targetX = car.x; car._tactic = null; car.tacticTimer = car.laneTimer = 0;
      } else return;
    }

    // Any driver will work with any useful partner, including the player.
    // Let an existing passing/avoidance move finish before seeking a new line.
    if (this._wantsTrain(car) && !(['pass', 'avoid', 'defend'].includes(car._tactic) && car.tacticTimer > 0)) {
      const candidates = this.cars.filter(c => c !== car && !c.dnf && !c.finished && !c.spinning &&
        c.z > car.z && c.z - car.z < R3D.DRAFT_Z * 1.4 && Math.abs(c.x - car.x) < 6);
      const soloPace = this._naturalAIPace(car) * (this.speedScale ?? 1);
      const partner = candidates.filter(c => c.speed > soloPace-8 && car.speed-c.speed < 10 &&
        (Math.abs(c.x-car.x)<.35 || this._laneSafe(car,c.x))).sort((a,b) =>
        (a.z-car.z+Math.abs(a.x-car.x)*12-Math.min(12,a.speed-soloPace)*2) -
        (b.z-car.z+Math.abs(b.x-car.x)*12-Math.min(12,b.speed-soloPace)*2))[0];
      if (partner) {
        car.targetX = clamp(partner.x, -hw, hw);
        car._tactic = partner.z - car.z < R3D.PUSH_Z + 3 ? 'push' : 'join';
        car.tacticTimer = car.laneTimer = 0.8;
        return;
      }
      const pusher = this.cars.find(c => c !== car && !c.dnf && !c.finished && !c.spinning &&
        car.z - c.z > 0 && car.z - c.z < 28 && Math.abs(c.x-car.x) < 2.5 && c.speed >= car.speed - 2);
      if (pusher) {
        car.targetX = car.x;
        car._tactic = 'receive';
        car.tacticTimer = car.laneTimer = 0.8;
        return;
      }
    }

    if (car._tactic && car.tacticTimer > 0) {
      // Safety can cancel a move; drafting appeal cannot cancel a committed pass.
      if (Math.abs(car.targetX - car.x) > 0.2 && !this._laneSafe(car, car.targetX)) {
        car.targetX = car.x;
        car._tactic = null;
        car.laneTimer = 0.65;
      }
      return;
    }
    car._tactic = null;
    if (car.laneTimer > 0) return;

    const ahead = this.cars.filter(c => c !== car && !c.dnf && !c.finished && !c.spinning &&
      c.z > car.z && Math.abs(c.x - car.x) < R3D.CAR_SEP_X)
      .sort((a, b) => a.z - b.z)[0];
    const craft = this.diff.racecraft || 0;
    const gap = ahead ? ahead.z - car.z : Infinity;
    const closing = ahead ? car.speed - ahead.speed : 0;
    const nerve = car.raceNerve || 1;
    // A racer with a real run contests the leading group and the finish.
    const runNeeded = (3.05 - aggro * 1.45 - craft * 0.45) / nerve;
    const hasRun = closing > runNeeded ||
      (car.draftMomentum > 15 && closing > -0.7 && aggro > 0.32);
    // A long pullout with no closing speed spends the carried run before the
    // car reaches its rival. Stay in the tow until the move is achievable.
    const passingReach = clamp(8+Math.max(0,closing)*(R3D.DRAFT_CARRY+1.2),12,28);
    if (gap < passingReach && hasRun && alternatives.length) {
      car.targetX = alternatives.sort((a, b) =>
        this._scoreLane(car, b, aggro) - this._scoreLane(car, a, aggro))[0];
      car._tactic = 'pass';
      car.tacticTimer = 3.8 - aggro * 0.8;
      car.laneTimer = car.tacticTimer;
      return;
    }

    const chaser = this.cars.filter(c => c !== car && !c.dnf && !c.finished && !c.spinning &&
      car.z - c.z > R3D.CAR_SEP_Z && car.z - c.z < R3D.BLOCK_Z * (1 + craft * 0.5) &&
      c.speed > car.speed + 2 - craft && Math.abs(c.x - car.x) > 0.7 &&
      this._laneSafe(car,clamp(car.x+clamp(c.x-car.x,-R3D.BLOCK_MAX,R3D.BLOCK_MAX),-hw,hw)))
      .sort((a,b) => (car.z-a.z)/(a.speed-car.speed) - (car.z-b.z)/(b.speed-car.speed))[0];
    if (chaser && aggro * nerve + craft * 0.25 > 0.7) {
      const target = clamp(car.x + clamp(chaser.x - car.x, -R3D.BLOCK_MAX, R3D.BLOCK_MAX), -hw, hw);
      if (this._laneSafe(car, target)) {
        car.targetX = target;
        car._tactic = 'defend';
        car.tacticTimer = R3D.TACTIC_COMMIT;
        car.laneTimer = R3D.TACTIC_COMMIT;
        return;
      }
    }

    // Hold contact briefly, but allow an earned passing run to leave a push.
    if (car._pushLocked) {
      car.targetX = car.x;
      car.laneTimer = 0.6;
      return;
    }
    const stay = this._scoreLane(car, car.x, aggro);
    const best = alternatives.sort((a, b) =>
      this._scoreLane(car, b, aggro) - this._scoreLane(car, a, aggro))[0];
    const move = best !== undefined &&
      this._scoreLane(car, best, aggro) > stay + R3D.LANE_GAIN_MIN;
    car.targetX = move ? best : car.x;
    car._tactic = move ? 'rejoin' : null;
    car.laneTimer = (R3D.LANE_COMMIT * (1.2 - aggro * 0.45)) / nerve;
    car.tacticTimer = car.laneTimer;
  }

  _scoreLane(car, laneX, aggro) {
    const hw = (this.trackHalfWidth ?? R3D.HALF_W) - 1.4;
    if (Math.abs(laneX) > hw) return -100;

    let score      = 0;
    let nearestAhead = Infinity;   // gap to the next car in this lane
    let aheadCar   = null;         // whoever that is
    let towGap     = Infinity;     // gap to a car close enough to tow off
    let towCar     = null;         // the car providing that tow
    let blocked    = false;        // someone occupying that space right now

    for (const other of this.cars) {
      if (other === car || other.dnf || other.finished) continue;
      const dz  = other.z - car.z;
      const adx = Math.abs(other.x - laneX);
      if (adx > R3D.LANE_WIDTH) continue;

      // Anyone level with us there makes the move unsafe
      if (Math.abs(dz) < R3D.CAR_SEP_Z * 1.6 && adx < R3D.CAR_SEP_X * 1.25) blocked = true;

      if (dz > 0) {
        if (dz < nearestAhead) { nearestAhead = dz; aheadCar = other; }
        if (dz > R3D.PUSH_Z && dz < R3D.DRAFT_Z && dz < towGap) { towGap = dz; towCar = other; }
      }
    }

    // Clear air ahead is worth a lot - this is what makes a car pull out of a
    // queue and go, rather than sitting in dirty air forever.
    score += Math.min(nearestAhead, 140) / 140 * (1 + aggro * 0.6);

    // Chasing drivers value a connected line; leaders value a passing lane.
    if (towGap < Infinity) {
      const towQuality = r3dWake({ ...car, x: laneX }, towCar).tow;
      const trainLen = (towCar && towCar.chainLen) || 1;
      score += towQuality * R3D.TOW_APPEAL * (this._wantsTrain(car) ? 2.2 + Math.min(trainLen,8)*.12 : .85);
    }

    // Stuck behind someone slower is the thing a racer most wants to fix, so
    // a lane that has you bottled up scores badly and the way past looks good.
    if (aheadCar && nearestAhead < R3D.STUCK_Z && aheadCar.speed < car.speed - 1) {
      const howStuck = 1 - (nearestAhead / R3D.STUCK_Z);
      score -= howStuck * R3D.STUCK_PENALTY;
    }

    // Never move into a car
    if (blocked) score -= 3.0;

    // Prefer to keep off the wall
    score -= Math.pow(Math.abs(laneX) / hw, 3) * 0.5;

    // Sticking to your current line has value; late in the race, less so
    if (Math.abs(laneX - car.x) < 0.05) score += R3D.LANE_INERTIA * (1 - aggro * 0.6);

    return score;
  }

  _shoulderRace(car,dt) {
    if(!this._incidentRules().crashes || car.z<1000 || car.spinning) return;
    car._shoulderWait=Math.max(0,(car._shoulderWait||0)-dt);
    if(car._shoulderTime>0) {car._shoulderTime-=dt;car.targetX=car._shoulderTarget;return;}
    if(car._shoulderWait>0 || Math.random()>.04*dt*this.diff.aiAggro) return;
    const other=this.cars.filter(c=>c!==car && !c.isPlayer && !c.spinning && !c.dnf && !c.finished && Math.abs(c.z-car.z)<2 && Math.abs(c.x-car.x)>1.5 && Math.abs(c.x-car.x)<3).sort((a,b)=>Math.abs(a.x-car.x)-Math.abs(b.x-car.x))[0];
    if(!other) return;
    car._shoulderWait=12;car._shoulderTime=.8;
    car._shoulderTarget=clamp(other.x-Math.sign(other.x-car.x)*1.1,-7.5,7.5);
    car.targetX=car._shoulderTarget;
  }
  }
  for (const name of Object.getOwnPropertyNames(Methods.prototype)) {
    if (name !== "constructor") Object.defineProperty(Race3DEngine.prototype, name,
      Object.getOwnPropertyDescriptor(Methods.prototype, name));
  }
})();
