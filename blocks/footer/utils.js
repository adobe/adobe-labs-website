export default function getFooterAsset(path) {
  const base = window.hlx?.codeBasePath || '';
  return `${base}/blocks/footer/${path}`;
}

export async function loadIcons(block) {
  if (block.querySelector('.footer__icons')) return;

  const resp = await fetch(getFooterAsset('img/icons.svg'));
  if (!resp.ok) return;

  const content = await resp.text();
  const icons = document.createElement('div');
  icons.className = 'footer__icons';
  icons.innerHTML = content;
  icons.setAttribute('aria-hidden', 'true');
  block.append(icons);
}
