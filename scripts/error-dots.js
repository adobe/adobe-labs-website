/**
 * Halftone "404" for the error page. Dots are sampled from Adobe Clean Display
 * and spring away from the pointer.
 *
 * Replace CONFIG when a new config arrives. maxWidth and maxHeight are 1 so
 * the word fills the canvas frame. The pen used 0.85 and 0.6 on a full-viewport stage.
 */

const CONFIG = {
  text: '404',
  fontFamily: 'Adobe Clean Display Black',
  fontWeight: 600,
  fontSize: 'auto',
  maxWidth: 1,
  maxHeight: 1,
  letterSpacing: 0.08,
  spacing: 6,
  minRadius: 0.6,
  maxRadius: 2.6,
  shimmerSpeed: 1.4,
  shimmerAmount: 0.45,
  pushRadius: 120,
  pushStrength: 9,
  spring: 0.07,
  damping: 0.84,
};

const MOTION_QUERY = '(prefers-reduced-motion: no-preference)';
const COLOR_QUERY = '(prefers-color-scheme: dark)';

/**
 * @param {number} size Font size in pixels
 * @returns {string}
 */
function fontString(size) {
  return `${CONFIG.fontWeight} ${size}px "${CONFIG.fontFamily}", sans-serif`;
}

/**
 * Width of CONFIG.text at a given size, including letter spacing.
 * @param {CanvasRenderingContext2D} context
 * @param {number} size
 * @returns {number}
 */
function measure(context, size) {
  const sample = context;
  sample.font = fontString(size);
  const chars = [...CONFIG.text];
  const gap = CONFIG.letterSpacing * size;
  const width = chars.reduce((sum, ch) => sum + sample.measureText(ch).width, 0);
  return width + (gap * Math.max(chars.length - 1, 0));
}

/**
 * Mount the halftone canvas in the error section and run it.
 * @returns {Promise<void>}
 */
