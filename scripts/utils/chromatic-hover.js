/**
 * Cursor-driven chromatic aberration on hero and grid-item hover.
 *
 * Mounts only on a fine pointer (never on touch/mobile) and only when a
 * WebGL context can be created, so unsupported browsers fall back to the
 * plain `<img>` with no effect at all (progressive enhancement). The real
 * `<img>` is never touched or replaced: a decorative canvas snaps on top of
 * it on hover and fades back out on leave, so alt text and the accessibility
 * tree stay exactly as the block already built them.
 *
 * A grid can hold many cards, and browsers cap how many WebGL contexts can
 * stay alive at once. Each card's canvas is created only while its image is
 * near the viewport (`IntersectionObserver`) and torn down when it leaves,
 * and every mounted card ticks off one shared `requestAnimationFrame` loop
 * instead of one each.
 */

const FINE_POINTER_MQ = '(hover: hover) and (pointer: fine)';

const SETTINGS = {
  strength: 180, // how far the colour fringe reaches
  size: 2.7, // width of the Gaussian falloff around the cursor
  step: 0.03, // tap spacing along the smear (~34 taps)
  follow: 0.2, // cursor chase per 60fps frame
  fade: 0.15, // hover in/out ease per 60fps frame
};

const MAX_TAPS = 34;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
uniform sampler2D uMap;
uniform vec2 uCanvasSize;
uniform vec2 uImageSize;
uniform vec2 uMouse;
uniform float uHover;
uniform float uStrength;
uniform float uSize;
uniform float uStep;
varying vec2 vUv;

vec2 cover(vec2 uv) {
  vec2 r = uCanvasSize / uImageSize;
  return (uv - 0.5) * (r / max(r.x, r.y)) + 0.5;
}

vec2 toSquare(vec2 uv, float aspect) {
  return (uv * 2.0 - 1.0) * vec2(aspect, 1.0) / max(aspect, 1.0);
}

vec3 spectral(float t) {
  float r = 1.0 - smoothstep(0.22, 0.56, t);
  float g = 1.0 - smoothstep(0.0, 0.38, abs(t - 0.5));
  float b = smoothstep(0.46, 0.8, t);
  return vec3(r, g, b);
}

vec3 tap(vec2 uv) {
  return texture2D(uMap, clamp(cover(uv), 0.0, 1.0)).rgb;
}

