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
 * Gives the dialog an accessible name from the visible fragment content.
 * A hidden heading is skipped so success and error panels are not announced
 * while the form is showing. Falls back to the visible message, then a
 * generic label, when there is no heading.
 *
 * @param {Element} dialog Dialog element
 * @param {Element} dialogContent `.modal-content` holding the fragment
 * @returns {void}
 */
function labelDialog(dialog, dialogContent) {
  const isVisible = (node) => !node.closest('[hidden]');
  const heading = [...dialogContent.querySelectorAll('h1, h2, h3, h4, h5, h6')].find(isVisible);
  const description = [...dialogContent.querySelectorAll('p')]
    .find((node) => isVisible(node) && !node.closest('form') && !node.querySelector('button, a'));

  if (heading) {
    dialog.setAttribute('aria-labelledby', ensureHeadingId(heading));
    dialog.removeAttribute('aria-label');
    if (description) {
      if (!description.id) description.id = 'modal-description';
      dialog.setAttribute('aria-describedby', description.id);
    }
    return;
  }

  dialog.removeAttribute('aria-labelledby');
  dialog.removeAttribute('aria-describedby');
  dialog.setAttribute('aria-label', description?.textContent.trim() || 'Dialog');
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

  // decorateBlock() tags the block's own parent with `modal-wrapper`, so it
  // gets a disposable wrapper here rather than landing on <main> itself.
  const block = buildBlock('modal', '');
  const wrapper = document.createElement('div');
  wrapper.append(block);
  document.querySelector('main').append(wrapper);
  decorateBlock(block);
  await loadBlock(block);

  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    wrapper.remove();
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