async function boot() {
  const main = document.querySelector('main.error');
  const section = main?.querySelector(':scope > .section');
  if (!main || !section) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'error-dots';
  canvas.setAttribute('aria-hidden', 'true');
  const copy = section.querySelector(':scope > .default-content-wrapper');
  if (copy) section.insertBefore(canvas, copy);
  else section.append(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const pointer = { x: -9999, y: -9999, active: false };
  const motionQuery = window.matchMedia(MOTION_QUERY);
  const colorQuery = window.matchMedia(COLOR_QUERY);
  let dots = [];
  let width = 0;
  let height = 0;
  let dotColor = '#000';
  let rafId = 0;
  let resizeTimer = 0;
  let usingFace = false;

  function readColors() {
    const probe = document.createElement('span');
    probe.style.color = 'var(--dot-color)';
    main.append(probe);
    dotColor = getComputedStyle(probe).color;
    probe.remove();
  }

  function draw(seconds, animate) {
    const {
      pushRadius,
      pushStrength,
      spring,
      damping,
      shimmerAmount,
      shimmerSpeed,
      minRadius,
      maxRadius,
    } = CONFIG;
    const reach = pushRadius * pushRadius;
    const sizeRange = maxRadius - minRadius;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = dotColor;
    ctx.beginPath();

    dots.forEach((dot) => {
      if (animate && pointer.active) {
        const dx = dot.x - pointer.x;
        const dy = dot.y - pointer.y;
        const dist2 = (dx * dx) + (dy * dy);
        if (dist2 < reach && dist2 > 0.01) {
          const dist = Math.sqrt(dist2);
          const force = ((1 - (dist / pushRadius)) ** 2) * pushStrength;
          dot.vx += (dx / dist) * force;
          dot.vy += (dy / dist) * force;
        }
      }

      if (animate) {
        dot.vx += (dot.hx - dot.x) * spring;
        dot.vy += (dot.hy - dot.y) * spring;
        dot.vx *= damping;
        dot.vy *= damping;
        dot.x += dot.vx;
        dot.y += dot.vy;
      } else {
        dot.x = dot.hx;
        dot.y = dot.hy;
        dot.vx = 0;
        dot.vy = 0;
      }

      const pulse = animate
        ? Math.sin((seconds * shimmerSpeed * dot.speed) + dot.phase)
        : 1;
      const base = minRadius + (dot.rand * sizeRange);
      const radius = animate
        ? base * (1 - (shimmerAmount * (0.5 - (0.5 * pulse))))
        : base;
      if (radius >= 0.15) {
        ctx.moveTo(dot.x + radius, dot.y);
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      }
    });

    ctx.fill();
  }

  function drawStill() {
    draw(0, false);
  }

  function tick(timestamp) {
    if (!motionQuery.matches || document.hidden) {
      rafId = 0;
      return;
    }
    draw(timestamp / 1000, true);
    rafId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (rafId || !motionQuery.matches || document.hidden) return;
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function buildDots() {
    const nextWidth = Math.floor(canvas.clientWidth);
    const nextHeight = Math.floor(canvas.clientHeight);
    if (nextWidth < 1 || nextHeight < 1) return;
    if (nextWidth === width && nextHeight === height && dots.length) return;
    width = nextWidth;
    height = nextHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const sample = offscreen.getContext('2d', { willReadFrequently: true });
    if (!sample) return;

    let size = CONFIG.fontSize;
    if (size === 'auto') {
      const base = 100;
      const widthAtBase = measure(sample, base);
      const byWidth = widthAtBase
        ? ((width * CONFIG.maxWidth) / widthAtBase) * base
        : base;
      const byHeight = (height * CONFIG.maxHeight) / 0.72;
      size = Math.min(byWidth, byHeight);
    }

    sample.font = fontString(size);
    sample.fillStyle = '#000';
    sample.textBaseline = 'alphabetic';
    const total = measure(sample, size);
    const metrics = sample.measureText(CONFIG.text);
    const ascent = metrics.actualBoundingBoxAscent || size * 0.72;
    const descent = metrics.actualBoundingBoxDescent || 0;
    let cursorX = (width - total) / 2;
    const cursorY = (height / 2) + ((ascent - descent) / 2);
    const gap = CONFIG.letterSpacing * size;
    [...CONFIG.text].forEach((ch) => {
      sample.fillText(ch, cursorX, cursorY);
      cursorX += sample.measureText(ch).width + gap;
    });

    const { data } = sample.getImageData(0, 0, width, height);
    const step = CONFIG.spacing;
    dots = [];
    for (let gy = step / 2; gy < height; gy += step) {
      for (let gx = step / 2; gx < width; gx += step) {
        const pixel = ((Math.floor(gy) * width) + Math.floor(gx)) * 4;
        if (data[pixel + 3] > 128) {
          dots.push({
            hx: gx,
            hy: gy,
            x: gx,
            y: gy,
            vx: 0,
            vy: 0,
            rand: Math.random(),
            phase: Math.random() * Math.PI * 2,
            speed: 0.6 + (Math.random() * 0.8),
          });
        }
      }
    }

    if (!motionQuery.matches || document.hidden) drawStill();
  }

  function setPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
  }

  canvas.addEventListener('pointermove', setPointer);
  canvas.addEventListener('pointerdown', setPointer);
  canvas.addEventListener('pointerleave', () => {
    pointer.active = false;
  });
  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse') pointer.active = false;
  });

  const resizeObserver = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(buildDots, 150);
  });
  resizeObserver.observe(canvas);

  motionQuery.addEventListener('change', () => {
    if (motionQuery.matches && !document.hidden) startLoop();
    else {
      stopLoop();
      drawStill();
    }
  });

  colorQuery.addEventListener('change', () => {
    readColors();
    if (!motionQuery.matches || document.hidden) drawStill();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else if (motionQuery.matches) startLoop();
    else drawStill();
  });

  readColors();
  try {
    await document.fonts.load(fontString(100), CONFIG.text);
    await document.fonts.ready;
  } catch {
    // Sample with the fallback face if the webfont never arrives.
  }
  usingFace = document.fonts.check(fontString(100), CONFIG.text);
  if (!usingFace) {
    document.fonts.addEventListener('loadingdone', () => {
      if (usingFace || !document.fonts.check(fontString(100), CONFIG.text)) return;
      usingFace = true;
      buildDots();
    });
  }

  buildDots();
  if (motionQuery.matches && !document.hidden) startLoop();
  else drawStill();
}

/**
 * Decorate wraps the heading after this module is parsed, and hides the
 * section until that pass finishes. Wait until the copy wrapper is showing.
 * @returns {Promise<void>}
 */
function whenSectionReady() {
  return new Promise((resolve) => {
    const ready = () => {
      const section = document.querySelector('main.error > .section');
      const copy = section?.querySelector(':scope > .default-content-wrapper');
      if (!section || !copy) return false;
      return getComputedStyle(section).display !== 'none';
    };

    if (ready()) {
      resolve();
      return;
    }

    const observer = new MutationObserver(() => {
      if (!ready()) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  });
}

async function start() {
  if (document.readyState !== 'complete') {
    await new Promise((resolve) => {
      window.addEventListener('load', resolve, { once: true });
    });
  }
  await whenSectionReady();
  await boot();
}

start();
