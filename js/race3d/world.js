// World responsibilities for the shared race engine.
(() => {
  class Methods {
  _loadSurfaceTexture(source, fallbackColor, cutout = false) {
    // A valid tiny image is present before decode, and remains on failure.
    // Empty/failed GPU textures otherwise multiply the pavement to black.
    const tex = r3dTex(2, 2, ctx => { ctx.fillStyle = cutout ? 'rgba(0,0,0,0)' : fallbackColor; ctx.fillRect(0, 0, 2, 2); });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = this._maxAniso;
    tex.userData.loadState = 'loading';
    const image = new Image();
    image.onload = () => {
      if (this._disposed) return;
      const limit = Math.min(this.renderer.capabilities.maxTextureSize, this.lowPower ? 1024 : 2048);
      const scale = Math.min(1, limit / Math.max(image.width, image.height));
      let decoded = image;
      if (scale < 1) {
        decoded = document.createElement('canvas');
        // Power-of-two dimensions keep repeat/mipmaps valid on WebGL 1 too.
        decoded.width = 2 ** Math.floor(Math.log2(image.width * scale));
        decoded.height = 2 ** Math.floor(Math.log2(image.height * scale));
        decoded.getContext('2d').drawImage(image, 0, 0, decoded.width, decoded.height);
      }
      tex.image = decoded; tex.needsUpdate = true; tex.userData.loadState = 'loaded';
    };
    image.onerror = () => { if (!this._disposed) tex.userData.loadState = 'fallback'; };
    image.src = source || '';
    return tex;
  }

  _positionTrack() {
    if (!this.lowPower || !this._trackLayout) return;
    const {length, count} = this._trackLayout;
    const center = Math.floor((this.player?.z || 0) / length);
    if (center === this._trackCenter) return;
    this._trackCenter = center;
    const reach = Math.ceil(4200 / length);
    for (const mesh of this.trackGroup.children) {
      mesh.count = Math.min(count, reach * 2 + 1);
      for (let i = 0; i < mesh.count; i++) {
        this._dummy.position.set(0, 0, (center + i - reach) * length);
        this._dummy.rotation.set(0, 0, 0); this._dummy.scale.set(1, 1, 1); this._dummy.updateMatrix();
        mesh.setMatrixAt(i, this._dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  _buildTrack() {
    const s  = this.scene;
    const TL = Math.max(this.raceLength, R3D.TRACK_LEN);
    const d  = this._dummy;

    // Blender-authored straight selected by series. Grassroots has a narrower
    // worn surface, plain retaining walls and shorter catch fencing.
    // One shared indexed buffer per material, repeated in 60-unit modules.
    const track = this.isGrassroots ? SC_GRASSROOTS_TRACK_MODEL : SC_TRACK_MODEL;
    const textures = this.isGrassroots ? SC_GRASSROOTS_TRACK_TEXTURES : SC_TRACK_TEXTURES;
    const load = name => {
      // Data URLs remain valid WebGL sources when index.html is opened via
      // file://. Neighboring file images are rejected by Chrome's CORS rules.
      return this._loadSurfaceTexture(textures[name], name === 'speedway-asphalt' ? '#777777' : '#deded8', name === 'speedway-mesh');
    };
    const trackMaterials = {
      asphalt: new THREE.MeshLambertMaterial({ map: load('speedway-asphalt'), color: 0xbdbdbd, side: THREE.DoubleSide }),
      wall: new THREE.MeshLambertMaterial({ map: load('speedway-wall'), side: THREE.DoubleSide }),
      concrete: new THREE.MeshLambertMaterial({ color: 0x858984, side: THREE.DoubleSide }),
      steel: new THREE.MeshLambertMaterial({ color: 0x505b60, side: THREE.DoubleSide }),
      absorber: new THREE.MeshLambertMaterial({ color: 0x252a28, side: THREE.DoubleSide }),
      paint: new THREE.MeshLambertMaterial({ color: 0xe2dfcf, side: THREE.DoubleSide }),
      fence: new THREE.MeshLambertMaterial({ map: load('speedway-mesh'), side: THREE.DoubleSide,
        alphaTest: 0.35, alphaToCoverage: true }),
    };
    // Visual runout extends past the cameras' 4,000-unit far plane at both
    // endpoints, including the longer series-specific racing distances.
    const runoutModules = Math.ceil(4200 / track.moduleLength);
    const moduleCount = Math.ceil(TL / track.moduleLength) + 2 * runoutModules;
    this._trackLayout = {length: track.moduleLength, count: moduleCount};
    this.trackGroup = new THREE.Group();
    this.trackGroup.name = track.name;
    this.wallInnerX = track.wallInnerX;
    this.trackGroup.userData = { width: track.trackWidth, wallInnerX: track.wallInnerX, fenceHeight: track.fenceHeight };
    const buildGeometry = data => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
      geometry.setIndex(data.index);
      geometry.computeBoundingSphere();
      return geometry;
    };
    for (const [name, data] of Object.entries(track.parts)) {
      const geometry = buildGeometry(data);
      const mesh = new THREE.InstancedMesh(geometry, trackMaterials[name], moduleCount);
      mesh.name = 'track:' + name;
      mesh.receiveShadow = name === 'asphalt' || name === 'wall' || name === 'concrete';
      for (let i = 0; i < moduleCount; i++) {
        d.position.set(0, 0, (i - runoutModules) * track.moduleLength);
        d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      // Three r134 cannot calculate aggregate InstancedMesh bounds.
      mesh.frustumCulled = false;
      this.trackGroup.add(mesh);
    }
    s.add(this.trackGroup);

    // One Blender-authored finish: dark steel truss, two-sided mesh lettering
    // and flush checkered paint centered on this race's finish plane.
    this.finishGroup = new THREE.Group();
    this.finishGroup.name = 'track:finish';
    this.finishGroup.position.z = this.raceLength;
    for (const [name, data] of Object.entries(track.finishParts)) {
      const mesh = new THREE.Mesh(buildGeometry(data), trackMaterials[name]);
      mesh.name = 'finish:' + name;
      mesh.receiveShadow = true;
      this.finishGroup.add(mesh);
    }
    s.add(this.finishGroup);
    // Starting positions remain unchanged; the old yellow grid stripes are gone.
  }

  _buildEnvironment() {
    this._buildGrandstands();
    const asset = SC_ENVIRONMENT, model = asset.models[this._grandstandModel.id];
    this.environmentGroup = new THREE.Group();
    this.environmentGroup.name = 'environment:ground';
    this.environmentGroup.userData = { seriesId: this._grandstandModel.id, frontX: model.frontX, backX: model.backX };
    const runout = Math.ceil(4200 / asset.moduleLength);
    const count = Math.ceil(Math.max(this.raceLength, R3D.TRACK_LEN) / asset.moduleLength) + runout * 2;
    for (const [name, data] of Object.entries(model.parts)) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
      geometry.setIndex(data.index);
      const map = this._loadSurfaceTexture(asset.textures[name], name === 'grass' ? '#567745' : '#858984');
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ map }), count);
      mesh.name = 'ground:' + name; mesh.receiveShadow = true; mesh.frustumCulled = false;
      for (let i = 0; i < count; i++) {
        this._dummy.position.set(0, 0, (i - runout) * asset.moduleLength);
        this._dummy.rotation.set(0, 0, 0); this._dummy.scale.set(1, 1, 1); this._dummy.updateMatrix();
        mesh.setMatrixAt(i, this._dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true; this.environmentGroup.add(mesh);
    }
    this.scene.add(this.environmentGroup);
    // Direction-only background: no translation, clouds, extra sun disc or
    // finite skybox edges. The same shader covers the chase and mirror views.
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.ShaderMaterial({
      uniforms: { horizon: { value: new THREE.Color(asset.sky.horizon) }, zenith: { value: new THREE.Color(asset.sky.zenith) } },
      vertexShader: 'varying vec3 direction; void main(){ direction=position; vec4 p=projectionMatrix*vec4(mat3(viewMatrix)*position,1.0); gl_Position=p.xyww; }',
      fragmentShader: 'uniform vec3 horizon; uniform vec3 zenith; varying vec3 direction; void main(){ float t=smoothstep(0.0,0.65,normalize(direction).y); gl_FragColor=vec4(mix(horizon,zenith,t),1.0); }',
      side: THREE.BackSide, depthWrite: false, toneMapped: false
    }));
    this.sky.name = 'environment:clear-midday'; this.sky.frustumCulled = false; this.sky.renderOrder = -100;
    this.scene.add(this.sky);
  }

  _buildGrandstands() {
    const asset = SC_GRANDSTANDS;
    const seriesId = this.config.seriesId || SERIES.find(s => s.fieldSize === this.config.fieldSize)?.id;
    const model = asset.models[seriesId] || asset.models.grassroots;
    const crowd = new THREE.TextureLoader().load(asset.crowdTexture);
    crowd.wrapS = crowd.wrapT = THREE.RepeatWrapping;
    const materials = {};
    for (const [name, color] of Object.entries(asset.materials)) {
      materials[name] = new THREE.MeshLambertMaterial({ color: new THREE.Color(...color),
        side: name === 'crowd' ? THREE.DoubleSide : THREE.FrontSide,
        ...(name === 'crowd' ? { map: crowd, alphaTest: 0.45, alphaToCoverage: true } : {}) });
    }
    this.grandstandGroup = new THREE.Group();
    this.grandstandGroup.name = 'grandstands:' + model.id;
    this.grandstandGroup.userData = { seriesId: model.id, decks: model.deckCount, height: model.height, frontX: model.frontX };
    this._grandstandModel = model;
    this._grandstandBands = [];
    // A bounded pool follows both cameras. Far modules retain the architecture
    // but omit individual benches/spectators. Nothing is rebuilt each frame.
    const reach = Math.ceil(2400 / model.pitch);
    for (const [lod, parts] of [['near', model.parts], ['far', model.distantParts]]) {
      const meshes = [];
      for (const [name, data] of Object.entries(parts)) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
        geometry.setIndex(data.index); geometry.computeBoundingSphere();
        const mesh = new THREE.InstancedMesh(geometry, materials[name], (reach * 2 + 1) * 2);
        mesh.name = 'grandstand:' + lod + ':' + name;
        // Three r134 has no aggregate instanced bounds. The bounded pool is
        // manually placed around the player, including the rear-view direction.
        mesh.frustumCulled = false;
        this.grandstandGroup.add(mesh); meshes.push(mesh);
      }
      this._grandstandBands.push({ lod, meshes });
    }
    this.scene.add(this.grandstandGroup);
    this._positionGrandstands();
  }

  _positionGrandstands() {
    if (!this._grandstandModel) return;
    const model = this._grandstandModel;
    const center = Math.floor((this.player?.z || 0) / model.pitch);
    if (center === this._grandstandCenter) return;
    this._grandstandCenter = center;
    const reach = Math.ceil(2400 / model.pitch), d = this._dummy;
    for (const { lod, meshes } of this._grandstandBands) {
      let index = 0;
      for (let offset = -reach; offset <= reach; offset++) {
        const near = Math.abs(offset * model.pitch) <= 300;
        if (near !== (lod === 'near')) continue;
        for (const side of [-1, 1]) {
          // Rotate rather than use a negative instance scale (unsupported by Three).
          d.position.set(side * model.frontX, 0, (center + offset) * model.pitch + (side < 0 ? SC_GRANDSTANDS.moduleLength : 0));
          d.rotation.set(0, side < 0 ? Math.PI : 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
          for (const mesh of meshes) mesh.setMatrixAt(index, d.matrix);
          index++;
        }
      }
      for (const mesh of meshes) { mesh.count = index; mesh.instanceMatrix.needsUpdate = true; }
    }
  }
  }
  for (const name of Object.getOwnPropertyNames(Methods.prototype)) {
    if (name !== "constructor") Object.defineProperty(Race3DEngine.prototype, name,
      Object.getOwnPropertyDescriptor(Methods.prototype, name));
  }
})();
