import initChromaticHover, {
  resetWebglSupportCache,
  supportsChromaticHover,
} from './chromatic-hover.js';

/**
 * Minimal stand-in for a WebGLRenderingContext: every method the module
 * calls is a jest.fn(), and the pass/fail checks it reads back are rigged
 * to always succeed so a mount can run its full lifecycle.
 *
 * @returns {object}
 */
function createMockGl() {
  return {
    VERTEX_SHADER: 'VERTEX_SHADER',
    FRAGMENT_SHADER: 'FRAGMENT_SHADER',
    COMPILE_STATUS: 'COMPILE_STATUS',
    LINK_STATUS: 'LINK_STATUS',
    ARRAY_BUFFER: 'ARRAY_BUFFER',
    STATIC_DRAW: 'STATIC_DRAW',
    FLOAT: 'FLOAT',
    TEXTURE_2D: 'TEXTURE_2D',
    TEXTURE_WRAP_S: 'TEXTURE_WRAP_S',
    TEXTURE_WRAP_T: 'TEXTURE_WRAP_T',
    TEXTURE_MIN_FILTER: 'TEXTURE_MIN_FILTER',
    TEXTURE_MAG_FILTER: 'TEXTURE_MAG_FILTER',
    CLAMP_TO_EDGE: 'CLAMP_TO_EDGE',
    LINEAR: 'LINEAR',
    RGB: 'RGB',
    UNSIGNED_BYTE: 'UNSIGNED_BYTE',
    TEXTURE0: 'TEXTURE0',
    TRIANGLES: 'TRIANGLES',
    createShader: jest.fn(() => ({})),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(() => true),
    getShaderInfoLog: jest.fn(() => ''),
    deleteShader: jest.fn(),
    createProgram: jest.fn(() => ({})),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    getProgramInfoLog: jest.fn(() => ''),
    deleteProgram: jest.fn(),
    useProgram: jest.fn(),
    createBuffer: jest.fn(() => ({})),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    getAttribLocation: jest.fn(() => 0),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    getUniformLocation: jest.fn(() => ({})),
    createTexture: jest.fn(() => ({})),
    bindTexture: jest.fn(),
    texParameteri: jest.fn(),
    texImage2D: jest.fn(),
    uniform1i: jest.fn(),
    uniform1f: jest.fn(),
    uniform2f: jest.fn(),
    activeTexture: jest.fn(),
    drawArrays: jest.fn(),
    viewport: jest.fn(),
    getExtension: jest.fn(() => ({ loseContext: jest.fn() })),
  };
}

/** @returns {HTMLImageElement} */
function createLoadedImage() {
  const img = document.createElement('img');
  Object.defineProperty(img, 'complete', { value: true, configurable: true });
  Object.defineProperty(img, 'naturalWidth', { value: 400, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: 300, configurable: true });
  return img;
}

let observerInstances;
let originalMatchMedia;
let originalGetContext;

