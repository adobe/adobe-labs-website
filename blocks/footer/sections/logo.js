import { escapeAttr, fromHTML } from '../../../scripts/utils/utils.js';
import getFooterAsset from '../utils.js';

/**
 * Updates footer logo entry progress from scroll and resize for CSS-driven animation.
 * @param {Element|null} logo Footer logo element
 * @returns {(() => void)|undefined} Cleanup that removes listeners and cancels pending frames
 */
function animateLogo(logo) {
  if (!logo) return undefined;

  let scrollPending = false;
  let resizeRaf = null;

  const updateLogoProgress = () => {
    const prevElement = logo.previousElementSibling;
    if (!prevElement) return;
    const bottom = prevElement.getBoundingClientRect().bottom ?? 0;
    let progress = ((window.innerHeight - bottom) / logo.offsetHeight) * 100;
    progress = Math.max(0, Math.min(100, progress));
    logo.style.setProperty('--footer-logo-entry-progress', progress);
  };

  const onScroll = () => {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(() => {
      updateLogoProgress();
      scrollPending = false;
    });
  };

  const onResize = () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      updateLogoProgress();
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  updateLogoProgress();

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
  };
}

/**
 * Appends the full Adobe logo and starts its scroll-linked animation.
 * @param {Element} parent Footer block or container to append the logo to
 * @returns {Element}
 */
export default function decorateLogo(parent) {
  const src = escapeAttr(getFooterAsset('img/adobe-logo-full.svg'));
  const logo = fromHTML(`
    <div class="footer__logo">
      <img src="${src}" alt="Adobe" loading="lazy" class="footer__logo-image">
    </div>
  `);
  parent.append(logo);
  animateLogo(logo);
  return logo;
}
