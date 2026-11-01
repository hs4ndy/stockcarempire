// Cameras responsibilities for the shared race engine.
(() => {
  class Methods {
  _updateCamera(dt) {
    this._positionTrack();
    this._positionGrandstands();
    const p  = this.player;
    const sk = this.camShake;
    const nx = sk > 0 ? (Math.random() - 0.5) * sk : 0;
    const ny = sk > 0 ? (Math.random() - 0.5) * sk * 0.4 : 0;

    // Perceived speed is deliberately decoupled from simulation speed. A low,
    // elevated camera and a broad race-speed FOV preserve the arcade sensation
    // without making every car cover the track unrealistically quickly.
    const speedFeel = r3dSmooth(clamp((p.speed - R3D.PACE_SPEED) / (245 - R3D.PACE_SPEED), 0, 1));
    const fovTarget = R3D.CAMERA_FOV_MIN +
      (R3D.CAMERA_FOV_MAX - R3D.CAMERA_FOV_MIN) * speedFeel;
    this.camera.fov += (fovTarget - this.camera.fov) * (1 - Math.exp(-4.35 * dt));
    this.camera.updateProjectionMatrix();

    const tx = p.x * 0.85 + nx;
    const ty = 6.0 + ny;
    const followZ = R3D.CAMERA_NEAR_Z + (R3D.CAMERA_FAR_Z - R3D.CAMERA_NEAR_Z) * speedFeel;
    const tz = p.z - followZ + nx * 0.15;
    this.camera.position.x += (tx - this.camera.position.x) * (1 - Math.exp(-6 * dt));
    this.camera.position.y += (ty - this.camera.position.y) * (1 - Math.exp(-5 * dt));
    // Longitudinal camera lag changed the apparent following distance with
    // FPS and draft speed. Keep the familiar race-speed framing at a fixed
    // distance; ease lateral motion without changing the size of the pack.
    this.camera.position.z = tz;
    this.camera.lookAt(p.x * 0.55, 0.8, p.z + 30);
    this.camera.rotateZ(-p.lv / R3D.LAT_MAX * 0.026);
    this.camShake = Math.max(0, sk - dt * 2.5);

    // Virtual interior mirror: enough eye-to-bumper distance to show the
    // following car's nose and wheels, not just its roof. Our own mesh is
    // hidden for this pass, so the cabin never obscures the view.
    this.mirrorCam.position.set(p.x, 1.15, p.z + 5);
    this.mirrorCam.lookAt(p.x, -0.5, p.z - 24);
  }

  _initMirrorTarget(w, h) {
    if (this.mirrorRT) this.mirrorRT.dispose();
    const Target = this.renderer.capabilities.isWebGL2 && !this.lowPower
      ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget;
    this.mirrorRT = new Target(Math.max(2, w), Math.max(2, h), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
    });
    if (this.renderer.capabilities.isWebGL2 && !this.lowPower) this.mirrorRT.samples = 4;
    this.mirrorRTSize = { w, h };

    if (!this.mirrorScene) {
      this.mirrorScene = new THREE.Scene();
      this.mirrorQuadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      // depthTest off: the main scene has already written depth into this
      // region of the canvas and would otherwise reject the quad.
      this.mirrorQuadMat = new THREE.MeshBasicMaterial({
        map: this.mirrorRT.texture, depthTest: false, depthWrite: false,
      });
      this.mirrorSize = { value: new THREE.Vector2(w, h) };
      this.mirrorQuadMat.onBeforeCompile = shader => {
        shader.uniforms.mirrorSize = this.mirrorSize;
        shader.fragmentShader = 'uniform vec2 mirrorSize;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
          vec2 q = abs(vUv - 0.5) * mirrorSize - (mirrorSize * 0.5 - vec2(8.0));
          if (length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) > 8.0) discard;`);
      };
      this.mirrorQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mirrorQuadMat);
      this.mirrorScene.add(this.mirrorQuad);
    } else {
      this.mirrorQuadMat.map = this.mirrorRT.texture;
      this.mirrorQuadMat.needsUpdate = true;
    }
    // Horizontal flip - this is what makes it read as a mirror.
    const t = this.mirrorRT.texture;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = -1;
    t.offset.x = 1;
  }

  _renderMirror() {
    const wrap = document.getElementById(this._mirrorWrapId || 'r3d-mirror-wrap');
    if (!wrap || !this.scene || !this.mirrorCam || !this.renderer) return;
    const rect = wrap.getBoundingClientRect();
    const cr   = this.canvas.getBoundingClientRect();
    const mw = wrap.clientWidth;
    const mh = wrap.clientHeight;
    if (mw < 2 || mh < 2) return;

    // Mirror readability must not inherit the reduced full-screen pixel budget.
    // Supersample this small surface, then filter down into its CSS rectangle.
    const mirrorRatio = this.lowPower ? 1.5 : Math.max(1.5, Math.min(2, window.devicePixelRatio || 1));
    const rtW = Math.max(2, Math.round(mw * mirrorRatio));
    const rtH = Math.max(2, Math.round(mh * mirrorRatio));
    if (!this.mirrorRT || this.mirrorRTSize.w !== rtW || this.mirrorRTSize.h !== rtH) {
      this._initMirrorTarget(rtW, rtH);
    }

    const r = this.renderer;
    const sz = new THREE.Vector2();
    r.getSize(sz);
    this.mirrorSize.value.set(mw, mh);

    // Pass 1 - rear view into the offscreen target, unflipped.
    // The mirror is a wide letterbox. Driving it with a fixed VERTICAL fov
    // meant the horizontal fov ballooned with the aspect ratio (~154° at
    // 620x104) and everything looked fisheyed. Derive the vertical fov from a
    // fixed HORIZONTAL fov instead, so the view stays natural at any size.
    const aspect = mw / mh;
    const hFov   = R3D.MIRROR_HFOV * Math.PI / 180;
    const vFov   = 2 * Math.atan(Math.tan(hFov / 2) / aspect);
    this.mirrorCam.aspect = aspect;
    this.mirrorCam.fov    = vFov * 180 / Math.PI;
    this.mirrorCam.updateProjectionMatrix();
    r.setRenderTarget(this.mirrorRT);
    // setRenderTarget already sets a physical-pixel viewport. setViewport()
    // in r134 multiplies by DPR again, cropping/distorting a retina mirror.
    // The virtual mirror eye is ahead of the player to frame close followers.
    // In a bumper train it can sit INSIDE the leader. Exclude forward cars in
    // this pass only; retain rear traffic and cars overlapping alongside us.
    const mirrorHidden = this.cars.filter(c => c === this.player ||
      c.z - this.player.z > R3D.CAR_SEP_Z / 2).map(c => [c.mesh, c.mesh.visible]);
    const shadowAutoUpdate = r.shadowMap.autoUpdate;
    try {
      for (const [mesh] of mirrorHidden) mesh.visible = false;
      r.shadowMap.autoUpdate = false;
      r.clear(true, true, true);
      r.render(this.scene, this.mirrorCam);
    } finally {
      for (const [mesh, visible] of mirrorHidden) mesh.visible = visible;
      r.shadowMap.autoUpdate = shadowAutoUpdate;
      r.setRenderTarget(null);
    }

    // Pass 2 - blit it into the mirror rectangle with mirrored UVs.
    const scaleX = sz.x / cr.width, scaleY = sz.y / cr.height;
    const mx  = Math.round((rect.left + wrap.clientLeft - cr.left) * scaleX);
    const my  = Math.round((rect.top + wrap.clientTop - cr.top) * scaleY);
    const vw = Math.round(mw * scaleX), vh = Math.round(mh * scaleY);
    const glY = Math.round(sz.y - my - vh);
    r.setScissorTest(true);
    r.setScissor(mx, glY, vw, vh);
    r.setViewport(mx, glY, vw, vh);
    r.render(this.mirrorScene, this.mirrorQuadCam);
    r.setScissorTest(false);
    r.setViewport(0, 0, sz.x, sz.y);
  }

  _renderDual(dt) {
    const r=this.renderer, size=r.getSize(new THREE.Vector2());
    r.setScissorTest(false); r.setViewport(0,0,size.x,size.y); r.autoClear=false; r.clear();
    const renderView = (n) => {
      const pane=document.getElementById(`dual-view-${n}`).getBoundingClientRect(), cr=this.canvas.getBoundingClientRect();
      const x=Math.round((pane.left-cr.left)*size.x/cr.width), y=Math.round((cr.bottom-pane.bottom)*size.y/cr.height);
      const w=Math.round(pane.width*size.x/cr.width), h=Math.round(pane.height*size.y/cr.height);
      this.camera.aspect=w/h; this.camera.updateProjectionMatrix();
      this._updateCamera(dt);
      r.setScissorTest(true); r.setScissor(x,y,w,h); r.setViewport(x,y,w,h); r.clear(); r.render(this.scene,this.camera);
      r.setScissorTest(false);
      this._mirrorWrapId=`dual-mirror-${n}`;
      this._renderMirror();
      this._mirrorWrapId=null;
    };
    renderView(1);
    this._withSecond(()=>renderView(2));
    r.setScissorTest(false); r.setViewport(0,0,size.x,size.y); r.autoClear=true;
  }
  }
  for (const name of Object.getOwnPropertyNames(Methods.prototype)) {
    if (name !== "constructor") Object.defineProperty(Race3DEngine.prototype, name,
      Object.getOwnPropertyDescriptor(Methods.prototype, name));
  }
})();
