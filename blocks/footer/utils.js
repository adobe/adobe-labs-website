function getFooterAsset(path) {
  const base = window.hlx?.codeBasePath || '';
  return `${base}/blocks/footer/${path}`;
}

export function isDarkTheme() {
  const { theme } = document.documentElement.dataset;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function createFooterLogoImage() {
  const img = document.createElement('img');
  img.src = getFooterAsset('img/adobe-logo-full.svg');
  img.alt = 'Adobe';
  img.loading = 'lazy';
  img.className = 'footer-logo-image';
  return img;
}

export function createFooterMark() {
  const mark = document.createElement('span');
  mark.className = 'footer-mark';
  mark.setAttribute('role', 'img');
  mark.setAttribute('aria-label', 'Adobe');

  const img = document.createElement('img');
  img.src = getFooterAsset('img/adobe-logo-mark.svg');
  img.alt = '';
  img.loading = 'lazy';
  img.className = 'footer-mark-image';
  mark.append(img);

  return mark;
}

export function animateLogo(logo) {
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
