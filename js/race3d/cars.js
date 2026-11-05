// Cars responsibilities for the shared race engine.
(() => {
  class Methods {
  _initGeometries() {
    // Blender exports local, indexed geometry. Decode once per race; every car
    // shares these GPU buffers. No asynchronous model loading during a start.
    const decode = data => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
      if (data.color) geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.color, 3));
      if (data.uv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
      geometry.setIndex(data.index);
      geometry.computeBoundingSphere();
      return geometry;
    };
    this.G = {
      parts: Object.fromEntries(Object.entries(this.carModel.parts)
        .map(([name, data]) => [name, decode(data)])),
      wheel: decode(this.carModel.wheel),
      decalDoor: new THREE.PlaneGeometry(0.80, this.isGrassroots ? 0.58 : 0.48),
      decalRoof: this.isGrassroots ? new THREE.PlaneGeometry(1.04, 1.04) : decode(this.carModel.roofDecal),
      teamBand: this.isGrassroots ? new THREE.BoxGeometry(1.48, .012, .12) : decode(this.carModel.teamBand),
    };
    if(typeof SC_RACING_STRIPES!=='undefined'){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(SC_RACING_STRIPES.position,3));g.setIndex(SC_RACING_STRIPES.index);g.computeVertexNormals();this.G.racingStripes=g;}
    if(typeof SC_HOOD_LOGO_MESHES!=='undefined'){const data=SC_HOOD_LOGO_MESHES[this.isGrassroots?'grassroots':'gen7'],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.position,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));g.setIndex(data.index);g.computeVertexNormals();this.G.hoodLogo=g;}
    // The track uses intentionally bright arcade lighting. A paint-only
    // reflectance layer keeps saturated liveries from clipping into flat neon,
    // so the new hood and fender normals remain readable without relighting
    // the track or changing the entrant's actual team color.
    const paint = this.G.parts.paint;
    const reflectance = new Float32Array(paint.attributes.position.count * 3);
    for (let i = 0; i < paint.attributes.position.count; i++) {
      const y = paint.attributes.position.getY(i);
      const value = 0.56 + 0.10 * clamp((y - 0.15) / 0.9, 0, 1);
      reflectance.set([value, value, value], i * 3);
    }
    paint.setAttribute('color', new THREE.BufferAttribute(reflectance, 3));
    this.M = {
      trim: new THREE.MeshLambertMaterial({ color: 0x191d23, side: THREE.DoubleSide }),
      glass: new THREE.MeshPhongMaterial({ color: 0x233e50, shininess: 65, side: THREE.DoubleSide }),
      metal: new THREE.MeshPhongMaterial({ color: 0x8d989e, shininess: 48, side: THREE.DoubleSide }),
      headlight: new THREE.MeshBasicMaterial({ color: 0xe5ece3, side: THREE.DoubleSide }),
      taillight: new THREE.MeshBasicMaterial({ color: 0x9c1223, side: THREE.DoubleSide }),
      wheel: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    };
  }

  _buildCars() {
    const { config } = this;
    const fieldSize  = Math.min(config.aiEntries.length + 1, config.fieldSize);

    // Grid slots ordered POLE FIRST. +Z is the direction of travel, so row 0
    // must sit at the highest z - building them the other way round made the
    // announced starting position the exact inverse of the real one.
    const slots = [];
    const rows  = Math.ceil(fieldSize / 2);
    for (let r = 0; r < rows; r++) {
      const baseZ = (rows - 1 - r) * R3D.GRID_SPACING;
      slots.push({ x: -3.5, z: baseZ });         // inside line
      slots.push({ x:  3.5, z: baseZ - 1.6 });   // outside line, staggered back
    }
    slots.length = fieldSize;                    // never draw a slot past the field

    // Qualifying draw. Normally anywhere in the field, but a Data Analyst
    // biases it toward the front - take the best of N draws, one extra draw
    // per analyst on staff.
    const draws = 1 + (config.qualifyBoost || 0);
    let playerSlotIdx = Math.floor(Math.random() * slots.length);
    for (let i = 1; i < draws; i++) {
      playerSlotIdx = Math.min(playerSlotIdx, Math.floor(Math.random() * slots.length));
    }
    playerSlotIdx = Math.min(slots.length - 1, playerSlotIdx + 2);
    this._startingPos = playerSlotIdx + 1;     // two-place qualifying setback, bounded by field size
    const ps = slots[playerSlotIdx];
    this.player = this._makeCar(ps.x, ps.z, {
      entrantId:  'player',
      color:      config.playerColor || '#e8001d',
      number:     config.playerNumber || 1,
      power:      config.playerPower,
      appearance:config.playerAppearance,
      isPlayer:   true,
      isTeammate: false,
      label:      config.playerName || 'YOU',
      carId:      config.playerCarId || null,
    });
    this.player.raceHealth=clamp(config.playerHealth ?? 100,0,100);
    this.cars.push(this.player);

    const aiEntries = config.aiEntries.slice(0,fieldSize-1);
    if (config.qualifyAI) {
      const ranked = aiEntries.map(entry => ({entry,score:entry.power+(Math.random()-.5)*(entry.isContender ? .10 : .24)}));
      ranked.sort((a,b) => b.score-a.score);
      aiEntries.splice(0,aiEntries.length,...ranked.map(r=>r.entry));
    }
    let aiIdx = 0;
    for (let i = 0; i < slots.length && aiIdx < aiEntries.length; i++) {
      if (i === playerSlotIdx) continue;
      const entry = aiEntries[aiIdx++];
      const slot  = slots[i];
      this.cars.push(this._makeCar(slot.x, slot.z, {
        entrantId:  entry.entrantId || null,
        color:      entry.color,
        number:     entry.number || (aiIdx + 1),
        power:      clamp(entry.power, 0.25, 0.99),
        isPlayer:   !!entry.isSecondPlayer,
        isTeammate: !!entry.isTeammate,
        isRival: !!entry.isRival,
        appearance:entry.appearance,
        label:      entry.name,
        teamName:   entry.teamName || null,
        carId:      entry.carId || null,
        raceNerve:  entry.raceNerve,
        isContender: entry.isContender,
      }));
      this.cars[this.cars.length-1].raceHealth=clamp(entry.health ?? 100,0,100);
    }
    if (config.dualPlayer) {
      this.player2 = this.cars.find(c => c.entrantId === 'player2');
      // Give the two humans adjacent grid slots without adding an extra car.
      const neighbor = this.cars.filter(c => c !== this.player && c !== this.player2).sort((a,b) =>
        Math.abs(a.z-this.player.z) - Math.abs(b.z-this.player.z))[0];
      if (neighbor && this.player2) {
        const x = this.player2.x, z = this.player2.z;
        this.player2.x = neighbor.x; this.player2.z = neighbor.z;
        neighbor.x = x; neighbor.z = z;
        for (const c of [neighbor,this.player2]) c.mesh.position.set(c.x,0,c.z);
      }
    }
    this._newsGrid = Object.fromEntries([...this.cars].sort((a,b)=>b.z-a.z).map((c,i)=>[c.entrantId,i+1]));
  }

  _makeCar(x, z, { entrantId, color, number, power, isPlayer, isTeammate, label, teamName, carId, raceNerve, isContender, isRival, appearance }) {
    if(!appearance&&!isPlayer&&!isTeammate&&typeof aiCarAppearance==='function')appearance=aiCarAppearance(entrantId||label||number);
    if (!isPlayer && !isTeammate && !appearance?.hoodSponsorId && typeof aiHoodSponsorId === 'function') {
      const series = this.config?.seriesId || SERIES.find(s => s.fieldSize === this.config?.fieldSize)?.id;
      const hoodSponsorId = aiHoodSponsorId(series, entrantId || label || number);
      if (hoodSponsorId) appearance = {...appearance, hoodSponsorId};
    }
    const look=typeof carAppearance==='function'?carAppearance(appearance):{stripes:true,stripeColor:'#f2f3e9',numberColor:'#f2f3e9'};
    const hex = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
    const G = this.G, M = this.M;
    const g = new THREE.Group();

    g.name = this.carModel.name;
    const bodyMat = new THREE.MeshPhongMaterial({ color: hex, vertexColors: true,
      shininess: 70, specular: 0x30343a, side: THREE.DoubleSide });
    // Keep player/team colors exact; high-contrast accents remain readable
    // on light liveries, and gold continues to identify teammates.
    const luminance = (((hex >> 16) & 255) * 0.2126 +
      ((hex >> 8) & 255) * 0.7152 + (hex & 255) * 0.0722) / 255;
    const accent = isRival && !isTeammate ? 0xe8001d : isTeammate ? 0xe0a800 : (luminance > 0.65 ? 0x202630 : 0xe8ece2);
    const accMat = new THREE.MeshLambertMaterial({ color: accent, side: THREE.DoubleSide });
    for (const [name, geometry] of Object.entries(G.parts)) {
      const mesh = new THREE.Mesh(geometry, name === 'paint' ? bodyMat : name === 'accent' ? accMat : M[name]);
      mesh.name = name;
      if(name==='accent'&&this.isGrassroots&&appearance){mesh.material=new THREE.MeshLambertMaterial({color:look.stripeColor,side:THREE.DoubleSide});mesh.visible=look.stripes;}
      mesh.castShadow = name === 'paint' || name === 'trim';
      mesh.receiveShadow = true;
      g.add(mesh);
    }

    if(!this.isGrassroots&&G.racingStripes){const stripes=new THREE.Mesh(G.racingStripes,new THREE.MeshLambertMaterial({color:look.stripeColor,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}));stripes.name='Racing stripes';stripes.visible=look.stripes;g.add(stripes);}
    if(G.hoodLogo&&appearance?.hoodSponsorId&&typeof hoodLogoTexture==='function'){const map=hoodLogoTexture(appearance.hoodSponsorId,this.previewOnAssetReady);if(map){const logo=new THREE.Mesh(G.hoodLogo,new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide}));logo.name='Primary hood sponsor';logo.renderOrder=2;g.add(logo);}}
    const wheels = this.carModel.wheelPositions.map(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(G.wheel, M.wheel);
      wheel.name = 'Rolling stock-car wheel';
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      g.add(wheel);
      return wheel;
    });

    const decalMat = new THREE.MeshBasicMaterial({
      map: r3dRoundelTex(number,look.numberColor), transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
    });
    const roofDecal = new THREE.Mesh(G.decalRoof, decalMat);
    // Generated overlay already conforms to the Gen-7 roof in car coordinates.
    if (this.isGrassroots) {
      roofDecal.position.set(0, 1.334, -.20);
      roofDecal.rotation.x = -Math.PI / 2;
    }
    roofDecal.name = 'Roof number';
    g.add(roofDecal);
    // Outward-facing normals on both doors prevent mirrored or invisible numbers.
    [[-(this.isGrassroots ? 1.045 : 1.023), -Math.PI / 2], [this.isGrassroots ? 1.045 : 1.023, Math.PI / 2]].forEach(([sx, ry]) => {
      const door = new THREE.Mesh(G.decalDoor, decalMat);
      door.position.set(sx, this.isGrassroots ? .58 : .55, .04);
      door.rotation.y = ry;
      door.name = 'Door number';
      g.add(door);
    });

    if (isTeammate || isRival) {
      const roofBand = new THREE.Mesh(G.teamBand, accMat);
      if (this.isGrassroots) roofBand.position.set(0, 1.33, .34);
      g.add(roofBand);
    }

    // Fit the historical 5.06 x 2.34 body inside today's 4.6 x 2.15 contact envelope.
    if (this.isGrassroots) g.scale.set(.91, 1, .9);
    g.position.set(x, 0, z);
    this.scene.add(g);

    const bounds = new THREE.Box3().setFromObject(g);
    const wallHalfX = (bounds.max.x-bounds.min.x)/2;
    const wallHalfZ = (bounds.max.z-bounds.min.z)/2;
    const wallBounds={minX:bounds.min.x-x,maxX:bounds.max.x-x,minY:bounds.min.y,maxY:bounds.max.y,minZ:bounds.min.z-z,maxZ:bounds.max.z-z};
    return {
      wallHalfX, wallHalfZ, wallBounds,
      wallHull: typeof SC_WALL_HULLS==='undefined' ? null : SC_WALL_HULLS[this.isGrassroots?'grassroots':'gen7'],
      mesh: g, wheels, isRival: !!isRival && !isTeammate, isTeammate, carId, entrantId, teamName, isContender: !!isContender,
      isPlayer, power, label, hex, number, x, z,
      lv: 0,
      lvx: 0,          // AI lateral velocity (inertia)
      speed: R3D.SPEED_BASE * (0.78 + power * 0.22) * (this.speedScale ?? 1),
      targetX: x,
      spinning: false, spinTimer: 0, spinDir: 1,
      finished: false, dnf: false,
      draftBoost: 0, draftMomentum: 0, towStrength: 0, pushStrength: 0,
      receivedPush: 0, chainLen: 1,
      raceNerve: raceNerve === undefined ? (this.preview?1:0.85 + Math.random() * 0.3) : clamp(raceNerve,.85,1.15),
      laneTimer: this.preview?0:Math.random() * 4,
      contactCooldown: 0,
      tilt: 0,
    };
  }

  _animateCars(dt) {
    for (const car of this.cars) {
      if (!car.wheels) continue;
      const droll = car.speed * dt / R3D.WHEEL_R;
      for (const w of car.wheels) w.rotation.x -= droll;
    }
  }
  }
  for (const name of Object.getOwnPropertyNames(Methods.prototype)) {
    if (name !== "constructor") Object.defineProperty(Race3DEngine.prototype, name,
      Object.getOwnPropertyDescriptor(Methods.prototype, name));
  }
})();
