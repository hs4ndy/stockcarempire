// Contact responsibilities for the shared race engine.
(() => {
  class Methods {
  _incidentRules() {
    if(this._raceFeatures) return this._raceFeatures;
    if(this.config?.practiceTips || !this.config?.raceRules) return {crashes:false,damage:false};
    return this._raceFeatures=raceFeatureRules(this.config.difficulty || this.diff?.id,this.config.raceRules);
  }

  _healthPace(car) {
    const rules=this._incidentRules();
    const health=(car.raceHealth ?? 100)/100;
    return (rules.damage ? (car.isPlayer ? .85+.15*health : .70+.30*health) : 1) *
      (rules.crashes ? Math.max(car.isPlayer ? .88 : .74,1-(car.crashCount||0)*(car.isPlayer ? .03 : .06)) : 1);
  }

  _damageCar(car,amount) {
    if(!this._incidentRules().damage || car.finished || car.dnf || amount<=0) return;
    // Race health is deliberately forgiving: side rubs, walls and crash
    // impacts all use one scale, independently of loss-of-control strain.
    car.raceHealth=clamp((car.raceHealth ?? 100)-amount*.20,0,100);
    if(car.raceHealth<=0 && !car._zeroHealthHandled) {
      car._zeroHealthHandled=true;
      if(this._incidentRules().crashes) {
        if(car.wheels?.[0]) car.wheels[0].scale.set(1,.55,.8);
        this._beginCrash(car,Math.sign(car.x)||1,'blowout');
      }
    }
  }

  _sideContact(a,b,closing,pressure,dt,dir) {
    const rules=this._incidentRules();if(!rules.crashes && !rules.damage) return;
    // Bumper drafts never call this path. Brief/light rubs produce negligible
    // strain; repeated sustained lateral force builds toward loss of control.
    const strain=(Math.max(0,closing-1)*3+pressure*1.5)*dt;
    for(const [car,side] of [[a,-dir],[b,dir]]) {
      if(car.spinning || car._crashGrace>0) continue;
      this._damageCar(car,(Math.max(0,closing-1)*5+pressure*.8)*dt);
      // AI door contact needs sustained force; human-caused AI strain is
      // reduced modestly, AI-only strain substantially. Player tolerance stays.
      const strainScale = car.isPlayer ? 1 : (a.isPlayer || b.isPlayer ? .80 : .28);
      car.sideStrain=(car.sideStrain||0)+strain*strainScale;car._recentSide=.5;
      const threshold=this._crashThreshold(car);
      if(rules.crashes && car.sideStrain>=threshold) this._beginCrash(car,side,'side contact');
    }
  }

  _crashThreshold(car) {
    if(car.isPlayer) return 80;
    return this.config?.seriesId==='grassroots' ? 10 : this.config?.seriesId==='challenger' ? 4 : 7;
  }

  _beginCrash(car,side,cause) {
    if(!this._incidentRules().crashes || car.spinning || car.finished || car.dnf || car._crashGrace>0) return false;
    if(cause==='collected' && ((this._collectedCount||0)>=4 || this.cars.filter(c=>c.spinning).length>=5)) return false;
    if(cause==='collected') this._collectedCount=(this._collectedCount||0)+1;
    car.spinning=true;car._crashPhase='veer';car._veerTime=.85;car.spinTimer=2.5;car.spinDir=side||1;
    car.crashCount=(car.crashCount||0)+1;car.sideStrain=0;car._crashCause=cause;
    this.wreckCount=(this.wreckCount||0)+1;
    this._damageCar(car,cause==='blowout'?0:18);
    if(cause==='blowout' && car.wheels?.[0]) car.wheels[0].scale.set(1,.55,.8);
    if(car.isPlayer) this.camShake=Math.max(this.camShake||0,.5);
    return true;
  }

  _advanceCrash(car,dt) {
    if(!car.spinning) return false;
    if(!this._incidentRules().crashes) {car.spinning=false;car._crashPhase=null;return false;}
    if(car._crashPhase==='veer') {
      car._veerTime-=dt;car.x+=car.spinDir*14*dt;car[car.isPlayer?'lv':'lvx']=car.spinDir*14;
      car.speed=Math.max(45,car.speed-80*dt);
      car.mesh.rotation.y=car.spinDir*.35;
      if(car._veerTime<=0) car._crashPhase='spin';
    } else {
      car.spinTimer=(car.spinTimer ?? 2.5)-dt;car.mesh.rotation.y+=car.spinDir*4.5*dt;
      car.speed=Math.max(30,car.speed-65*dt);
      if(car.spinTimer<=0) {
        car.spinning=false;car._crashPhase=null;car._crashGrace=5;car.mesh.rotation.y=0;
        car.lv=car.lvx=0;car.targetX=clamp(car.x,-6,6);
      }
    }
    car.z+=car.speed*dt;car.mesh.position.set(car.x,0,car.z);
    return true;
  }

  _stepContactState(dt) {
    const rules=this._incidentRules();
    if(!rules.crashes && !rules.damage) return;
    for(const car of this.cars) {
      car._crashGrace=Math.max(0,(car._crashGrace||0)-dt);
      car._recentSide=Math.max(0,(car._recentSide||0)-dt);
      if(!car._recentSide) car.sideStrain=Math.max(0,(car.sideStrain||0)-.35*dt);
      if(rules.damage && (car.raceHealth ?? 100)<=0 && !car._zeroHealthHandled) this._damageCar(car,.001);
    }
    if(!rules.crashes) return;
    // A car broadside in a spin can collect traffic; normal front/rear drafts
    // do not count. Grace and pair cooldowns bound chain reactions.
    for(const wreck of this.cars.filter(c=>c.spinning)) for(const car of this.cars) {
      if(car===wreck || car.spinning || car.finished || car.dnf || car._crashGrace>0 || car._recentSide>0) continue;
      if((wreck._crashPhase==='veer' || Math.abs(Math.sin(wreck.mesh.rotation.y))>.25) && this._wreckOverlap(wreck,car)) {
        this._damageCar(car,14);car._recentSide=1;
        car.sideStrain=(car.sideStrain||0)+(car.isPlayer?12:25);
        car.speed*=.8;
        if(car.sideStrain>=this._crashThreshold(car)) this._beginCrash(car,Math.sign(car.x-wreck.x)||1,'collected');
      }
    }
  }

  _wreckOverlap(a,b) {
    const ay=a.mesh?.rotation?.y||0,by=b.mesh?.rotation?.y||0;
    const axes=[{x:Math.cos(ay),z:-Math.sin(ay)},{x:Math.sin(ay),z:Math.cos(ay)},
      {x:Math.cos(by),z:-Math.sin(by)},{x:Math.sin(by),z:Math.cos(by)}];
    const radius=(c,y,n)=>Math.abs(n.x*Math.cos(y)-n.z*Math.sin(y))*(c.wallHalfX??R3D.CAR_SEP_X/2)+
      Math.abs(n.x*Math.sin(y)+n.z*Math.cos(y))*(c.wallHalfZ??R3D.CAR_SEP_Z/2);
    return axes.every(n=>Math.abs((a.x-b.x)*n.x+(a.z-b.z)*n.z)<radius(a,ay,n)+radius(b,by,n));
  }

  _wallExtent(car,side=1) {
    const yaw=car.mesh?.rotation?.y || 0;
    const roll=car.mesh?.rotation?.z || 0,b=car.wallBounds;
    if(car.wallHull) {
      const a=side*Math.cos(yaw)*Math.cos(roll),c=-side*Math.cos(yaw)*Math.sin(roll),d=side*Math.sin(yaw);
      let support=-Infinity,point=0;
      for(let i=0;i<car.wallHull.length;i+=3){const h=car.wallHull,v=a*h[i]+c*h[i+1]+d*h[i+2];if(v>support){support=v;point=i;}}
      car._wallPoint=point;
      return support;
    }
    if(b) {
      const a=side*Math.cos(yaw)*Math.cos(roll),c=-side*Math.cos(yaw)*Math.sin(roll),d=side*Math.sin(yaw);
      return a*(a>=0?b.maxX:b.minX)+c*(c>=0?b.maxY:b.minY)+d*(d>=0?b.maxZ:b.minZ);
    }
    return Math.abs(Math.cos(yaw))*(car.wallHalfX ?? R3D.CAR_SEP_X/2) +
      Math.abs(Math.sin(yaw))*(car.wallHalfZ ?? R3D.CAR_SEP_Z/2);
  }

  _resolveWalls(dt) {
    const wall=this.wallInnerX ?? (this.trackHalfWidth ?? R3D.HALF_W)+0.2;
    for(const car of this.cars) {
      if(car.finished || car.dnf) continue;
      const side=Math.sign(car.x)||1,limit=Math.max(0,wall-this._wallExtent(car,side));
      const overlap=Math.abs(car.x)-limit;
      car._sparkWait=Math.max(0,(car._sparkWait||0)-dt);
      if(overlap<0) {if(overlap<-.015) car._wallContact=false;continue;}
      const key=car.isPlayer ? 'lv' : 'lvx', normal=Math.max(0,(car[key]||0)*side);
      const impact=!car._wallContact;
      car.x=side*limit;
      if(normal>0) car[key]=-side*normal*.12;
      // Inelastic normal response plus tangential scraping. Never grant speed
      // at the wall, and never penalize a car whose body has not reached it.
      car.speed=Math.max(0,car.speed-(impact ? normal*.22 : 0)-(2+car.speed*.055+normal*.65)*dt);
      if(impact) {
        this._damageCar(car,normal*.85);
        if(car._crashPhase==='veer') {car._crashPhase='spin';car.spinTimer=2.5;}
      }
      if(!car.spinning) this._damageCar(car,(normal*.25+.4)*dt);
      car._wallContact=true;
      if(car.isPlayer) this.camShake=Math.max(this.camShake||0,Math.min(.5,normal*.025));
      if(car.speed>25 && !car._sparkWait) {
        const h=car.wallHull,i=car._wallPoint||0,yaw=car.mesh.rotation.y||0,roll=car.mesh.rotation.z||0;
        const contactZ=h ? car.z-Math.sin(yaw)*Math.cos(roll)*h[i]+Math.sin(yaw)*Math.sin(roll)*h[i+1]+Math.cos(yaw)*h[i+2] : car.z;
        this._emitWallSparks(side*wall,contactZ,car.speed,side,impact?36:12);
        car._sparkWait=.025;
      }
      // AI steers back into racing room after contact, with its existing
      // acceleration-limited steering. Contact itself is identical for all.
      if(!car.isPlayer) car.targetX=clamp(car.targetX,-limit+.4,limit-.4);
      car.mesh.position.x=car.x;
    }
  }

  _emitWallSparks(x,z,speed,side,count,underbody=false) {
    if(!this.scene) return; // headless physics uses the same contact solver
    if(!this._wallSparks) {
      this._wallSparks=Array.from({length:384},()=>({life:0}));this._sparkCursor=0;this._sparkSeed=12345;
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(384*6),3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(384*6),3).setUsage(THREE.DynamicDrawUsage));
      geometry.setDrawRange(0,0);
      this._sparkMesh=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false}));
      this._sparkMesh.name='wall:sparks';this._sparkMesh.frustumCulled=false;this.scene.add(this._sparkMesh);
    }
    const random=()=>{let n=this._sparkSeed;n^=n<<13;n^=n>>>17;n^=n<<5;this._sparkSeed=n;return (n>>>0)/4294967296;};
    for(let i=0;i<count;i++) {
      const p=this._wallSparks[this._sparkCursor++%384];
      p.x=x-side*.06;p.y=.4+random()*.4;p.z=z+(random()-.5)*.8;
      p.vx=-side*(2+random()*7);p.vy=2+random()*6;p.vz=-speed*(.18+random()*.3);
      p.life=p.maxLife=.35+random()*.3;
      if(underbody) {
        p.x=x+(random()-.5)*1.2;p.y=.25+random()*.12;p.z=z+(random()-.5)*1.6;
        p.vx=(random()-.5)*3;p.vy=1.5+random()*2;p.vz=-speed*(.2+random()*.12);
        p.life=p.maxLife=.4+random()*.2;
      }
    }
  }

  _stepWallSparks(dt) {
    if(this.paused) return;
    // Reuse the wall pool and private visual RNG; never alter driving state.
    if(this.scene && this._incidentRules().damage) for(const car of this.cars) {
      car._conditionSparkWait=Math.max(0,(car._conditionSparkWait||0)-dt);
      const nearby=car.isPlayer || Math.abs(car.z-this.player.z)<180 ||
        (this.player2 && Math.abs(car.z-this.player2.z)<180);
      if(!car.finished && !car.dnf && car.raceHealth<50 && car.speed>5 && nearby && !car._conditionSparkWait) {
        this._emitWallSparks(car.x,car.z,car.speed,0,3,true);
        car._conditionSparkWait=.025;
      }
    }
    if(!this._wallSparks) return;
    const g=this._sparkMesh.geometry,pos=g.attributes.position,col=g.attributes.color;let index=0;
    for(const p of this._wallSparks) {
      p.life-=dt;if(p.life<=0) continue;
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=9*dt;
      if(p.y<.03){p.y=.03;p.vy=Math.abs(p.vy)*.2;}
      const fade=p.life/p.maxLife;
      pos.setXYZ(index,p.x,p.y,p.z);pos.setXYZ(index+1,p.x-p.vx*.06,p.y-p.vy*.06,p.z-p.vz*.06);
      col.setXYZ(index,3*fade,2.2*fade,.8*fade);col.setXYZ(index+1,1.8*fade,.5*fade,.04*fade);index+=2;
    }
    pos.needsUpdate=col.needsUpdate=true;g.setDrawRange(0,index);
  }

  _checkCollisions() {
    const p = this.player;
    if (p.spinning || p.finished) return;
    for (const car of this.cars) {
      if (car === p || car.finished) continue;
      const adx = Math.abs(p.x - car.x), adz = Math.abs(p.z - car.z);
      if (adx < 1.9 && adz < 4.2) {
        const isBumperPush = p.z < car.z && adz > adx * 1.5;
        if (!isBumperPush && car.contactCooldown <= 0) {
          car.contactCooldown = R3D.BUMP_DEBOUNCE;
          const sideClosing = Math.max(0, ((p.lv || 0) - (car.lvx || 0)) * Math.sign(car.x - p.x));
          this._bumpPlayer(car.x < p.x ? 1 : -1, sideClosing);
        }
        return;
      }
    }
    for (const w of this.wrecks) {
      if (Math.abs(p.x - w.x) < 2.4 && Math.abs(p.z - w.z) < 2.8) {
        this._spinPlayer(2.0, Math.sign(p.lv) || 1, 1.5);
        this._warn('HIT WRECK');
        return;
      }
    }
  }

  _bumpPlayer(pushDir, severity = 0) {
    const p = this.player;
    if (p.spinning) return;
    // The separation solver owns lateral forces. Doubling its impulse here
    // made a harmless rub turn into a sudden sideways launch.
    p.speed = Math.max(p.speed * (1 - clamp(severity * 0.004, 0, 0.025)), 80);
    this.camShake = Math.max(this.camShake, 0.2);
  }

  _spinPlayer(duration, dir, shake) { this._beginCrash(this.player,dir,'contact'); }

  _triggerWreck() {}

  _dropDebris(car) {
    const wx = car.x, wz = car.z;
    this.wrecks.push({ x: wx, z: wz });
    const db = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.35, 2.8),
      new THREE.MeshLambertMaterial({ color: 0x4c4c52 }));
    db.rotation.y = Math.random() * Math.PI;
    db.position.set(wx, 0.18, wz); this.scene.add(db);
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x8a8a90, transparent: true, opacity: 0.38 }));
    smoke.position.set(wx, 1.9, wz); this.scene.add(smoke);
  }
  }
  for (const name of Object.getOwnPropertyNames(Methods.prototype)) {
    if (name !== "constructor") Object.defineProperty(Race3DEngine.prototype, name,
      Object.getOwnPropertyDescriptor(Methods.prototype, name));
  }
})();
