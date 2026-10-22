import { buildHero } from '../../../blocks/hero/hero.js';
import { createC2pa, Reader } from '../../../deps/c2pa-web/index.js';
import initContentCredentials from './content-credentials.js';

jest.mock('../../../deps/c2pa-web/index.js', () => ({
  createC2pa: jest.fn(),
  Reader: { fromBlob: jest.fn() },
}));

const IMAGE_SRC = 'https://example.com/media_1.jpg?width=750&format=jpg';

/**
 * @param {string} [alt]
 * @returns {HTMLPictureElement}
 */
function createPicture(alt = '') {
  const picture = document.createElement('picture');
  const img = document.createElement('img');
  img.src = IMAGE_SRC;
  img.alt = alt;
  picture.append(img);
  return picture;
}

/**
 * @param {object} [data] Extra hero data, such as `href`.
 * @returns {HTMLElement} The hero block, in the first section of `main`.
 */
function createHero(data = {}) {
  const main = document.createElement('main');
  const section = document.createElement('div');
  section.className = 'section hero-container';
  const hero = document.createElement('div');
  hero.className = 'hero hero-full-screen';
  section.append(hero);
  main.append(section);
  document.body.append(main);
  buildHero({
    image: createPicture('Hero image'),
    category: 'Research',
    headline: 'How creatives are thinking about AI',
    ...data,
  }, hero);
  return hero;
}

describe('content credentials', () => {
  beforeEach(() => {
    document.body.className = 'article';
    document.body.replaceChildren();
    createC2pa.mockResolvedValue({ dispose: jest.fn() });
    Reader.fromBlob.mockResolvedValue({
      activeManifest: jest.fn().mockResolvedValue({}),
      free: jest.fn().mockResolvedValue(undefined),
    });
    global.fetch = jest.fn().mockResolvedValue({
      blob: jest.fn().mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' })),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.fetch;
  });

  it('adds a hero pin to the content grid, outside the aria-hidden media', async () => {
    const hero = createHero();

    await initContentCredentials();

    const wrapper = hero.querySelector('.cr-pin-image--hero');
    expect(wrapper.parentElement).toHaveClass('hero__content');
    expect(wrapper.closest('[aria-hidden="true"]')).toBeNull();
    expect(wrapper.querySelector('.cr-pin-button'))
      .toHaveAttribute('aria-label', 'View content credentials for this image: Hero image');
    expect(hero.querySelector('.hero__media > picture')).not.toBeNull();
  });

  it('reads the hero image from its original source', async () => {
    createHero();

    await initContentCredentials();

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/media_1.jpg', { priority: 'low' });
  });

  it('never adds a pin to a hero wrapped in a link, or fetches its image', async () => {
    const hero = createHero({ href: 'https://example.com/research/article' });

    await initContentCredentials();

    expect(hero.querySelector('.hero__link-wrap')).not.toBeNull();
    expect(hero.querySelector('.cr-pin-image, .cr-pin-button')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('leaves a hero without credentials unchanged', async () => {
    Reader.fromBlob.mockResolvedValue({
      activeManifest: jest.fn().mockResolvedValue(null),
      free: jest.fn().mockResolvedValue(undefined),
    });
    const hero = createHero();

    await initContentCredentials();

    expect(hero.querySelector('.cr-pin-image')).toBeNull();
  });

  it('does not read a hero outside an article page', async () => {
    document.body.className = '';
    const hero = createHero();

    await initContentCredentials();

    expect(hero.querySelector('.cr-pin-image')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('still wraps content images for their pin', async () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'default-content-wrapper';
    wrapper.append(createPicture());
    document.body.append(wrapper);

    await initContentCredentials();

    const pinWrapper = wrapper.querySelector('.cr-pin-image');
    expect(pinWrapper).not.toHaveClass('cr-pin-image--hero');
    expect(pinWrapper.querySelector(':scope > picture')).not.toBeNull();
    expect(pinWrapper.querySelector(':scope > .cr-pin-button')).not.toBeNull();
  });
});
