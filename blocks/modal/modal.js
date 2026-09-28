/** @file No block table — `/modals/` links open this via `openModal()`, wired in scripts.js. */
import {
  buildBlock, decorateBlock, loadBlock, loadCSS,
} from '../../scripts/aem.js';
import { fromHTML } from '../../scripts/utils/utils.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Builds a `.modal` block containing a dialog around `contentNodes`, and
 * loads it onto the page. The dialog stays closed until `showModal()` is
 * called on the returned handle.
 *
 * @param {Node[]} contentNodes Fragment content to show inside the dialog
 * @returns {Promise<{ block: Element, showModal: () => void }>}
 */
export async function createModal(contentNodes) {
  await loadCSS(`${window.hlx.codeBasePath}/blocks/modal/modal.css`);

  const dialog = fromHTML(`
    <dialog>
      <button type="button" class="close-button" aria-label="Close">
        <span class="icon icon-close"></span>
      </button>
      <div class="modal-content"></div>
    </dialog>
  `);
  const dialogContent = dialog.querySelector('.modal-content');
  dialogContent.append(...contentNodes);

  dialog.querySelector('.close-button').addEventListener('click', () => dialog.close());

  // Close on click outside the dialog's own box (the ::backdrop isn't a
  // real hit-testable element, so this checks the dialog's own bounds).
  dialog.addEventListener('click', (event) => {
    const {
      left, right, top, bottom,
    } = dialog.getBoundingClientRect();
    const { clientX, clientY } = event;
    if (clientX < left || clientX > right || clientY < top || clientY > bottom) {
      dialog.close();
    }
  });

  const block = buildBlock('modal', '');
  document.querySelector('main').append(block);
  decorateBlock(block);
  await loadBlock(block);

  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    block.remove();
  });

  block.textContent = '';
  block.append(dialog);

  return {
    block,
    showModal: () => {
      dialog.showModal();
      setTimeout(() => { dialogContent.scrollTop = 0; }, 0);
      document.body.classList.add('modal-open');
    },
  };
}

/**
 * Loads the fragment at `fragmentUrl` and opens it in a modal dialog.
 *
 * @param {string} fragmentUrl Absolute or site-relative fragment URL
 * @returns {Promise<void>}
 */
export async function openModal(fragmentUrl) {
  const path = fragmentUrl.startsWith('http')
    ? new URL(fragmentUrl, window.location).pathname
    : fragmentUrl;

  const fragment = await loadFragment(path);
  if (!fragment) return;
  const { showModal } = await createModal([...fragment.childNodes]);
  showModal();
}