beforeEach(() => {
  resetWebglSupportCache();
  observerInstances = [];
  global.IntersectionObserver = jest.fn(function MockIntersectionObserver(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observe = jest.fn();
    this.disconnect = jest.fn();
    observerInstances.push(this);
  });
  global.ResizeObserver = jest.fn(function MockResizeObserver(callback) {
    this.callback = callback;
    this.observe = jest.fn();
    this.disconnect = jest.fn();
  });

  originalMatchMedia = window.matchMedia;
  window.matchMedia = jest.fn((query) => ({
    matches: String(query).includes('pointer: fine'),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

  originalGetContext = HTMLCanvasElement.prototype.getContext;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  jest.restoreAllMocks();
});

describe('supportsChromaticHover', () => {
  it('is false without a fine pointer', () => {
    window.matchMedia = jest.fn((query) => ({ matches: false, media: query }));

    expect(supportsChromaticHover()).toBe(false);
  });

  it('is false without IntersectionObserver', () => {
    delete global.IntersectionObserver;

    expect(supportsChromaticHover()).toBe(false);
  });

  it('is false when the user prefers reduced motion, even with a fine pointer', () => {
    window.matchMedia = jest.fn((query) => ({
      matches: String(query).includes('pointer: fine') || String(query).includes('prefers-reduced-motion'),
      media: query,
    }));

    expect(supportsChromaticHover()).toBe(false);
  });
});

describe('initChromaticHover', () => {
  it('does nothing when the trigger or image is missing', () => {
    expect(() => initChromaticHover(null, createLoadedImage())).not.toThrow();
    expect(() => initChromaticHover(document.createElement('a'), null)).not.toThrow();
    expect(observerInstances).toHaveLength(0);
  });

  it('does not observe on an unsupported device (no fine pointer)', () => {
    window.matchMedia = jest.fn((query) => ({ matches: false, media: query }));
    const trigger = document.createElement('a');
    const container = document.createElement('div');
    const img = createLoadedImage();
    container.append(img);
    trigger.append(container);

    initChromaticHover(trigger, img);

    expect(global.IntersectionObserver).not.toHaveBeenCalled();
  });

  it('leaves the real <img> untouched when WebGL is unavailable', () => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null);
    const trigger = document.createElement('a');
    const container = document.createElement('div');
    const img = createLoadedImage();
    container.append(img);
    trigger.append(container);

    initChromaticHover(trigger, img);

    expect(observerInstances).toHaveLength(0);
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.contains(img)).toBe(true);
  });

  describe('with a mocked WebGL context', () => {
    let gl;

    beforeEach(() => {
      gl = createMockGl();
      HTMLCanvasElement.prototype.getContext = jest.fn(() => gl);
    });

    /** @returns {{ trigger: Element, container: Element, img: HTMLImageElement }} */
    function mountedCard() {
      const trigger = document.createElement('a');
      const container = document.createElement('div');
      const img = createLoadedImage();
      container.append(img);
      trigger.append(container);
      document.body.append(trigger);
      initChromaticHover(trigger, img);
      return { trigger, container, img };
    }

    it('mounts a canvas only once the card intersects, keeping the <img> intact', async () => {
      const { container, img } = mountedCard();
      const [observer] = observerInstances;
      expect(observer.options).toMatchObject({ rootMargin: '50% 0px' });

      observer.callback([{ isIntersecting: true }]);
      await Promise.resolve();
      await Promise.resolve();

      const canvas = container.querySelector('canvas.chromatic-hover-canvas');
      expect(canvas).toBeTruthy();
      expect(canvas).toHaveAttribute('aria-hidden', 'true');
      expect(container.contains(img)).toBe(true);
    });

    it('snaps the canvas to opaque immediately on pointerenter, then fades back out on pointerleave', async () => {
      const { trigger, container } = mountedCard();
      const [observer] = observerInstances;
      observer.callback([{ isIntersecting: true }]);
      await Promise.resolve();
      await Promise.resolve();

      const canvas = container.querySelector('canvas');
      const [resizeObserver] = global.ResizeObserver.mock.instances;
      resizeObserver.callback();

      // No crossfade on entry — a gradual opacity ramp here would briefly
      // show the real <img> and the distorting canvas at once (ghosting).
      trigger.dispatchEvent(new window.MouseEvent('pointerenter', {
        clientX: 10, clientY: 10,
      }));
      expect(canvas.style.opacity).toBe('1');

      trigger.dispatchEvent(new window.MouseEvent('pointerleave'));
      for (let i = 0; i < 40; i += 1) {
        // eslint-disable-next-line no-await-in-loop -- easing needs successive frames
        await new Promise((resolve) => { requestAnimationFrame(resolve); });
      }
      expect(Number(canvas.style.opacity)).toBeCloseTo(0, 2);
    });

    it('tears down the canvas and loses the GL context when it leaves the viewport', async () => {
      const { container } = mountedCard();
      const [observer] = observerInstances;
      observer.callback([{ isIntersecting: true }]);
      await Promise.resolve();
      await Promise.resolve();
      expect(container.querySelector('canvas')).toBeTruthy();

      observer.callback([{ isIntersecting: false }]);

      expect(container.querySelector('canvas')).toBeNull();
      expect(gl.getExtension).toHaveBeenCalledWith('WEBGL_lose_context');
    });

    it('does not mount if the card leaves the viewport before the image resolves', async () => {
      const trigger = document.createElement('a');
      const container = document.createElement('div');
      const img = document.createElement('img');
      container.append(img);
      trigger.append(container);
      initChromaticHover(trigger, img);
      const [observer] = observerInstances;

      observer.callback([{ isIntersecting: true }]);
      observer.callback([{ isIntersecting: false }]);
      img.dispatchEvent(new window.Event('load'));
      await Promise.resolve();
      await Promise.resolve();

      expect(container.querySelector('canvas')).toBeNull();
    });
  });
});
