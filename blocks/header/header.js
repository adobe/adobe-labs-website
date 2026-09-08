/**
 * Header block. Loads Milo global navigation against the nav fragment.
 * Content path: `nav` metadata, or `/fragments/nav` by default.
 * @param {Element} block The header block element
 */

/** Milo CSS/JS target these on `<header>`; EDS puts them on the inner block. */
const HEADER_MIRROR_CLASSES = [
  'global-navigation',
  'new-nav',
  'local-nav',
  'ready',
  'is-compact',
  'mini-gnav',
  'has-plans-cta',
  'feds--dark',
];

/**
 * Keep `<header>` classList in sync with the EDS block so Milo `header.*` selectors match.
 * @param {Element} block
 * @param {Element} [headerEl]
 */
function mirrorHeaderClasses(block, headerEl) {
  if (!headerEl) return;
  const sync = () => {
    HEADER_MIRROR_CLASSES.forEach((cls) => {
      headerEl.classList.toggle(cls, block.classList.contains(cls));
    });
  };
  sync();
  new MutationObserver(sync).observe(block, { attributes: true, attributeFilter: ['class'] });
}

export default async function decorate(block) {
  const headerEl = block.closest('header');
  block.classList.add('global-navigation');
  mirrorHeaderClasses(block, headerEl);
  try {
    const { default: init } = await import('./gnav/global-navigation.js');
    await init(block);
    headerEl?.classList.add('ready');
    block.classList.add('ready');
  } catch {
    // Missing or invalid nav fragment should not fail the rest of the page.
  }
}
