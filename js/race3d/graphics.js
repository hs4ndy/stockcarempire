// Render quality is independent of race physics and Career saves.
(() => {
  class Methods {
    _configureGraphics() {
      this.graphicsMode = 'auto';
      const limited = (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
      let software = false;
      try {
        const gl = this.renderer.getContext();
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        software = !!info && /swiftshader|llvmpipe|software/i.test(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
      } catch (_) {}
      // Resource hints alone do not identify a slow PC. ChromeOS plus limited
      // resources is a startup hint; sustained frame times refine Auto later.
      const startLow = software || (/CrOS/.test(navigator.userAgent || '') && limited);
      this._graphicsFrames = 0;
      this._graphicsSeconds = 0;
      this._graphicsSlow = 0;
      this._graphicsFast = 0;
      this._graphicsCooldown = 0;
      this._setGraphicsQuality(startLow);
    }

    _setGraphicsQuality(low) {
      this.lowPower = low;
      this.renderer.shadowMap.enabled = !low && !this.config.dualPlayer;
      if (this.mirrorRT) { this.mirrorRT.dispose(); this.mirrorRT = null; }
      this._grandstandCenter = null;
      const el = this.canvas.parentElement;
      const w = el?.clientWidth || this.canvas.clientWidth || window.innerWidth;
      const h = el?.clientHeight || this.canvas.clientHeight || window.innerHeight;
      this._pixelRatio = Math.min(window.devicePixelRatio || 1, low ? 1 : 1.5,
        Math.sqrt((low ? 750000 : 2000000) / (w * h)));
      this.renderer.setPixelRatio(this._pixelRatio);
      this.renderer.setSize(w, h, false);
    }

    _sampleGraphics(dt) {
      if (this.graphicsMode !== 'auto' || !this.racing || this.paused || this.done ||
          document.hidden || dt <= 0 || dt > .5) return;
      this._graphicsCooldown = Math.max(0, this._graphicsCooldown - dt);
      this._graphicsFrames++;
      this._graphicsSeconds += dt;
      if (this._graphicsSeconds < 1) return;
      const average = this._graphicsSeconds / this._graphicsFrames;
      this._graphicsSlow = average > .028 ? this._graphicsSlow + 1 : 0;
      this._graphicsFast = average < .018 ? this._graphicsFast + 1 : 0;
      if (!this._graphicsCooldown && ((!this.lowPower && this._graphicsSlow >= 3) ||
          (this.lowPower && this._graphicsFast >= 12))) {
        this._setGraphicsQuality(!this.lowPower);
        this._graphicsCooldown = 30;
        this._graphicsSlow = this._graphicsFast = 0;
      }
      this._graphicsFrames = this._graphicsSeconds = 0;
    }
  }
  for (const name of Object.getOwnPropertyNames(Methods.prototype)) {
    if (name !== 'constructor') Object.defineProperty(Race3DEngine.prototype, name,
      Object.getOwnPropertyDescriptor(Methods.prototype, name));
  }
})();
