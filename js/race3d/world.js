// World responsibilities for the shared race engine.
(() => {
  // Each mesh repeats one identical module. Keep its instance buffer immutable
  // and slide the visible run along Z for each camera (including each mirror).
  // Two-sided grandstands use two instances per module and leave a central gap
  // in the distant LOD. Oblique inspection cameras retain the full pool.
  function sceneryPool(mesh, pitch, reach, copies = 1, inner = 0) {
    const fullCount = mesh.count;
    mesh.onBeforeRender = (_renderer, _scene, camera) => {
      if (!camera.isPerspectiveCamera) return;
      const basis = camera.matrixWorld.elements;
      const spread = Math.tan(camera.fov * Math.PI / 360) *
        (Math.abs(basis[2]) * camera.aspect + Math.abs(basis[6])) / camera.zoom;
      if (Math.abs(basis[10]) <= spread) return;
      const center = mesh.matrixWorld.elements[14];
      const eye = Math.floor((basis[14] - center) / pitch);
      // Conservative Z extent of the perspective frustum at its far plane.
      const forwardReach = Math.ceil(camera.far * (Math.abs(basis[10]) + spread) / pitch) + 2;
      let first = -reach, last = reach;
      if (basis[10] < 0) first = Math.max(first, eye - 1);
      else last = Math.min(last, eye + 1);
      if (basis[10] < 0) last = Math.min(last, eye + forwardReach);
      else first = Math.max(first, eye - forwardReach);
      if (inner && first <= -inner && last >= inner) return;
      if (inner && first > -inner) first = Math.max(inner, first);
      if (inner && last < inner) last = Math.min(-inner, last);
      mesh.count = Math.max(0, last - first + 1) * copies;
      mesh.matrixWorld.elements[14] = center + (first + reach) * pitch;
    };
    mesh.onAfterRender = () => {
      mesh.count = fullCount;
      // All scenery instances are direct children of translation-only groups.
      mesh.matrixWorld.elements[14] = mesh.parent.matrixWorld.elements[14];
    };
    mesh.frustumCulled = false;
    return mesh;
  }

  // Soft rubbered-in grooves across the authored, flat road module. Vertex
  // colors interpolate between these samples without a texture or extra draw.
  function shadePavement(geometry) {
    geometry.computeBoundingBox();
    const {min, max} = geometry.boundingBox;
    const positions = [], normals = [], uv = [], colors = [], indices = [];
    const samples = [1, .97, .94, .95, .94, .97, 1];
    samples.forEach((shade, i) => {
      const u = i / (samples.length - 1);
      const x = min.x + (max.x - min.x) * u;
      for (const z of [min.z, max.z]) {
        positions.push(x, min.y, z); normals.push(0, 1, 0);
        uv.push(u, z === min.z ? 0 : 1); colors.push(shade, shade, shade);
      }
      const a = 2 * i;
      if (i) indices.push(a - 2, a - 1, a, a, a - 1, a + 1);
    });
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
  }

  class Methods {
  _loadSurfaceTexture(source, fallbackColor, cutout = false) {
    // A valid tiny image is present before decode, and remains on failure.
    // Empty/failed GPU textures otherwise multiply the pavement to black.
    const tex = r3dTex(2, 2, ctx => { ctx.fillStyle = cutout ? 'rgba(0,0,0,0)' : fallbackColor; ctx.fillRect(0, 0, 2, 2); });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = this._maxAniso;
    tex.userData.loadState = 'loading';
    // Decode bundled bytes directly so image URLs, filtering, and network
    // timing do not determine whether the race starts with textures.
    const load = async () => {
      let bitmap;
      try {
        const [header, payload] = source.split(',');
        const bytes = Uint8Array.from(atob(payload), char => char.charCodeAt(0));
        bitmap = await createImageBitmap(new Blob([bytes], {type: header.slice(5).split(';')[0]}));
        if (this._disposed) return;
        const limit = this.renderer.capabilities.maxTextureSize;
        const canvas = document.createElement('canvas');
        // Power-of-two dimensions preserve repeating mipmaps on WebGL 1.
        canvas.width = 2 ** Math.floor(Math.log2(Math.min(bitmap.width, limit)));
        canvas.height = 2 ** Math.floor(Math.log2(Math.min(bitmap.height, limit)));
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        tex.image = canvas;
        tex.needsUpdate = true;
        tex.userData.loadState = 'loaded';
      } catch (_) {
        if (!this._disposed) tex.userData.loadState = 'fallback';
      } finally {
        bitmap?.close();
      }
    };
    (this._surfaceTextureLoads ??= []).push(load());
    return tex;
  }

  _positionTrack() {
    // Translate the pool by whole modules. Split-screen can switch between
    // distant players without rewriting or uploading any instance matrices.
    for (const [group, layout, key] of [
      [this.trackGroup, this._trackLayout, '_trackCenter'],
      [this.environmentGroup, this._environmentLayout, '_environmentCenter'],
    ]) {
      if (!group || !layout) continue;
      const {length} = layout;
      const center = Math.floor((this.player?.z || 0) / length);
      // Use the far-plane safety margin to avoid rebuilding the pools when
      // adjacent split-screen players straddle a module boundary.
      if (Math.abs(center - this[key]) * length <= Math.max(0, 150 - length)) continue;
      this[key] = center;
      group.position.z = center * length;
      group.updateMatrixWorld(true);
    }
  }

  _buildTrack() {
    const s  = this.scene;
    const d  = this._dummy;

    // Blender-authored straight selected by series. Grassroots has a narrower
    // worn surface, plain retaining walls and shorter catch fencing.
    // One shared indexed buffer per material, repeated in 60-unit modules.
    const track = this.isGrassroots ? SC_GRASSROOTS_TRACK_MODEL : SC_TRACK_MODEL;
    const textures = this.isGrassroots ? SC_GRASSROOTS_TRACK_TEXTURES : SC_TRACK_TEXTURES;
    const load = name => {
      // Data URLs remain valid WebGL sources when index.html is opened via
      // file://. Neighboring file images are rejected by Chrome's CORS rules.
      if (this.graphicsMode !== 'high') return null;
      return this._loadSurfaceTexture(textures[name], name === 'speedway-asphalt' ? '#777777' : '#deded8', name === 'speedway-mesh');
    };
    const trackMaterials = {
      asphalt: new THREE.MeshLambertMaterial({ map: load('speedway-asphalt'), color: this.graphicsMode === 'high' ? 0xbdbdbd : 0x53585c, vertexColors: this.graphicsMode !== 'high', side: THREE.DoubleSide }),
      wall: new THREE.MeshLambertMaterial({ map: load('speedway-wall'), color: this.graphicsMode === 'high' ? 0xffffff : 0xb5b8b5, side: THREE.DoubleSide }),
      concrete: new THREE.MeshLambertMaterial({ color: 0x858984, side: THREE.DoubleSide }),
      steel: new THREE.MeshLambertMaterial({ color: 0x505b60, side: THREE.DoubleSide }),
      absorber: new THREE.MeshLambertMaterial({ color: 0x252a28, side: THREE.DoubleSide }),
      paint: new THREE.MeshLambertMaterial({ color: 0xe2dfcf, side: THREE.DoubleSide }),
      fence: new THREE.MeshLambertMaterial({ map: load('speedway-mesh'), side: THREE.DoubleSide,
        alphaTest: this.graphicsMode === 'high' ? .35 : 0, alphaToCoverage: this.graphicsMode === 'high',
        transparent: this.graphicsMode !== 'high',
        opacity: this.graphicsMode === 'high' ? 1 : .09, depthWrite: this.graphicsMode === 'high' }),
    };
    // Visual runout extends past the cameras' 4,000-unit far plane at both
    // endpoints, including the longer series-specific racing distances.
    this._trackLayout = {length: track.moduleLength};
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
      if (name === 'asphalt' && this.graphicsMode !== 'high') shadePavement(geometry);
      // Fence posts and absorber bolts become subpixel well before the road,
      // barriers and fence silhouette disappear into the fog.
      const fine = name === 'steel' || name === 'absorber';
      const distance = fine ? (this.graphicsMode === 'high' ? 1200 : this.lowPower ? 540 : 780) : 4200;
      const reach = Math.ceil(distance / track.moduleLength);
      const moduleCount = 2 * reach + 1;
      const mesh = new THREE.InstancedMesh(geometry, trackMaterials[name], moduleCount);
      mesh.name = 'track:' + name;
      mesh.receiveShadow = name === 'asphalt' || name === 'wall' || name === 'concrete';
      for (let i = 0; i < moduleCount; i++) {
        d.position.set(0, 0, (i - reach) * track.moduleLength);
        d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      this.trackGroup.add(sceneryPool(mesh, track.moduleLength, reach));
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
    const count = runout * 2 + 1;
    this._environmentLayout = {length:asset.moduleLength};
    for (const [name, data] of Object.entries(model.parts)) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
      geometry.setIndex(data.index);
      const color = name === 'grass' ? '#344e30' : '#777c79';
      const map = this.graphicsMode === 'high' ? this._loadSurfaceTexture(asset.textures[name], color) : null;
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({map, color: map ? '#ffffff' : color}), count);
      mesh.name = 'ground:' + name; mesh.receiveShadow = true;
      for (let i = 0; i < count; i++) {
        this._dummy.position.set(0, 0, (i - runout) * asset.moduleLength);
        this._dummy.rotation.set(0, 0, 0); this._dummy.scale.set(1, 1, 1); this._dummy.updateMatrix();
        mesh.setMatrixAt(i, this._dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true; this.environmentGroup.add(sceneryPool(mesh, asset.moduleLength, runout));
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
    // The shader writes far-plane depth. Draw after opaque scenery so depth
    // testing rejects the road and stands before running the sky shader.
    this.sky.name = 'environment:clear-midday'; this.sky.frustumCulled = false; this.sky.renderOrder = 100;
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
    // A bounded pool follows both cameras. Far modules retain the architecture
    // but omit individual benches/spectators. Nothing is rebuilt each frame.
    const reach = Math.ceil(2400 / model.pitch);
    const nearReach = Math.floor((this.graphicsMode === 'high' ? 300 : this.lowPower ? 150 : 220) / model.pitch);
    for (const [lod, parts] of [['near', model.parts], ['far', model.distantParts]]) {
      for (const [name, data] of Object.entries(parts)) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
        geometry.setIndex(data.index); geometry.computeBoundingSphere();
        const inner = lod === 'near' ? 0 : nearReach + 1;
        const fine = name === 'steel' || name === 'aluminum';
        const outer = lod === 'near' ? nearReach : fine ? Math.ceil((this.graphicsMode === 'high' ? 960 : 600) / model.pitch) : reach;
        const modules = inner ? 2 * (outer - inner + 1) : 2 * outer + 1;
        const mesh = new THREE.InstancedMesh(geometry, materials[name], modules * 2);
        mesh.name = 'grandstand:' + lod + ':' + name;
        let index = 0;
        for (let offset = -outer; offset <= outer; offset++) {
          if (Math.abs(offset) < inner) continue;
          for (const side of [-1, 1]) {
            const d = this._dummy;
            d.position.set(side * model.frontX, 0, offset * model.pitch + (side < 0 ? asset.moduleLength : 0));
            d.rotation.set(0, side < 0 ? Math.PI : 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
            mesh.setMatrixAt(index++, d.matrix);
          }
        }
        this.grandstandGroup.add(sceneryPool(mesh, model.pitch, outer, 2, inner));
      }
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
    this.grandstandGroup.position.z = center * model.pitch;
    this.grandstandGroup.updateMatrixWorld(true);
  }
  }
  for (const name of Object.getOwnPropertyNames(Methods.prototype)) {
    if (name !== "constructor") Object.defineProperty(Race3DEngine.prototype, name,
      Object.getOwnPropertyDescriptor(Methods.prototype, name));
  }
})();
