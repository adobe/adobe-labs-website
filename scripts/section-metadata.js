/**
 * Applies Section Metadata's non-`style` fields to a section.
 *
 * The `style` field is already handled by the backend before this code ever
 * runs: it promotes each comma-separated value into a class on the section
 * div directly (see `class="round container"` in the rendered markup), and
 * every other field lands as a plain-text `data-<field>` attribute on that
 * same div. There is no metadata table left in the DOM to parse client-side
 * by the time `decorateSections` hands us the section.
 */

function toClassName(name) {
  return typeof name === 'string'
    ? name
      .toLowerCase()
      .replace(/[^0-9a-z]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    : '';
}

function decorateLayoutField(section, field, value) {
  if (!value || value === '0') return;
  section.classList.add(field, `${field}-${toClassName(value)}`);
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

function getRelativeLuminance({ r, g, b }) {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : ((rsRGB + 0.055) / 1.055) ** 2.4;
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : ((gsRGB + 0.055) / 1.055) ** 2.4;
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : ((bsRGB + 0.055) / 1.055) ** 2.4;

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Sets a readable text color for a section's own solid background color,
 * independent of the site's global light/dark theme.
 */
function setColorScheme(section) {
  const rgb = parseColor(section);
  if (!rgb) return;
  const scheme = getRelativeLuminance(rgb) > 0.5 ? 'light-scheme' : 'dark-scheme';
  section.classList.remove('light-scheme', 'dark-scheme');
  section.classList.add(scheme);
}

/**
 * An inserted image asset resolves to an absolute published URL by the time
 * it reaches a data attribute (the pipeline flattens metadata cells to plain
 * text) — there's no `<picture>`/srcset to work with, so this is a single
 * flat background image with no responsive sources and no light/dark swap.
 */
function isImageUrl(value) {
  return /^(https?:)?\/\//i.test(value);
}

export function resolveColor(value) {
  if (value.startsWith('--')) return `var(${value})`;
  if (value.startsWith('color-token')) return `var(${value.replace('color-token', '--s2a-color')})`;
  return value;
}

function decorateBackground(section, value) {
  if (!value) return;
  if (isImageUrl(value)) {
    section.classList.add('has-background');
    section.style.backgroundImage = `url('${value}')`;
    return;
  }
  section.style.backgroundColor = resolveColor(value);
  setColorScheme(section);
}

/**
 * Applies Section Metadata's grid/gap/radius/spacing/container/layout/background
 * fields — already present as classes/data attributes on each section — to
 * that section. Call after `decorateSections`.
 * @param {Element} main The container element
 */
export default function decorateSectionMetadata(main) {
  main.querySelectorAll(':scope > .section').forEach((section) => {
    const {
      grid, gap, radius, spacing, container, layout,
      backgroundColor, backgroundImage, background,
    } = section.dataset;

    decorateLayoutField(section, 'grid', grid);
    decorateLayoutField(section, 'gap', gap);
    decorateLayoutField(section, 'radius', radius);
    decorateLayoutField(section, 'spacing', spacing);
    decorateLayoutField(section, 'container', container);
    decorateLayoutField(section, 'layout', layout);
    decorateBackground(section, backgroundColor || backgroundImage || background);
  });
}
