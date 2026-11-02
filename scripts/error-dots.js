/**
 * Particle "404" for the error page. Dots are sampled from Adobe Clean
 * Spectrum VF (Typekit family adobe-clean-spectrum-vf) and spring away
 * from the pointer. Sampling and physics match the client prototype.
 */

const TEXT = '404';
const SAMPLE_GAP = 6;
const FONT_FACE = '"adobe-clean-spectrum-vf"';
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const COLOR_QUERY = '(prefers-color-scheme: dark)';

/**
 * Mount the particle canvas in the error section and run it.
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

  const context = canvas.getContext('2d');
  if (!context) return;

  const pointer = { x: -10000, y: -10000 };
  const motionPreference = window.matchMedia(MOTION_QUERY);
  const colorSchemePreference = window.matchMedia(COLOR_QUERY);
  let particles = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let reducedMotion = motionPreference.matches;
  let fontReady = false;

  function draw() {
    frame = 0;
    context.clearRect(0, 0, width, height);
    context.fillStyle = getComputedStyle(canvas).getPropertyValue('--particle-color').trim() || '#000';
    let particlesMoving = false;

    particles.forEach((particle) => {
      if (reducedMotion) {
        particle.x = particle.originX;
        particle.y = particle.originY;
        particle.velocityX = 0;
        particle.velocityY = 0;
      } else {
        const deltaX = particle.x - pointer.x;
        const deltaY = particle.y - pointer.y;
        const distance = Math.hypot(deltaX, deltaY);
        const influence = distance > 110 ? 0 : (1 - (distance / 110)) * 24;
        const targetX = particle.originX + (distance ? (deltaX / distance) * influence : 0);
        const targetY = particle.originY + (distance ? (deltaY / distance) * influence : 0);

        particle.velocityX = (particle.velocityX + ((targetX - particle.x) * 0.075)) * 0.82;
        particle.velocityY = (particle.velocityY + ((targetY - particle.y) * 0.075)) * 0.82;
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        // Velocity crosses the 0.02 line at the end of a swing, while the
        // dot is still away from its target. Keep going until it arrives.
        particlesMoving = particlesMoving
          || Math.abs(particle.velocityX) > 0.02
          || Math.abs(particle.velocityY) > 0.02
          || Math.abs(targetX - particle.x) > 0.05
          || Math.abs(targetY - particle.y) > 0.05;
      }

      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    });

    if (!reducedMotion && particlesMoving && !document.hidden) {
      frame = requestAnimationFrame(draw);
    }
  }

  function resize() {
    if (!fontReady) return;
    cancelAnimationFrame(frame);
    frame = 0;
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    if (width < 1 || height < 1) return;

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const stencil = document.createElement('canvas');
    stencil.width = Math.ceil(width);
    stencil.height = Math.ceil(height);
    const stencilContext = stencil.getContext('2d', { willReadFrequently: true });
    if (!stencilContext) return;

    const fontSize = Math.min(width * 0.48, height * 1.14, 420);
    stencilContext.font = `700 ${fontSize}px ${getComputedStyle(canvas).fontFamily}`;
    stencilContext.textAlign = 'center';
    stencilContext.textBaseline = 'middle';
    stencilContext.fillText(TEXT, width / 2, height / 2);

    const pixels = stencilContext.getImageData(0, 0, stencil.width, stencil.height).data;
    particles = [];

    for (let y = 0; y < height; y += SAMPLE_GAP) {
      for (let x = 0; x < width; x += SAMPLE_GAP) {
        if (pixels[(((y * stencil.width) + x) * 4) + 3] > 100) {
          particles.push({
            x: x + ((Math.random() - 0.5) * SAMPLE_GAP),
            y: y + ((Math.random() - 0.5) * SAMPLE_GAP),
            originX: x,
            originY: y,
            velocityX: 0,
            velocityY: 0,
            radius: 0.8 + (Math.random() * 0.8),
          });
        }
      }
    }
    draw();
  }

  function handlePointerMove(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    if (!reducedMotion && !frame && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function handlePointerLeave() {
    pointer.x = -10000;
    pointer.y = -10000;
    if (!reducedMotion && !frame && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function handleMotionPreferenceChange(event) {
    reducedMotion = event.matches;
    cancelAnimationFrame(frame);
    frame = 0;
    draw();
  }

  function handleColorSchemeChange() {
    cancelAnimationFrame(frame);
    frame = 0;
    draw();
  }

  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerleave', handlePointerLeave);
  motionPreference.addEventListener('change', handleMotionPreferenceChange);
  colorSchemePreference.addEventListener('change', handleColorSchemeChange);

  const themeObserver = new MutationObserver(handleColorSchemeChange);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    if (!reducedMotion && !frame) frame = requestAnimationFrame(draw);
  });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  try {
    await document.fonts.load(`700 100px ${FONT_FACE}`, TEXT);
    await document.fonts.ready;
  } catch {
    // Sample with the fallback face if the webfont never arrives.
  }

  fontReady = true;
  let usingFace = document.fonts.check(`700 100px ${FONT_FACE}`, TEXT);
  if (!usingFace) {
    document.fonts.addEventListener('loadingdone', () => {
      if (usingFace || !document.fonts.check(`700 100px ${FONT_FACE}`, TEXT)) return;
      usingFace = true;
      resize();
    });
  }

  resize();
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