void main() {
  vec2 uv = vUv;

  if (uHover < 0.001) {
    gl_FragColor = vec4(tap(uv), 1.0);
    return;
  }

  float aspect = uCanvasSize.x / uCanvasSize.y;
  vec2 rel = toSquare(uv, aspect) - toSquare(uMouse, aspect);
  float sigma = max(uSize * 0.5, 0.02);
  float bell = exp(-dot(rel, rel) / (2.0 * sigma * sigma));
  vec2 disp = rel * bell * uHover * uStrength / 1600.0;

  vec3 acc = vec3(0.0);
  vec3 wsum = vec3(0.0);
  for (int j = 0; j < ${MAX_TAPS}; j++) {
    float t = float(j) * uStep;
    if (t >= 1.0) break;
    vec3 w = spectral(t);
    acc += tap(uv + disp * t) * w;
    wsum += w;
  }
  gl_FragColor = vec4(clamp(acc / max(wsum, vec3(1e-4)), 0.0, 1.0), 1.0);
}`;

/**
 * Compiles one shader stage, throwing with the driver's log on failure.
 *
 * @param {WebGLRenderingContext} gl
 * @param {number} type
 * @param {string} source
 * @returns {WebGLShader}
 */
function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info || 'chromatic-hover: shader compile failed');
  }
  return shader;
}

/**
 * Links the vertex and fragment shaders into one program, throwing with the
 * driver's log on failure.
 *
 * @param {WebGLRenderingContext} gl
 * @returns {WebGLProgram}
 */
function createProgram(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(info || 'chromatic-hover: program link failed');
  }
  return program;
}

/** Memoized: creating/discarding real WebGL contexts just to feature-test is not free. */
let cachedWebglSupport;

/**
 * Whether a WebGL context can actually be created on this device.
 *
 * @returns {boolean}
 */
function canCreateWebgl() {
  if (cachedWebglSupport !== undefined) return cachedWebglSupport;
  try {
    cachedWebglSupport = Boolean(document.createElement('canvas').getContext('webgl'));
  } catch {
    cachedWebglSupport = false;
  }
  return cachedWebglSupport;
}

/**
 * Whether this device/browser should get the chromatic hover at all.
 * Fine-pointer gate covers both "no pointer" and "never on mobile" (AC);
 * the WebGL + IntersectionObserver checks are the browser-support AC. Users
 * who prefer reduced motion never get the effect, not even a dampened one.
 *
 * @returns {boolean}
 */
export function supportsChromaticHover() {
  if (typeof window.matchMedia !== 'function') return false;
  if (!window.matchMedia(FINE_POINTER_MQ).matches) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (typeof IntersectionObserver !== 'function') return false;
  return canCreateWebgl();
}

/** Test-only: clears the memoized WebGL probe between test cases. */
export function resetWebglSupportCache() {
  cachedWebglSupport = undefined;
}

/**
 * Resolves once `img` has a decoded bitmap, or resolves `false` on error.
 * Already-loaded images (the common case — AEM renders the `<img>` before
 * this runs) resolve immediately.
 *
 * @param {HTMLImageElement} img
 * @returns {Promise<boolean>}
 */
function whenImageReady(img) {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);
  return new Promise((resolve) => {
    const settle = (event) => {
      img.removeEventListener('load', settle);
      img.removeEventListener('error', settle);
      resolve(event.type === 'load');
    };
    img.addEventListener('load', settle);
    img.addEventListener('error', settle);
  });
}

/** One shared rAF loop drives every mounted card instead of one loop each. */
const liveInstances = new Set();
let tickerRafId;
let lastTickTime;

/**
 * Advances every mounted instance by one frame, then reschedules itself.
 *
 * @param {number} now
 */
function runTicker(now) {
  const dt = lastTickTime === undefined ? 0 : Math.max(0, (now - lastTickTime) / 1000);
  lastTickTime = now;
  liveInstances.forEach((instance) => instance.tick(dt));
  tickerRafId = window.requestAnimationFrame(runTicker);
}

/**
 * Adds an instance to the shared ticker, starting it if it was idle.
 *
 * @param {ChromaticHover} instance
 */
function registerInstance(instance) {
  liveInstances.add(instance);
  if (!tickerRafId) {
    lastTickTime = undefined;
    tickerRafId = window.requestAnimationFrame(runTicker);
  }
}

/**
 * Removes an instance from the shared ticker, stopping it once empty.
 *
 * @param {ChromaticHover} instance
 */
function unregisterInstance(instance) {
  liveInstances.delete(instance);
  if (!liveInstances.size && tickerRafId) {
    window.cancelAnimationFrame(tickerRafId);
    tickerRafId = undefined;
  }
}

/**
 * One card's WebGL canvas, mouse/hover easing, and GL state. Lifecycle is
 * driven entirely by `mount`/`unmount` from the `IntersectionObserver` in
 * `initChromaticHover` — nothing here runs until the card is near-viewport.
 */
class ChromaticHover {
  /**
   * Sets up initial state only; nothing is created until `mount` runs.
   *
   * @param {Element} trigger Element that receives pointer/focus events
   *   (the whole clickable card, matching the existing hover/pressed CSS)
   * @param {HTMLImageElement} img Real image this crossfades over
   * @param {Element} container `img`'s parent; sized box the canvas fills
   */
  constructor(trigger, img, container) {
    this.trigger = trigger;
    this.img = img;
    this.container = container;

    /** @type {'idle'|'mounting'|'mounted'} */
    this.state = 'idle';
    this.canvas = null;
    this.gl = null;
    this.uniforms = {};
    this.resizeObserver = null;
    this.abortController = null;

    this.hover = 0;
    this.targetHover = 0;
    this.mouse = [0.5, 0.5];
    this.targetMouse = [0.5, 0.5];
    this.dirty = true;

    // Opacity is tracked separately from hover to avoid re-hover jumps.
    this.opacity = 0;
    // True while opacity holds at 1 after a leave.
    this.undistortedHeld = false;
  }

  /** Starts the async mount if idle; safe to call repeatedly. */
  mount() {
    if (this.state !== 'idle') return;
    this.state = 'mounting';
    this.mountAsync();
  }

  /**
   * Waits for the image, then creates the canvas, GL context, and texture.
   * Bails cleanly if `unmount` runs before the image resolves, or if WebGL
   * setup fails partway through.
   *
   * @returns {Promise<void>}
   */
  async mountAsync() {
    const ready = await whenImageReady(this.img);
    // Scrolled back out of the intersection margin while the image loaded.
    if (this.state !== 'mounting') return;
    if (!ready) {
      this.state = 'idle';
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'chromatic-hover-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) {
      this.state = 'idle';
      return;
    }

    try {
      this.initGl(gl);
    } catch {
      this.state = 'idle';
      return;
    }

    this.canvas = canvas;
    this.gl = gl;
    this.container.append(canvas);
    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.state = 'mounted';
    registerInstance(this);
  }

  /**
   * Builds the program, geometry, and texture, and uploads the current
   * `img` as the texture source.
   *
   * @param {WebGLRenderingContext} gl
   */
  initGl(gl) {
    const program = createProgram(gl);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {};
    ['uMap', 'uCanvasSize', 'uImageSize', 'uMouse', 'uHover', 'uStrength', 'uSize', 'uStep']
      .forEach((name) => { uniforms[name] = gl.getUniformLocation(program, name); });
    this.uniforms = uniforms;

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.img);
    this.texture = texture;

    gl.uniform1i(uniforms.uMap, 0);
    gl.uniform2f(uniforms.uImageSize, this.img.naturalWidth || 1, this.img.naturalHeight || 1);
    gl.uniform1f(uniforms.uStrength, SETTINGS.strength);
    gl.uniform1f(uniforms.uSize, SETTINGS.size);
    gl.uniform1f(uniforms.uStep, SETTINGS.step);
  }

  /** Wires pointer/focus listeners on `trigger` that drive the hover easing. */
  bindEvents() {
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const toUv = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      return [
        (event.clientX - rect.left) / rect.width,
        (event.clientY - rect.top) / rect.height,
      ];
    };

    this.trigger.addEventListener('pointerenter', (event) => {
      this.targetMouse = toUv(event);
      if (this.hover < 0.01) this.mouse = this.targetMouse.slice();
      this.targetHover = 1;
      // Snap avoids crossfade ghosting; distortion still eases in separately.
      this.opacity = 1;
      this.undistortedHeld = false;
      this.canvas.style.opacity = '1';
      this.dirty = true;
    }, { signal });
    this.trigger.addEventListener('pointermove', (event) => {
      this.targetMouse = toUv(event);
    }, { signal });
    // Position freezes on leave; opacity fade is handled in tick().
    this.trigger.addEventListener('pointerleave', () => {
      this.targetHover = 0;
      this.dirty = true;
    }, { signal });
    this.trigger.addEventListener('focus', () => {
      this.targetMouse = [0.5, 0.5];
      if (this.hover < 0.01) this.mouse = [0.5, 0.5];
      this.targetHover = 1;
      this.opacity = 1;
      this.undistortedHeld = false;
      this.canvas.style.opacity = '1';
      this.dirty = true;
    }, { signal });
    this.trigger.addEventListener('blur', () => {
      this.targetHover = 0;
      this.dirty = true;
    }, { signal });
  }

  /**
   * Syncs the canvas backing size and the `uCanvasSize` uniform to
   * `container`, then redraws immediately. Reassigning `canvas.width`/
   * `height` clears the WebGL drawing buffer (spec behavior, not a bug),
   * so a container that keeps resizing — e.g. the hero's own load-in
   * animation, which resizes `.hero__media` for ~2s — would otherwise
   * leave the canvas blank for a frame on every single resize, racing the
   * next tick() on the shared ticker and often losing, which reads as a
   * sustained black flash rather than a one-frame blip.
   */
  resize() {
    if (!this.gl || !this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    const w = Math.max(1, Math.round(cw * dpr));
    const h = Math.max(1, Math.round(ch * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
    this.gl.uniform2f(this.uniforms.uCanvasSize, Math.max(cw, 1), Math.max(ch, 1));
    this.dirty = true;
    this.tick(0);
  }

  /**
   * Advances the easing and redraws, but only when something actually
   * changed — an idle, un-hovered card costs nothing on the shared ticker.
   *
   * @param {number} dt Seconds since the previous tick
   */
  tick(dt) {
    if (this.state !== 'mounted') return;

    const rate = Math.min(dt * 60, 3);
    const posEase = 1 - (1 - SETTINGS.follow) ** rate;
    const hoverEase = 1 - (1 - SETTINGS.fade) ** rate;

    const dx = this.targetMouse[0] - this.mouse[0];
    const dy = this.targetMouse[1] - this.mouse[1];
    const dHover = this.targetHover - this.hover;
    const leaving = this.targetHover < 0.5;
    const chasing = this.targetHover > 0.5 && (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4);
    const busy = chasing || Math.abs(dHover) > 1e-4 || (leaving && this.opacity > 1e-4);
    if (!busy && !this.dirty) return;

    if (this.targetHover > 0.5) {
      this.mouse[0] += dx * posEase;
      this.mouse[1] += dy * posEase;
    }
    this.hover += dHover * hoverEase;
    if (Math.abs(this.targetHover - this.hover) < 1e-4) this.hover = this.targetHover;
    // Holds opacity at 1 until undistorted, then fades smoothly.
    if (this.targetHover > 0.5) {
      this.undistortedHeld = false;
    } else if (this.opacity > 0 || this.undistortedHeld) {
      const distortionGone = this.hover <= 1e-4;
      if (!this.undistortedHeld || !distortionGone) {
        this.undistortedHeld = distortionGone;
        this.opacity = 1;
      } else {
        this.opacity -= this.opacity * hoverEase;
        if (this.opacity < 1e-4) this.opacity = 0;
      }
      this.canvas.style.opacity = String(this.opacity);
    }
    this.dirty = false;

    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform2f(this.uniforms.uMouse, this.mouse[0], this.mouse[1]);
    gl.uniform1f(this.uniforms.uHover, this.hover);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Tears down GL/canvas/listeners and frees the WebGL context slot. */
  unmount() {
    if (this.state === 'idle') return;
    if (this.state === 'mounting') {
      // mountAsync() is awaiting the image; it checks state and bails.
      this.state = 'idle';
      return;
    }

    this.state = 'idle';
    unregisterInstance(this);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.abortController?.abort();
    this.abortController = null;
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
    this.canvas?.remove();
    this.canvas = null;
    this.hover = 0;
    this.targetHover = 0;
    this.opacity = 0;
    this.undistortedHeld = false;
    this.dirty = true;
  }
}

/**
 * Wires up the chromatic hover for one card. No-ops entirely on an
 * unsupported device/browser, leaving `img` exactly as the block built it.
 *
 * @param {Element} trigger Element that receives pointer/focus events
 * @param {HTMLImageElement} [img] Real image to crossfade over
 */
export default function initChromaticHover(trigger, img) {
  if (!trigger || !img || !supportsChromaticHover()) return;
  const container = img.parentElement;
  if (!container) return;

  const instance = new ChromaticHover(trigger, img, container);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) instance.mount();
      else instance.unmount();
    });
  }, { rootMargin: '50% 0px' });
  observer.observe(container);
}
