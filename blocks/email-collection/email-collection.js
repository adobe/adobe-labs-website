/**
 * Loader shim: bootstraps Milo config and runs Milo's email-collection block
 * inside the Labs Subscribe modal.
 */
import { loadCSS } from '../../scripts/aem.js';

const DEFAULT_MILO_LIBS = 'https://main--milo--adobecom.aem.live/libs';
const DIALOG_MODAL_ID = 'email-collection';

/** Dataset keys Labs stores → section-metadata row labels Milo `setFormData` reads. */
const METADATA_LABELS = {
  email: 'email',
  country: 'country',
  firstName: 'first-name',
  lastName: 'last-name',
  organization: 'organization',
  occupation: 'occupation',
  phoneNumber: 'phone-number',
  phoneCountryCode: 'phone-country-code',
  mpsSname: 'mps-sname',
  subscriptionName: 'subscription-name',
  signIn: 'sign-in',
  runtimeEndpoint: 'runtime-endpoint',
  consentId: 'consent-id',
  emailCollectionTest: 'email-collection-test',
};

const MILO_BUTTON_HASHES = new Set(['submit', 'close-form', 'show-form']);

let miloReady;
let importModule = (url) => import(url);

/**
 * Overrides dynamic `import` for unit tests.
 * @param {(url: string) => Promise<unknown>} fn
 */
export function setModuleImporter(fn) {
  importModule = fn;
}

/**
 * Resolves Milo libs URL. Same query pattern as milo-college.
 * @param {string} [search=window.location.search]
 * @returns {string}
 */
export function getMiloLibs(search = window.location.search) {
  const branch = new URLSearchParams(search).get('milolibs') || 'main';
  if (!/^[a-zA-Z0-9_-]+$/.test(branch)) {
    return DEFAULT_MILO_LIBS;
  }
  if (branch === 'local') return 'http://localhost:6456/libs';
  if (branch === 'main') return DEFAULT_MILO_LIBS;
  return branch.includes('--')
    ? `https://${branch}.aem.live/libs`
    : `https://${branch}--milo--adobecom.aem.live/libs`;
}

/**
 * @param {string} href
 * @returns {string} Hash without `#`, or `''`
 */
