// Driving responsibilities for the shared race engine.
(() => {
  class Methods {
  _updatePlayer(dt) {
    const p  = this.player;
    if (p.finished || p.dnf) return;
    if (this._advanceCrash(p,dt)) return;
    // Steering authority falls off slightly with speed (less twitchy at top speed)
    const spdFrac = clamp((p.speed - R3D.SPEED_BASE) / (R3D.SPEED_MAX - R3D.SPEED_BASE), 0, 1);
    const steerAuth = 1 - spdFrac * R3D.STEER_FALLOFF;
    // A = left = +X (world), D = right = -X (world); camera looks +Z so world +X = screen left
    const input = Number(this.keys.a) - Number(this.keys.d);
    const desired = input * R3D.LAT_MAX * steerAuth;
    const rate = input ? 10.0 : -Math.log(R3D.LAT_DAMP);
    p.lv += clamp((desired - p.lv) * (1 - Math.exp(-rate * dt)), -R3D.LAT_ACC * dt, R3D.LAT_ACC * dt);

    p.lv = clamp(p.lv, -R3D.LAT_MAX, R3D.LAT_MAX);
    p.x += p.lv * dt;

    const traffic = this._playerTraffic || this.cars.filter(c => !c.dnf && !c.finished);
    const startZ = this._playerTraffic?.find(c => c.car === p)?.z ?? p.z;
    const activeCount = traffic.length;
    const aheadCount  = traffic.filter(c => c.z > startZ).length;
    const posFrac     = activeCount > 1 ? aheadCount / (activeCount - 1) : 0;
    const leadZ = traffic.reduce((z,c) => Math.max(z,c.z), startZ);
    const recovery = clamp((leadZ-startZ-R3D.PACK_GAP_START) / (R3D.PACK_GAP-R3D.PACK_GAP_START),0,1);
    const rubberBand = posFrac * R3D.RUBBER_BAND * (this.diff.playerCatchup ?? 1) * (this.diff.inPackHelp ?? 1)
      + (this.diff.inPackHelp === undefined ? recovery * R3D.PACK_CATCHUP : 0)
      + Math.pow(posFrac, 8) * (this.diff.lastPlaceBoost || 0);

    // Only an isolated follower gets extra rejoin help; leaders and cars
    // already attached to traffic do not gain a permanent pace advantage.
    const nextCar = traffic.reduce((next,c) => c.z > startZ && (!next || c.z < next.z) ? c : next, null);
    const gap = nextCar ? nextCar.z - startZ : 0;
    const basePace = R3D.SPEED_BASE * (0.83 + p.power * 0.28);
    const normalPace = Math.min(R3D.SPEED_MAX, basePace + this._aeroPace(p) + rubberBand);
    const tgt = this._playerRecoveryTarget(normalPace, nextCar, gap) * (this.speedScale ?? 1) * this._healthPace(p);
    let braking = false;
    if (this.keys.s) {
      p.speed = Math.max(tgt * 0.38, p.speed - R3D.BRAKE_FORCE * dt);
      braking = true;
    } else {
      const accel = 2.2 + (R3D.ACCEL - 2.2) * clamp((p.speed - 180) / 30, 0, 1);
      p.speed += (tgt - p.speed) * (1 - Math.exp(-accel * dt));
    }

    p.z += p.speed * dt;
    p.mesh.position.set(p.x, 0, p.z);

    // Body roll (steer) + squat/dive (throttle/brake)
    const roll = -p.lv / R3D.LAT_MAX * 0.045;
    p.mesh.rotation.z += (roll - p.mesh.rotation.z) * (1 - Math.exp(-5 * dt));
    const yaw = Math.atan2(p.lv, Math.max(60, p.speed));
    p.mesh.rotation.y += (yaw - p.mesh.rotation.y) * (1 - Math.exp(-5 * dt));
    const pitch = braking ? 0.035 : (p.speed < tgt - 4 ? -0.025 : 0);
    p.mesh.rotation.x += (pitch - p.mesh.rotation.x) * (1 - Math.exp(-4 * dt));
  }

  _naturalAIPace(car) {
    return R3D.SPEED_BASE * (.845 + car.power * .215) * this.diff.aiSpeed;
  }

  _aeroPace(car) {
    // Developing Career cars can retain a tow; upgrades still improve their
    // own clean-air pace. Same equipment-based rule for humans and every AI.
    const efficiency = this.config?.qualifyAI ? 1+.25*clamp((.85-car.power)/.28,0,1) : 1;
    return car.draftBoost*efficiency;
  }

  _playerRecoveryTarget(normalPace, nextCar, gap) {
    const p = this.player;
    if (!nextCar || gap <= 18) p._rejoining = false;
    else if (gap >= 80) p._rejoining = true;
    if (!p._rejoining) return Math.min(R3D.SPEED_MAX,normalPace);
    // Match traffic first, then taper only the closing speed. Interpolating
    // from weak-car pace could equal traffic speed outside a useful wake.
    const closing = clamp(gap/8,12,30) * r3dSmooth(clamp((gap-18)/32,0,1));
    const floor = nextCar.speed / (this.speedScale ?? 1) + closing;
    return Math.min(R3D.RECOVERY_MAX,Math.max(normalPace,floor));
  }

  _racingGroups() {
    const active = this.cars.filter(c => !c.dnf && !c.finished && !c.spinning).sort((a,b) => b.z-a.z);
    const groups = [], membership = new Map();
    for (const c of active) {
      let group = groups[groups.length-1];
      if (!group || group.tail.z-c.z > 60) {
        group = { front:c, tail:c, pace:0, ahead:groups[groups.length-1] || null };
        groups.push(group);
      }
      group.tail=c;
      const natural = c.isPlayer ? R3D.SPEED_BASE*(.83+c.power*.28) : this._naturalAIPace(c);
      group.pace=Math.max(group.pace, Math.min(R3D.SPEED_MAX, natural+this._aeroPace(c)));
      membership.set(c,group);
    }
    return {groups,membership};
  }

  _calcDraft(dt) {
    const active = this.cars.filter(c => !c.dnf && !c.finished && !c.spinning)
      .slice().sort((a, b) => b.z - a.z);
    for (const car of this.cars) {
      car.towStrength = 0;
      car.pushStrength = 0;
      car.receivedPush = 0;
      car.chainLen = 1;
      car._wakeLeader = null;
      car._pushTarget = 0;
      car._draftDepth = 1;
      if (car.dnf || car.finished || car.spinning) {
        car.draftBoost = car.draftMomentum = 0;
        car._draftCarryMomentum = car._draftCarryTimer = 0;
      }
    }

    const trains = new Map();
    // Forward-only links cannot cycle. A distant or offset wake still gives
    // a tow, but only close aligned cars share a train's efficiency benefit.
    for (const car of active) {
      for (const other of active) {
        if (other === car) continue;
        const wake = r3dWake(car, other);
        if (wake.tow > car.towStrength) {
          car.towStrength = wake.tow;
          car._wakeLeader = other;
        }
        const bonus = R3D.PUSH_BONUS;
        car.pushStrength = Math.max(car.pushStrength, wake.push);
        car._pushTarget = Math.max(car._pushTarget, wake.push * bonus);
        // Direct push only; do not recirculate accumulated aero through a pair.
        other.receivedPush = Math.max(other.receivedPush, wake.push * bonus * .75);
      }
      car._draftDepth = car._wakeLeader ? (car._wakeLeader._draftDepth || 1) + 1 : 1;
      const leader = car._wakeLeader;
      car._trainRoot = leader && leader.z-car.z < R3D.CHAIN_LINK_Z && car.towStrength > .55
        ? leader._trainRoot : car;
      const members = trains.get(car._trainRoot) || [];
      members.push(car);
      trains.set(car._trainRoot,members);
    }

    for (const members of trains.values()) for (const car of members) car.chainLen = members.length;
    // Every additional linked car helps the whole line, with diminishing gains.
    // Two cars no longer get an advantage that a larger chasing line cannot earn.
    for (const car of active) {
      const chain = R3D.CHAIN_MAX * (1 - Math.exp(-(car.chainLen-1) / 3));
      const rawTarget = car.towStrength * R3D.DRAFT_BOOST + car._pushTarget + chain + car.receivedPush;
      const draftGain = car.isPlayer ? R3D.PLAYER_DRAFT_STRENGTH : 1;
      let target = Math.min(R3D.AERO_MAX * draftGain * (car.isPlayer ? 1 : (this.diff.aiDraft ?? 1)),
        rawTarget * draftGain * (car.isPlayer ? this.diff.playerDraft : (this.diff.aiDraft ?? 1)));
      const before = car.draftMomentum || 0;
      const activeDraft = car.towStrength > 0.12 || car.pushStrength > 0.12 || car.receivedPush > 1;
      if (activeDraft) {
        car._draftCarryMomentum = before;
        car._draftCarryDuration = R3D.DRAFT_CARRY;
        car._draftCarryTimer = car._draftCarryDuration;
      } else if ((car._draftCarryTimer || 0) > 0 && (car._draftCarryMomentum || 0) > 8) {
        car._draftCarryTimer = Math.max(0, car._draftCarryTimer - dt);
        const carryFrac = car._draftCarryTimer / (car._draftCarryDuration || R3D.DRAFT_CARRY);
        target = Math.max(target, car._draftCarryMomentum * (0.72 + carryFrac * 0.28));
      }
      const rate = target > before ? R3D.DRAFT_BUILD : R3D.DRAFT_RELEASE;
      car.draftMomentum = before + (target - before) * (1 - Math.exp(-rate * dt));
      car.draftBoost = car.draftMomentum;
    }
  }

  _separateCars(dt) {
    const step = Math.max(dt || 0.016, 0.001);
    const active = this.cars.filter(c => !c.finished && !c.dnf && !c.spinning);
    const startX = new Map(active.map(c => [c,
      Number.isFinite(c._frameStartX) ? c._frameStartX : c.x]));
    // Cleared here so _updateAI (which runs first) reads last frame's value
    for (const c of this.cars) c._pushLocked = false;

    // Two passes so a shunt propagates down a queue in the same frame
    for (let pass = 0; pass < 2; pass++) {
      active.sort((a, b) => b.z - a.z);
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const A = active[i], B = active[j];      // A ahead, B behind
          const dz = A.z - B.z, dx = B.x - A.x, adx = Math.abs(dx);
          if (dz >= R3D.CAR_SEP_Z || adx >= R3D.CAR_SEP_X) continue;

          A._pushLocked = true; B._pushLocked = true;

          // Blend from bumper compression to door contact as overlap changes.
          // A car pulling away sideways must not receive a fresh fixed kick
          // every solver pass or be held back behind the old bumper plane.
          const bumper = 1 - r3dSmooth((adx - 0.8) / 0.7);
          if (bumper > 0) {
            const overlapZ = R3D.CAR_SEP_Z - dz;
            B.z -= Math.min(overlapZ, R3D.SEP_Z_RATE * step * 0.5) * bumper;
            const floorZ = A.z - R3D.CAR_SEP_Z * 0.82;
            if (adx < 0.8 && B.z > floorZ) B.z = floorZ;
            B.mesh.position.z = B.z;
            const diff = B.speed - A.speed;
            if (diff > 0) {
              const give = Math.min(diff, 60) * (1 - Math.exp(-2.6 * step)) * bumper;
              const transfer = Math.min(give, Math.max(0,R3D.RECOVERY_MAX*(this.speedScale ?? 1)-A.speed), Math.max(0,B.speed-40));
              A.speed += transfer;
              B.speed -= transfer;
            }
          }

          if (adx > 0.8) {
            const dir = dx > 0 ? 1 : -1;
            const av = A.isPlayer ? (A.lv || 0) : (A.lvx || 0);
            const bv = B.isPlayer ? (B.lv || 0) : (B.lvx || 0);
            const closing = Math.max(0, (av - bv) * dir);
            const overlap = (R3D.CAR_SEP_X - adx) / R3D.CAR_SEP_X;
            const side = r3dSmooth((adx - 0.8) / 0.7);
            // Pressure and damping scale with elapsed time; separating cars
            // retain their intended motion. Half strength per solver pass.
            if(dz<R3D.CAR_SEP_Z*.62) this._sideContact(A,B,closing,overlap*side,step*.5,dir);
            const imp = (overlap * R3D.CONTACT_IMPULSE + closing * 2) * side * step * 0.5;
            const corr = Math.min((R3D.CAR_SEP_X - adx) * 0.5,
              R3D.SEP_X_RATE * step * 0.5) * side;
            A.x -= dir * corr;
            B.x += dir * corr;
            A.mesh.position.x = A.x; B.mesh.position.x = B.x;
            if (A.isPlayer) A.lv = clamp(av - dir * imp, -R3D.LAT_MAX, R3D.LAT_MAX);
            else A.lvx = clamp(av - dir * imp, -R3D.AI_LAT_MAX * 1.5, R3D.AI_LAT_MAX * 1.5);
            if (B.isPlayer) B.lv = clamp(bv + dir * imp, -R3D.LAT_MAX, R3D.LAT_MAX);
            else B.lvx = clamp(bv + dir * imp, -R3D.AI_LAT_MAX * 1.5, R3D.AI_LAT_MAX * 1.5);
          }
        }
      }
    }
    // A car can overlap more than one neighbor in dense traffic. Cap the total
    // correction from all solver pairs, not only each pair, so traffic pressure
    // cannot add up to a sideways jump in a single physics step.
    for (const car of active) {
      const origin = startX.get(car);
      const maxRate = car.isPlayer ? R3D.LAT_MAX : R3D.AI_LAT_MAX * 1.5 + R3D.SEP_X_RATE;
      car.x = clamp(car.x, origin - maxRate * step, origin + maxRate * step);
      car.mesh.position.x = car.x;
    }
    const speedLimit = R3D.RECOVERY_MAX*(this.speedScale ?? 1);
    for (const car of active) car.speed=Math.min(car.speed,speedLimit);
  }
  }
  for (const name of Object.getOwnPropertyNames(Methods.prototype)) {
    if (name !== "constructor") Object.defineProperty(Race3DEngine.prototype, name,
      Object.getOwnPropertyDescriptor(Methods.prototype, name));
  }
})();
