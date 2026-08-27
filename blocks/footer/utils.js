import { fromHTML } from '../../scripts/utils/utils.js';

/**
 * Builds a URL for an asset under the footer block.
 * @param {string} path Path relative to `blocks/footer/`
 * @returns {string}
 */
export default function getFooterAsset(path) {
  const base = window.hlx?.codeBasePath || '';
  return `${base}/blocks/footer/${path}`;
}

/**
 * Fetches and injects the footer SVG icon sprite into the block once.
 * @param {Element} block The footer block element
 * @returns {Promise<void>}
 */
export async function loadFooterIcons(block) {
  if (block.querySelector('.footer__icons')) return;

  const resp = await fetch(getFooterAsset('img/icons.svg'));
  if (!resp.ok) return;

  const content = await resp.text();
  const icons = fromHTML(`
    <div class="footer__icons" aria-hidden="true">
      ${content}
    </div>
  `);
  block.append(icons);
}
