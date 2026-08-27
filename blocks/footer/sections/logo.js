import getFooterAsset from '../utils.js';

function createFooterLogoImage() {
  const img = document.createElement('img');
  img.src = getFooterAsset('img/adobe-logo-full.svg');
  img.alt = 'Adobe';
  img.loading = 'lazy';
  img.className = 'footer__logo-image';
  return img;
}

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

export default function decorateLogo(parent) {
  const logo = document.createElement('div');
  logo.className = 'footer__logo';
  logo.append(createFooterLogoImage());
  parent.append(logo);
  animateLogo(logo);
  return logo;
}