function linkHash(href) {
  try {
    return new URL(href, window.location.href).hash.replace(/^#/, '');
  } catch {
    return '';
  }
}

function disableImsLoginRedirect() {
  const ims = window.adobeIMS;
  if (!ims) return;
  ims.signIn = () => Promise.reject(new Error('Sign-in is disabled for this form'));
}

/**
 * One-time Milo `setConfig` + `loadIms`.
 * @param {string} miloLibs
 * @returns {Promise<void>}
 */
async function ensureMiloBootstrap(miloLibs) {
  if (!miloReady) {
    miloReady = (async () => {
      const { setConfig, loadIms } = await importModule(`${miloLibs}/utils/utils.js`);
      setConfig({
        miloLibs,
        codeRoot: window.hlx?.codeBasePath || '',
        imsClientId: 'adlabs',
        imsScope: 'AdobeID,openid',
        locales: { '': { ietf: 'en-US', tk: 'hah7vzn.css' } },
        adobeid: {
          api_parameters: { check_token: { guest_allowed: true } },
          enableGuestAccounts: true,
          enableGuestTokenForceRefresh: true,
        },
      });
      await loadIms().catch(() => {});
      disableImsLoginRedirect();
    })();
  }
  return miloReady;
}

/**
 * Rebuilds a sibling `.section-metadata` table from `section.dataset`
 * so Milo `setFormData` can read mailing-list config.
 * @param {Element} block
 */
export function rebuildSectionMetadata(block) {
  const parent = block.parentElement;
  if (!parent) return;

  parent.querySelector(':scope > .section-metadata')?.remove();

  const data = block.closest('.section')?.dataset || {};
  const meta = document.createElement('div');
  meta.className = 'section-metadata';
  meta.hidden = true;

  Object.entries(METADATA_LABELS).forEach(([camel, label]) => {
    if (!(camel in data)) return;
    const row = document.createElement('div');
    const nameCell = document.createElement('div');
    const valueCell = document.createElement('div');
    nameCell.textContent = label;
    valueCell.textContent = data[camel];
    row.append(nameCell, valueCell);
    meta.append(row);
  });

  if (![...meta.children].some((row) => row.firstElementChild?.textContent === 'sign-in')) {
    const row = document.createElement('div');
    const nameCell = document.createElement('div');
    const valueCell = document.createElement('div');
    nameCell.textContent = 'sign-in';
    valueCell.textContent = 'off';
    row.append(nameCell, valueCell);
    meta.append(row);
  }

  parent.append(meta);
}

/**
 * Labs `decorateButtons` turns authored `strong a` into `.button-wrapper` /
 * `.button`. Milo's `decorateButtons` expects `strong a` again so it can
 * build `.action-area` / `.button-container` for submit and close.
 * @param {Element} block
 */
export function restoreMiloButtonMarkup(block) {
  [...block.querySelectorAll('a[href]')].forEach((anchor) => {
    const hash = linkHash(anchor.getAttribute('href'));
    if (!MILO_BUTTON_HASHES.has(hash)) return;

    const replaceTarget = anchor.closest('p') || anchor;
    const next = document.createElement('a');
    next.href = `#${hash}`;
    next.textContent = anchor.textContent.trim();

    const wrap = document.createElement('p');
    if (hash === 'show-form') {
      wrap.append(next);
    } else {
      const strong = document.createElement('strong');
      strong.append(next);
      wrap.append(strong);
    }
    replaceTarget.replaceWith(wrap);
  });
}

/**
 * Wraps Labs `<dialog>` content so Milo can `closest('.dialog-modal')` and
 * `closeModal` without destroying the native dialog shell.
 * @param {Element} block
 * @returns {HTMLElement|undefined} The `.dialog-modal` shell, if bridged
 */
export function bridgeDialogModal(block) {
  const dialog = block.closest('dialog');
  if (!dialog) return undefined;

  let shell = dialog.querySelector('.dialog-modal');
  if (!shell) {
    const modalContent = dialog.querySelector('.modal-content');
    if (modalContent) {
      modalContent.classList.add('dialog-modal');
      if (!modalContent.id) modalContent.id = DIALOG_MODAL_ID;
      shell = modalContent;
    } else {
      shell = document.createElement('div');
      shell.className = 'dialog-modal';
      shell.id = DIALOG_MODAL_ID;
      while (dialog.firstChild) shell.append(dialog.firstChild);
      dialog.append(shell);
    }
  } else if (!shell.id) {
    shell.id = DIALOG_MODAL_ID;
  }

  if (dialog.dataset.miloCloseBound !== 'true') {
    dialog.dataset.miloCloseBound = 'true';
    const onClosed = (event) => {
      if (event.detail?.id && event.detail.id !== shell.id) return;
      window.removeEventListener('milo:modal:closed', onClosed);
      dialog.close();
    };
    window.addEventListener('milo:modal:closed', onClosed);
  }

  return shell;
}

/**
 * `loadFragment` finishes block decorate before `createModal` wraps content
 * in `<dialog>`. Milo's `init` reads `closest('.dialog-modal')` synchronously,
 * so wait until the block is inside the Labs dialog.
 * @param {Element} block
 * @returns {Promise<HTMLDialogElement|null>}
 */
function whenDialogReady(block) {
  const existing = block.closest('dialog');
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const timer = window.setInterval(() => {
      const dialog = block.closest('dialog');
      if (!dialog) return;
      window.clearInterval(timer);
      resolve(dialog);
    }, 16);
    window.setTimeout(() => {
      window.clearInterval(timer);
      resolve(block.closest('dialog'));
    }, 5000);
  });
}

/**
 * Bootstraps Milo and initializes the upstream email-collection block.
 * @param {Element} block
 * @returns {Promise<void>}
 */
export default async function decorate(block) {
  const miloLibs = getMiloLibs();
  await ensureMiloBootstrap(miloLibs);

  rebuildSectionMetadata(block);
  restoreMiloButtonMarkup(block);

  await loadCSS(`${miloLibs}/blocks/email-collection/email-collection.css`).catch(() => {});
  const { default: init } = await importModule(
    `${miloLibs}/blocks/email-collection/email-collection.js`,
  );

  const start = async () => {
    bridgeDialogModal(block);
    await init(block);
  };

  // loadFragment decorates before createModal wraps content. Awaiting the
  // dialog here would deadlock openModal, so only await when already mounted.
  if (block.closest('dialog')) {
    await start();
    return;
  }

  whenDialogReady(block).then((dialog) => {
    if (dialog) return start();
    return undefined;
  });
}
