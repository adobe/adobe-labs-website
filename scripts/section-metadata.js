// The Helix/DA pipeline handles Section Metadata server-side: `style` becomes
// classes, everything else becomes `data-*` attributes. No table survives
// to parse client-side.
import { createOptimizedPicture } from './aem.js';

function toClassName(name) {
  return typeof name === 'string'
    ? name
      .toLowerCase()
      .replace(/[^0-9a-z]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    : '';
}

function decorateLayoutField(section, field, value, addBaseClass) {
  if (!value || value === '0') return;
  // only grid/container are used in compound CSS selectors (e.g. .grid, .container.container-4)
  if (addBaseClass) section.classList.add(field);
  section.classList.add(`${field}-${toClassName(value)}`);
}

function parseColor(section) {
  const computedBg = getComputedStyle(section).backgroundColor;
  const rgbMatch = computedBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!rgbMatch) return null;
  return {
    r: parseInt(rgbMatch[1], 10),
    g: parseInt(rgbMatch[2], 10),
    b: parseInt(rgbMatch[3], 10),
  };
}

// WCAG relative luminance
function getRelativeLuminance({ r, g, b }) {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : ((rsRGB + 0.055) / 1.055) ** 2.4;
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : ((gsRGB + 0.055) / 1.055) ** 2.4;
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : ((bsRGB + 0.055) / 1.055) ** 2.4;

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

function applyColorScheme(section, rgb) {
  if (!rgb) return;
  const scheme = getRelativeLuminance(rgb) > 0.5 ? 'light-scheme' : 'dark-scheme';
  section.classList.remove('light-scheme', 'dark-scheme');
  section.classList.add(scheme);
}

// contrast is per-section, independent of the site-wide theme
function setColorScheme(section) {
  applyColorScheme(section, parseColor(section));
}

// downsample onto a tiny canvas rather than a separate thumbnail request;
// cross-origin images (no CORS) taint the canvas and throw — left as-is
function getAverageColor(img) {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, 8, 8);
    const { data } = ctx.getImageData(0, 0, 8, 8);
    let r = 0; let g = 0; let b = 0;
    const count = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2];
    }
    return { r: r / count, g: g / count, b: b / count };
  } catch {
    return null;
  }
}

function setColorSchemeFromImage(section, img) {
  applyColorScheme(section, getAverageColor(img));
}

function isImageUrl(value) {
  return /^(https?:)?\/\//i.test(value);
}

// other images use same-origin-relative paths; this field's value is an
// absolute URL whose baked-in origin may not match how the page is served
export function toSameOriginPath(value) {
  const url = new URL(value, window.location.href);
  const isOwnAssetHost = url.hostname === window.location.hostname
    || /\.aem\.(page|live)$/i.test(url.hostname);
  return isOwnAssetHost ? url.pathname : value;
}

export function resolveColor(value) {
  if (value.startsWith('--')) return `var(${value})`;
  if (value.startsWith('color-token')) return `var(${value.replace('color-token', '--s2a-color')})`;
  return value;
}

function decorateBackground(section, value, eager) {
  if (!value) return;
  if (isImageUrl(value)) {
    const picture = createOptimizedPicture(toSameOriginPath(value), '', eager);
    picture.classList.add('section-background');
    section.prepend(picture);
    section.classList.add('has-background');
    const img = picture.querySelector('img');
    if (img.complete) setColorSchemeFromImage(section, img);
    else img.addEventListener('load', () => setColorSchemeFromImage(section, img), { once: true });
    return;
  }
  section.style.backgroundColor = resolveColor(value);
  setColorScheme(section);
}

// call after decorateSections
export default function decorateSectionMetadata(main) {
  main.querySelectorAll(':scope > .section').forEach((section, index) => {
    const {
      radius, spacing, backgroundColor, backgroundImage, background,
    } = section.dataset;

    decorateLayoutField(section, 'radius', radius);
    decorateLayoutField(section, 'spacing', spacing);
    // only the first section's image is awaited by aem.js's waitForFirstImage
    decorateBackground(section, backgroundColor || backgroundImage || background, index === 0);
  });
}
