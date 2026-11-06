// Results responsibilities for the shared race engine.
(() => {
  class Methods {
  _checkFinish() {
    const TL = this.raceLength || R3D.TRACK_LEN;
    // Several cars can cross on the same frame - at 200+ units/sec a frame is
    // worth ~10 units of track. They must be credited in the order they are
    // actually down the road, NOT in array order: the player sits at index 0,
    // so iterating the array credited you ahead of a team-mate you had just
    // pushed to the line.
    const crossed = [];
    for (const car of this.cars) {
      if (!car.finished && car.z >= TL) crossed.push(car);
    }
    if (!crossed.length) return;
    crossed.sort((a, b) => b.z - a.z);        // furthest down the track first

    // One capture at the first crossing, not when the human later finishes.
    // Practice has no news flow. No extra render work during ordinary racing.
    if (!this.finishOrder.length && (this.config?.qualifyAI || this.config?.captureFinishPhoto) && this.renderer) this._captureFinishPhoto(crossed[0]);

    for (const car of crossed) {
      car.finished = true;
      this.finishOrder.push(car);
    }
    const player = crossed.find(c => c.isPlayer);
    if (this.player2) {
      if (this.player.finished && this.player2.finished) {
        this.done = true;
        this._updateDualHUD(1);
        const p1 = this.finishOrder.indexOf(this.player)+1, p2 = this.finishOrder.indexOf(this.player2)+1;
        const el = document.getElementById('r3d-finish');
        el.innerHTML = `<div class="r3d-finish-box${p1===1||p2===1?' is-victory':''}">${p1===1||p2===1?`<h2 class="victory-title">PLAYER ${p1===1?1:2} WINS</h2>`:'<h2>Race Results</h2>'}<p>Player 1 · #${this.player.number} · ${p1}${ordinal(p1)}</p><p>Player 2 · #${this.player2.number} · ${p2}${ordinal(p2)}</p><button class="btn btn-primary btn-lg" onclick="window._r3dFinish(${p1})">Continue</button></div>`;
        el.style.display = 'flex';
      }
      return;
    }
    if (player) {
      this.done = true;
      const pos = this.finishOrder.indexOf(player) + 1;
      // The tower normally refreshes at 5fps. Once done is set the main loop
      // stops updating it, so force one authoritative final refresh here.
      this._updateOrder(pos, this.cars.filter(c => !c.dnf).length);
      this._showFinish(pos);
    }
  }

  _captureFinishPhoto(leader) {
    if (!this.renderer || !this.scene || this._finishPhotoAttempted) return;
    this._finishPhotoAttempted = true;
    const r=this.renderer, width=1024, height=576, line=this.raceLength || R3D.TRACK_LEN;
    const target=new THREE.WebGLRenderTarget(width,height,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
    const camera=new THREE.PerspectiveCamera(48,width/height,0.5,2200);
    // A high trackside eye just beyond the line sees noses and the approaching
    // pack. The finish structure remains visible behind the crossing cars.
    camera.position.set((this.trackHalfWidth ?? R3D.HALF_W)-1,7,line+24);
    camera.lookAt(0,0.9,line-7);
    const old={target:r.getRenderTarget(),viewport:r.getViewport(new THREE.Vector4()),
      scissor:r.getScissor(new THREE.Vector4()),scissorTest:r.getScissorTest(),autoClear:r.autoClear,
      player:this.player,shadowAutoUpdate:r.shadowMap.autoUpdate};
    const positions=this.cars.map(c=>[c.mesh,c.mesh.position.clone()]);
    try {
      // Windowed track/stands must be present at the leader even when the human
      // is far behind. Restore those pools before the next chase/mirror pass.
      this.player={z:line}; this._positionTrack(); this._positionGrandstands();
      this.cars.forEach(c=>c.mesh.position.set(c.x,0,c.z));
      r.setScissorTest(false); r.setRenderTarget(target); r.autoClear=true;
      r.shadowMap.autoUpdate=false;
      r.clear(true,true,true); r.render(this.scene,camera);
      const pixels=new Uint8Array(width*height*4);
      r.readRenderTargetPixels(target,0,0,width,height,pixels);
      if (!pixels.some((value, i) => i % 4 === 3 && value)) throw new Error('The graphics driver returned an empty finish frame.');
      const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
      const ctx=canvas.getContext('2d'), frame=ctx.createImageData(width,height);
      for(let y=0;y<height;y++) frame.data.set(pixels.subarray((height-1-y)*width*4,(height-y)*width*4),y*width*4);
      ctx.putImageData(frame,0,0);
      this.finishPhoto={canvas, get dataUrl() { return canvas.toDataURL('image/jpeg',0.88); },leaderName:leader.label || 'The race winner',leaderId:leader.entrantId,grid:this._newsGrid,width,height};
    } catch(error) {
      // Photo failure must not interrupt classification or saving.
      this.finishPhoto=null;
      console.warn('Finish photograph unavailable:',error.message);
    } finally {
      this.player=old.player;
      for(const [mesh,position] of positions) mesh.position.copy(position);
      this._positionTrack(); this._positionGrandstands();
      r.shadowMap.autoUpdate=old.shadowAutoUpdate;
      r.setRenderTarget(old.target); r.setViewport(old.viewport); r.setScissor(old.scissor);
      r.setScissorTest(old.scissorTest); r.autoClear=old.autoClear;
      target.dispose();
    }
  }

  finalOrder() {
    const finished = this.finishOrder.slice();
    const running  = this.cars
      .filter(c => !c.finished && !c.dnf)
      .sort((a, b) => b.z - a.z);
    const retired  = this.cars.filter(c => c.dnf);
    return [...finished, ...running, ...retired].map((c, i) => ({
      entrantId: c.entrantId || null,
      carId:    c.carId || null,
      isPlayer: !!c.isPlayer,
      number:   c.number,
      label:    c.label,
      teamName: c.teamName || null,
      teamColor: r3dHex(c.hex),
      raceHealth: c.raceHealth ?? 100,
      crashes: c.crashCount || 0,
      position: i + 1,
      dnf:      !!c.dnf,
    }));
  }
  }
  for (const name of Object.getOwnPropertyNames(Methods.prototype)) {
    if (name !== "constructor") Object.defineProperty(Race3DEngine.prototype, name,
      Object.getOwnPropertyDescriptor(Methods.prototype, name));
  }
})();
