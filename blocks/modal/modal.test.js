import { within } from '@testing-library/dom';
import { buildBlock } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { createModal, openModal } from './modal.js';

jest.mock('../../scripts/aem.js', () => ({
  buildBlock: jest.fn(),
  decorateBlock: jest.fn(),
  loadBlock: jest.fn(),
  loadCSS: jest.fn(),
}));

jest.mock('../fragment/fragment.js', () => ({
  loadFragment: jest.fn(),
}));

function fragmentFrom(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  return wrap;
}

// jsdom does not implement HTMLDialogElement's showModal()/close(), so the
// behavior these tests rely on (the `close` event, the `open` state) is
// polyfilled here rather than in the block itself.
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
  document.body.innerHTML = '<main></main>';
  window.hlx = { codeBasePath: '' };
  buildBlock.mockImplementation((name) => {
    const block = document.createElement('div');
    block.className = name;
    block.dataset.blockName = name;
    return block;
  });
});

describe('createModal', () => {
  it('appends the dialog with the given content into a new modal block', async () => {
    const content = fragmentFrom('<h2>Lorem ipsum</h2><p>Dolor sit amet.</p>');

    const { block } = await createModal([...content.childNodes]);

    expect(document.querySelector('main')).toContainElement(block);
    const dialog = block.querySelector('dialog');
    expect(dialog.querySelector('h2')).toHaveTextContent('Lorem ipsum');
    expect(dialog.querySelector('p')).toHaveTextContent('Dolor sit amet.');
  });

  it('shows the dialog and locks body scroll on showModal()', async () => {
    const { block, showModal } = await createModal([document.createElement('p')]);
    const dialog = block.querySelector('dialog');

    showModal();

    expect(dialog).toHaveAttribute('open');
    expect(document.body).toHaveClass('modal-open');
  });

  it('removes the block and unlocks body scroll when the close button is clicked', async () => {
    const { block, showModal } = await createModal([document.createElement('p')]);
    document.body.append(block);
    showModal();

    within(block).getByRole('button', { name: 'Close' }).click();

    expect(document.body).not.toHaveClass('modal-open');
    expect(document.querySelector('.modal')).not.toBeInTheDocument();
  });

  it('closes when clicking outside the dialog box', async () => {
    const { block, showModal } = await createModal([document.createElement('p')]);
    const dialog = block.querySelector('dialog');
    document.body.append(block);
    showModal();

    jest.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 100, right: 200, top: 100, bottom: 200,
    });
    dialog.dispatchEvent(new MouseEvent('click', {
      clientX: 0, clientY: 0, bubbles: true,
    }));

    expect(dialog).not.toHaveAttribute('open');
  });

  it('does not close when clicking inside the dialog box', async () => {
    const { block, showModal } = await createModal([document.createElement('p')]);
    const dialog = block.querySelector('dialog');
    document.body.append(block);
    showModal();

    jest.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 100, right: 200, top: 100, bottom: 200,
    });
    dialog.dispatchEvent(new MouseEvent('click', {
      clientX: 150, clientY: 150, bubbles: true,
    }));

    expect(dialog).toHaveAttribute('open');
  });
});

describe('openModal', () => {
  it('loads the fragment at the given path and opens it in a modal', async () => {
    loadFragment.mockResolvedValue(fragmentFrom('<h2>Subscribe</h2><p>Lorem ipsum dolor sit amet.</p>'));

    await openModal('/modals/subscribe');

    expect(loadFragment).toHaveBeenCalledWith('/modals/subscribe');
    const dialog = document.querySelector('.modal dialog');
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByRole('heading', { name: 'Subscribe' })).toBeInTheDocument();
  });

  it('resolves an absolute URL to a site-relative path before loading', async () => {
    loadFragment.mockResolvedValue(fragmentFrom('<p>Lorem ipsum.</p>'));

    await openModal('https://example.com/modals/subscribe');

    expect(loadFragment).toHaveBeenCalledWith('/modals/subscribe');
  });

  it('does nothing when the fragment fails to load', async () => {
    loadFragment.mockResolvedValue(null);

    await openModal('/modals/missing');

    expect(document.querySelector('.modal')).not.toBeInTheDocument();
  });
});
