// Fixed graphics presets keep the rendering workload predictable.
(() => {
  class Methods {
    _configureGraphics() {
      this.graphicsMode = normalizeGraphicsPreset(this.config.graphicsMode);
      this.lowPower = this.graphicsMode === 'low';
      this.renderer.shadowMap.enabled = this.graphicsMode === 'high';
      if (this.graphicsMode !== 'high') {
        const far = this.lowPower ? 2000 : 2600;
        for (const camera of [this.camera, this.mirrorCam, this.camera2]) {
          if (!camera) continue;
          camera.far = far;
          camera.updateProjectionMatrix();
        }
        if (this.scene?.fog) this.scene.fog.density = 2.9 / far;
      }
      this._resizeGraphics();
    }

    _resizeGraphics() {
      const el = this.canvas.parentElement;
      const width = el?.clientWidth || this.canvas.clientWidth || window.innerWidth;
      const height = el?.clientHeight || this.canvas.clientHeight || window.innerHeight;
      const nativeRatio = window.devicePixelRatio || 1;
      if (this.graphicsMode === 'high') {
        const maxSize = this.renderer.capabilities.maxTextureSize;
        this._pixelRatio = Math.min(nativeRatio, maxSize / Math.max(width, height));
      } else {
        const budget = this.lowPower ? 1050000 : 1500000;
        this._pixelRatio = Math.min(nativeRatio, this.lowPower ? 1 : 1.25, Math.sqrt(budget / (width * height)));
      }
      this.renderer.setPixelRatio(this._pixelRatio);
      this.renderer.setSize(width, height, false);
    }
  }
  for (const name of Object.getOwnPropertyNames(Methods.prototype)) {
    if (name !== 'constructor') Object.defineProperty(Race3DEngine.prototype, name,
      Object.getOwnPropertyDescriptor(Methods.prototype, name));
  }
})();
