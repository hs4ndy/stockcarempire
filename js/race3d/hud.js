// Hud responsibilities for the shared race engine.
(() => {
  class Methods {
  _buildMinimap() {
    const track = document.getElementById('r3d-map-track');
    if (!track) return;
    for (const car of this.cars) {
      const dot = document.createElement('div');
      dot.className = 'r3d-map-dot';
      if (car.isPlayer) dot.classList.add('is-player');
      else dot.style.background = r3dHex(car.hex);
      track.appendChild(dot);
      car._dot = dot;
    }
  }

  _updateHUD(dt) {
    const health=Math.ceil(this.player.raceHealth ?? 100), bar=document.getElementById('r3d-health');
    if(bar){bar.classList.toggle('low',health<=25);bar.setAttribute('aria-valuenow',health);document.getElementById('r3d-health-value').textContent=health+'%';document.getElementById('r3d-health-fill').style.transform=`scaleX(${health/100})`;}
    if (this.player2) { this._updateDualHUD(dt); return; }
    const p = this.player;

    // Cars that have already taken the flag are still ahead of you. Excluding
    // them made your displayed position climb as the leaders finished, so you
    // could be shown P1 while running last.
    const active = this.cars.filter(c => !c.dnf);
    const ahead  = active.filter(c => c !== p && (c.finished || c.z > p.z)).length;
    const pos    = ahead + 1;
    const total  = active.length;

    const posEl = document.getElementById('r3d-pos');
    if (posEl) posEl.textContent = pos;
    const ofEl = document.getElementById('r3d-pos-of');
    if (ofEl) ofEl.textContent = '/ ' + total;

    // Speed
    const mph = Math.round(p.speed * 0.78 + 33 * (this.speedScale ?? 1));
    const spdEl = document.getElementById('r3d-speed');
    if (spdEl) spdEl.textContent = mph;

    // Draft label + meter
    const momentum = p.draftMomentum || 0;
    const isPush = p.pushStrength > 0.35;
    const frac = clamp(momentum / R3D.AERO_MAX, 0, 1);
    const draftEl = document.getElementById('r3d-draft');
    const fillEl  = document.getElementById('r3d-draft-fill');
    if (draftEl) {
      const on = frac > 0.04;
      draftEl.textContent = 'Draft';
      draftEl.style.color = !on ? 'var(--text-mute)' : isPush ? 'var(--warn)' : 'var(--accent)';
    }
    if (fillEl) {
      fillEl.style.transform = `scaleX(${(Math.round(frac * 100) / 100).toFixed(2)})`;
      fillEl.style.background = isPush ? 'var(--warn)' : 'var(--accent)';
    }

    // Progress
    const prog = document.getElementById('r3d-prog-fill');
    if (prog) prog.style.transform = `scaleX(${clamp(p.z / (this.raceLength || R3D.TRACK_LEN), 0, 1).toFixed(3)})`;

    const practiceTip = document.getElementById('r3d-practice-tip');
    if (practiceTip) {
      const fraction = p.z / (this.raceLength || R3D.TRACK_LEN);
      const tip = fraction < 0.25
        ? 'A and D steer. S brakes. The car accelerates automatically.'
        : fraction < 0.55
          ? 'Follow a car to build Draft. Pull out when you have a run.'
          : fraction < 0.82
            ? 'Check the rear-view mirror before changing lanes. Position and speed are on the HUD.'
            : 'The finish is close. Hold your line and watch the cars around you.';
      if (practiceTip.textContent !== tip) practiceTip.textContent = tip;
    }

    // Minimap (throttled ~20fps)
    this._mapAcc += dt;
    if (this._mapAcc >= 0.05) {
      this._mapAcc = 0;
      const hw = this.trackHalfWidth ?? R3D.HALF_W;
      for (const car of this.cars) {
        if (!car._dot) continue;
        if (car.dnf) { car._dot.style.opacity = '0.25'; }
        const topPct  = clamp(100 - (car.z / (this.raceLength || R3D.TRACK_LEN)) * 100, 0, 100);
        // The forward-facing camera looks along +Z, so world +X is screen-left.
        const leftPct = clamp(50 - (car.x / hw) * 42, 4, 96);
        car._dot.style.top  = topPct + '%';
        car._dot.style.left = leftPct + '%';
      }
    }

    // Running-order tower (throttled ~5fps)
    this._orderAcc += dt;
    if (this._orderAcc >= 0.18) {
      this._orderAcc = 0;
      this._updateOrder(pos, total);
    }
  }

  _updateOrder(playerPos, total) {
    const el = document.getElementById('r3d-order');
    if (!el) return;
    // Sort: finished first (in finish order), then by z desc
    const ranked = this.cars.filter(c => !c.dnf).slice().sort((a, b) => {
      if (a.finished && b.finished) return this.finishOrder.indexOf(a) - this.finishOrder.indexOf(b);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.z - a.z;
    });
    // Window of 7 rows centered on the player
    const pIdx = ranked.indexOf(this.player);
    let start = clamp(pIdx - 3, 0, Math.max(0, ranked.length - 7));
    const rows = ranked.slice(start, start + 7).map((c, k) => {
      const place = start + k + 1;
      const nm = (c.label || '').split(' / ').pop();
      const cls = c.isPlayer ? ' is-player' : c.isTeammate ? ' is-teammate' : '';
      return `<div class="r3d-order-row${cls}">
        <span class="r3d-order-pos">${place}</span>
        <span class="r3d-order-chip" style="background:${r3dHex(c.hex)}"></span>
        <span class="r3d-order-num">#${c.number}</span>
        <span class="r3d-order-name">${nm}</span>
      </div>`;
    }).join('');
    el.innerHTML = `<div class="r3d-order-head">Leaderboard</div>${rows}`;
  }

  _warn(msg) {
    const el = document.getElementById('r3d-warn');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._warnTimeout);
    this._warnTimeout = setTimeout(() => { if (el) el.classList.add('hidden'); }, 3200);
  }

  _showFinish(pos) {
    const el = document.getElementById('r3d-finish');
    if (!el) return;
    const msg = this.config.practiceTips ? 'Practice Complete'
      : pos === 1 ? 'Victory Lane' : pos <= 3 ? 'Podium Finish' : `P${pos} Finish`;
    el.innerHTML = `
      <div class="r3d-finish-box">
        <div class="r3d-finish-pos">${pos}${ordinal(pos)} Place</div>
        <div class="r3d-finish-msg">${msg}</div>
        <button class="btn btn-primary btn-lg" onclick="window._r3dFinish(${pos})">${this.config.qualifyAI ? 'Next' : 'Continue'}</button>
      </div>`;
    el.style.display = 'flex';
  }

  _updateDualHUD(dt) {
    this._dualHUDAcc = (this._dualHUDAcc || 0) + dt;
    if (this._dualHUDAcc < 0.10) return;
    this._dualHUDAcc = 0;
    const ranked = this.cars.filter(c=>!c.dnf).slice().sort((a,b)=>{
      if(a.finished && b.finished) return this.finishOrder.indexOf(a)-this.finishOrder.indexOf(b);
      if(a.finished) return -1; if(b.finished) return 1; return b.z-a.z;
    });
    [this.player,this.player2].forEach((p,i)=>{
      const n=i+1, pos=ranked.indexOf(p)+1;
      const health=document.getElementById(`dual-health-${n}`);if(health)health.textContent=`Vehicle health ${Math.ceil(p.raceHealth ?? 100)}%`;
      document.getElementById(`dual-pos-${n}`).textContent = p.finished ? `Finished P${pos}` : `P${pos} / ${this.cars.length}`;
      document.getElementById(`dual-speed-${n}`).textContent = Math.round(p.speed*.78+33*(this.speedScale ?? 1));
      document.getElementById(`dual-draft-${n}`).textContent = Math.round(clamp((p.draftMomentum || 0)/R3D.AERO_MAX,0,1)*100);
      document.getElementById(`dual-progress-${n}`).style.transform = `scaleX(${clamp(p.z/this.raceLength,0,1)})`;
      const start=clamp(pos-3,0,Math.max(0,ranked.length-5));
      const el=document.getElementById(`dual-order-${n}`);
      document.getElementById(`dual-progress-${n}`).style.background = r3dHex(p.hex);
      if (!el) return;
      const html='<div class="r3d-order-head">Leaderboard</div>'+ranked.slice(start,start+5).map((c,k)=>`<div class="r3d-order-row${c===p ? ' is-player' : ''}"><span class="r3d-order-pos">${start+k+1}</span><span class="r3d-order-chip" style="background:${r3dHex(c.hex)}"></span><span class="r3d-order-num">#${c.number}</span><span class="r3d-order-name">${c.label}</span></div>`).join('');
      if(el.innerHTML!==html) el.innerHTML=html;
    });
  }
  }
  for (const name of Object.getOwnPropertyNames(Methods.prototype)) {
    if (name !== "constructor") Object.defineProperty(Race3DEngine.prototype, name,
      Object.getOwnPropertyDescriptor(Methods.prototype, name));
  }
})();
