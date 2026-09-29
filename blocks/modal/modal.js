/** @file No block table — `/modals/` links open this via `openModal()`, wired in scripts.js. */
import {
  buildBlock, decorateBlock, loadBlock, loadCSS,
} from '../../scripts/aem.js';
import { fromHTML } from '../../scripts/utils/utils.js';
import { loadFragment } from '../fragment/fragment.js';

let modalHeadingId = 0;

/**
 * Existing heading id, or a freshly assigned one — EDS already slugs
 * authored heading ids, so this only runs for content that lacks one.
 *
 * @param {Element} heading Heading element
 * @returns {string}
 */
function ensureHeadingId(heading) {
  if (heading.id) return heading.id;
  modalHeadingId += 1;
  heading.id = `modal-heading-${modalHeadingId}`;
  return heading.id;
}

/**
 * Gives the dialog an accessible name: the fragment's first heading via
 * `aria-labelledby`, or a generic `aria-label` when it has none.
 *
 * @param {Element} dialog Dialog element
 * @param {Element} dialogContent `.modal-content` holding the fragment
 * @returns {void}
 */
function labelDialog(dialog, dialogContent) {
  const heading = dialogContent.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    dialog.setAttribute('aria-labelledby', ensureHeadingId(heading));
  } else {
    dialog.setAttribute('aria-label', 'Dialog');
  }
}

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
  labelDialog(dialog, dialogContent);

  const visibleText = (selector) => [...dialogContent.querySelectorAll(selector)]
    .find((node) => !node.closest('[hidden]') && !node.querySelector('button, a'));
  const heading = [...dialogContent.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .find((node) => !node.closest('[hidden]'));
  if (heading) {
    if (!heading.id) heading.id = 'modal-heading';
    dialog.setAttribute('aria-labelledby', heading.id);
    const description = visibleText('p');
    if (description && !description.closest('form')) {
      if (!description.id) description.id = 'modal-description';
      dialog.setAttribute('aria-describedby', description.id);
    }
  } else {
    const label = visibleText('p')?.textContent.trim();
    if (label) dialog.setAttribute('aria-label', label);
  }

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
