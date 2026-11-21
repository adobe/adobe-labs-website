import { loadCSS } from '../../scripts/aem.js';
import decorate, {
  bridgeDialogModal,
  getMiloLibs,
  rebuildSectionMetadata,
  restoreMiloButtonMarkup,
  setModuleImporter,
} from './email-collection.js';

jest.mock('../../scripts/aem.js', () => ({
  loadCSS: jest.fn(() => Promise.resolve()),
}));

const DEFAULT_LIBS = 'https://main--milo--adobecom.aem.live/libs';

function createBlock({
  email = 'Email address',
  country = 'Country',
  mpsSname = 'adbe_ml_ai_research',
  subscriptionName = 'AI Research',
  signIn = 'off',
  withDialog = true,
} = {}) {
  const section = document.createElement('div');
  section.className = 'section';
  if (email) section.dataset.email = email;
  if (country) section.dataset.country = country;
  if (mpsSname) section.dataset.mpsSname = mpsSname;
  if (subscriptionName) section.dataset.subscriptionName = subscriptionName;
  if (signIn) section.dataset.signIn = signIn;

  const wrapper = document.createElement('div');
  const block = document.createElement('div');
  block.className = 'email-collection mailing-list';
  block.innerHTML = `
    <div><div>
      <h2 id="subscribe">Subscribe</h2>
      <p>New AI research on creativity in your inbox as it publishes.</p>
      <p class="button-wrapper"><a class="button" href="#submit">Subscribe</a></p>
    </div></div>
    <div><div>
      <p>We’ve received your response.</p>
      <p class="button-wrapper"><a class="button" href="#close-form">Back to the website</a></p>
    </div></div>
    <div><div>
      <p>Something went wrong</p>
      <p><a href="#close-form">Back to the website</a></p>
    </div></div>
  `;
  wrapper.append(block);
  section.append(wrapper);

  if (withDialog) {
    const dialog = document.createElement('dialog');
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.append(section);
    dialog.append(modalContent);
    document.body.append(dialog);
  } else {
    document.body.append(section);
  }

  return block;
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
  window.history.pushState({}, '', '/');
  window.hlx = { codeBasePath: '' };
  delete window.adobeIMS;
  setModuleImporter((url) => import(url));
});

describe('getMiloLibs', () => {
  it('returns the default Milo libs URL', () => {
    expect(getMiloLibs('')).toBe(DEFAULT_LIBS);
    expect(getMiloLibs('?milolibs=main')).toBe(DEFAULT_LIBS);
  });

  it('resolves local and branch milolibs query values', () => {
    expect(getMiloLibs('?milolibs=local')).toBe('http://localhost:6456/libs');
    expect(getMiloLibs('?milolibs=my-branch')).toBe(
      'https://my-branch--milo--adobecom.aem.live/libs',
    );
    expect(getMiloLibs('?milolibs=foo--milo--adobecom')).toBe(
      'https://foo--milo--adobecom.aem.live/libs',
    );
  });

  it('falls back to default for invalid milolibs values', () => {
    expect(getMiloLibs('?milolibs=bad/value')).toBe(DEFAULT_LIBS);
  });
});

describe('rebuildSectionMetadata', () => {
  it('rebuilds a section-metadata sibling from section dataset', () => {
    const block = createBlock({ withDialog: false });
    rebuildSectionMetadata(block);

    const meta = block.parentElement.querySelector('.section-metadata');
    expect(meta).toBeTruthy();
    expect(meta).toHaveAttribute('hidden');
    const rows = [...meta.children].map((row) => [
      row.firstElementChild.textContent,
      row.lastElementChild.textContent,
    ]);
    expect(rows).toEqual(expect.arrayContaining([
      ['email', 'Email address'],
      ['country', 'Country'],
      ['mps-sname', 'adbe_ml_ai_research'],
      ['subscription-name', 'AI Research'],
      ['sign-in', 'off'],
    ]));
  });

  it('defaults sign-in to off when missing from dataset', () => {
    const block = createBlock({ signIn: '', withDialog: false });
    delete block.closest('.section').dataset.signIn;
    rebuildSectionMetadata(block);

    const signIn = [...block.parentElement.querySelectorAll('.section-metadata > div')]
      .find((row) => row.firstElementChild.textContent === 'sign-in');
    expect(signIn.lastElementChild.textContent).toBe('off');
  });
});

describe('restoreMiloButtonMarkup', () => {
  it('restores strong-wrapped hash links for Milo decorateButtons', () => {
    const block = createBlock({ withDialog: false });
    restoreMiloButtonMarkup(block);

    expect(block.querySelector('strong a[href="#submit"]')).toHaveTextContent('Subscribe');
    expect(block.querySelector('strong a[href="#close-form"]')).toBeTruthy();
    expect(block.querySelector('.button-wrapper')).toBeNull();
  });
});

describe('bridgeDialogModal', () => {
  it('marks modal-content as dialog-modal and closes the Labs dialog on milo:modal:closed', () => {
    const block = createBlock();
    const dialog = block.closest('dialog');
    dialog.showModal();

    const shell = bridgeDialogModal(block);

    expect(shell).toHaveClass('dialog-modal');
    expect(shell).toHaveAttribute('id', 'email-collection');

    window.dispatchEvent(new CustomEvent('milo:modal:closed', {
      detail: { id: 'email-collection', hash: '' },
    }));
    expect(dialog).not.toHaveAttribute('open');
  });

  it('returns undefined when the block is not inside a dialog', () => {
    const block = createBlock({ withDialog: false });
    expect(bridgeDialogModal(block)).toBeUndefined();
  });
});

describe('email-collection shim', () => {
  it('bootstraps Milo with adlabs, adapts the DOM, loads Milo assets, and calls init', async () => {
    const setConfig = jest.fn();
    const loadIms = jest.fn(async () => {
      window.adobeIMS = { signIn: jest.fn() };
    });
    const init = jest.fn(() => Promise.resolve());

    setModuleImporter(async (url) => {
      if (url.endsWith('/utils/utils.js')) {
        return { setConfig, loadIms };
      }
      if (url.endsWith('/blocks/email-collection/email-collection.js')) {
        return { default: init };
      }
      throw new Error(`Unexpected import: ${url}`);
    });

    const block = createBlock();
    await decorate(block);

    expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({
      miloLibs: DEFAULT_LIBS,
      imsClientId: 'adlabs',
      imsScope: 'AdobeID,openid',
      locales: { '': { ietf: 'en-US', tk: 'hah7vzn.css' } },
      adobeid: expect.objectContaining({
        enableGuestAccounts: true,
        enableGuestTokenForceRefresh: true,
        api_parameters: { check_token: { guest_allowed: true } },
      }),
    }));
    expect(document.querySelector('meta[name="ims-guest-token"]')).toBeNull();
    expect(loadIms).toHaveBeenCalled();
    await expect(window.adobeIMS.signIn()).rejects.toThrow('Sign-in is disabled for this form');
    expect(block.parentElement.querySelector('.section-metadata')).toBeTruthy();
    expect(block.querySelector('strong a[href="#submit"]')).toBeTruthy();
    expect(block.closest('.dialog-modal')).toBeTruthy();
    expect(loadCSS).toHaveBeenCalledWith(
      `${DEFAULT_LIBS}/blocks/email-collection/email-collection.css`,
    );
    expect(init).toHaveBeenCalledWith(block);
  });
});
