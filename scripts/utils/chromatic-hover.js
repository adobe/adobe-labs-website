/**
 * Cursor-driven chromatic aberration on hero and grid-item hover (ADBLABS-182).
 *
 * The shader and easing model are ported from Randy Oest's CodePen demo,
 * which Clement approved for this effect — behavior is intentionally kept
 * close to that approval rather than redesigned.
 *
 * Mounts only on a fine pointer (never on touch/mobile) and only when a
 * WebGL context can be created, so unsupported browsers fall back to the
 * plain `<img>` with no effect at all (progressive enhancement). The real
 * `<img>` is never touched or replaced: a decorative canvas crossfades over
 * it on hover and fades back out, so alt text and the accessibility tree
 * stay exactly as the block already built them.
 *
 * A grid can hold many cards, and browsers cap how many WebGL contexts can
 * stay alive at once. Each card's canvas is created only while its image is
 * near the viewport (`IntersectionObserver`) and torn down when it leaves,
 * and every mounted card ticks off one shared `requestAnimationFrame` loop
 * instead of one each.
 */

const FINE_POINTER_MQ = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_MQ = '(prefers-reduced-motion: reduce)';

/** Matches the values Clement approved in the CodePen demo. */
const SETTINGS = {
  strength: 180, // how far the colour fringe reaches
  size: 2.7, // width of the Gaussian falloff around the cursor
  step: 0.03, // tap spacing along the smear (~34 taps)
  follow: 0.2, // cursor chase per 60fps frame
  fade: 0.15, // hover in/out ease per 60fps frame
};

/** Reduced-motion still shows the effect, just dampened, matching the approved demo. */
const REDUCED_MOTION_STRENGTH_SCALE = 0.35;

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

/** @returns {boolean} */
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
 * the WebGL + IntersectionObserver checks are the browser-support AC.
 *
 * @returns {boolean}
 */
export function supportsChromaticHover() {
  if (typeof window.matchMedia !== 'function') return false;
  if (!window.matchMedia(FINE_POINTER_MQ).matches) return false;
  if (typeof IntersectionObserver !== 'function') return false;
  return canCreateWebgl();
}

/** Test-only: clears the memoized WebGL probe between test cases. */
export function resetWebglSupportCache() {
  cachedWebglSupport = undefined;
}

/** @returns {boolean} */
function prefersReducedMotion() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia(REDUCED_MOTION_MQ).matches;
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

/** @param {number} now */
function runTicker(now) {
  const dt = lastTickTime === undefined ? 0 : Math.max(0, (now - lastTickTime) / 1000);
  lastTickTime = now;
  liveInstances.forEach((instance) => instance.tick(dt));
  tickerRafId = window.requestAnimationFrame(runTicker);
}

/** @param {ChromaticHover} instance */
function registerInstance(instance) {
  liveInstances.add(instance);
  if (!tickerRafId) {
    lastTickTime = undefined;
    tickerRafId = window.requestAnimationFrame(runTicker);
  }
}

/** @param {ChromaticHover} instance */
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

    this.strength = SETTINGS.strength
      * (prefersReducedMotion() ? REDUCED_MOTION_STRENGTH_SCALE : 1);
    this.hover = 0;
    this.targetHover = 0;
    this.mouse = [0.5, 0.5];
    this.targetMouse = [0.5, 0.5];
    this.dirty = true;
  }

  /** Starts the async mount if idle; safe to call repeatedly. */
  mount() {
    if (this.state !== 'idle') return;
    this.state = 'mounting';
    this.mountAsync();
  }

  /** @returns {Promise<void>} */
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

  /** @param {WebGLRenderingContext} gl */
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
    gl.uniform1f(uniforms.uStrength, this.strength);
    gl.uniform1f(uniforms.uSize, SETTINGS.size);
    gl.uniform1f(uniforms.uStep, SETTINGS.step);
  }

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
    }, { signal });
    this.trigger.addEventListener('pointermove', (event) => {
      this.targetMouse = toUv(event);
    }, { signal });
    // Position freezes on leave; only the hover amount fades out.
    this.trigger.addEventListener('pointerleave', () => {
      this.targetHover = 0;
    }, { signal });
    this.trigger.addEventListener('focus', () => {
      this.targetMouse = [0.5, 0.5];
      if (this.hover < 0.01) this.mouse = [0.5, 0.5];
      this.targetHover = 1;
    }, { signal });
    this.trigger.addEventListener('blur', () => {
      this.targetHover = 0;
    }, { signal });
  }

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
    const chasing = this.targetHover > 0.5 && (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4);
    const busy = chasing || Math.abs(dHover) > 1e-4;
    if (!busy && !this.dirty) return;

    if (this.targetHover > 0.5) {
      this.mouse[0] += dx * posEase;
      this.mouse[1] += dy * posEase;
    }
    this.hover += dHover * hoverEase;
    if (Math.abs(this.targetHover - this.hover) < 1e-4) this.hover = this.targetHover;
    this.dirty = false;

    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform2f(this.uniforms.uMouse, this.mouse[0], this.mouse[1]);
    gl.uniform1f(this.uniforms.uHover, this.hover);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.canvas.style.opacity = String(this.hover);
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
