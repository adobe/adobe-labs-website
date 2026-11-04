import { buildHero } from '../../../blocks/hero/hero.js';
import { buildMediaText } from '../../../blocks/media-text/media-text.js';
import { createC2pa, Reader } from '../../../deps/c2pa-web/index.js';
import initContentCredentials from './content-credentials.js';

jest.mock('../../../deps/c2pa-web/index.js', () => ({
  createC2pa: jest.fn(),
  Reader: { fromBlob: jest.fn() },
}));

const IMAGE_SRC = 'https://labs.adobe.com/docs/reference/tests/media_1495355bba1ba7300313087b171fe87eb9973b5aa.jpg?width=750&format=webply&optimize=medium';
const MOCK_SOURCE_LABEL = 'urn:c2pa:3e8a41c2-9b7d-4f16-a5e0-6c2d8f94b17a:adobe';
const MOCK_RESIZED_LABEL = 'urn:c2pa:a4c07e5b-12d3-4e8f-b96a-0f5e3c7d2189';

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

/**
 * @param {object|null} store The manifest store the reader resolves with.
 */
function mockManifestStore(store) {
  Reader.fromBlob.mockResolvedValue({
    manifestStore: jest.fn().mockResolvedValue(store),
    free: jest.fn().mockResolvedValue(undefined),
  });
}

/**
 * The manifest Adobe Content Authenticity signs onto an original image, trimmed of
 * hashes, thumbnails and validation results. Modeled on a real credentialed image, with
 * the creator's details replaced.
 *
 * @returns {object}
 */
function createSourceManifest() {
  return {
    claim_generator_info: [{
      name: 'Adobe Content Authenticity',
      'org.contentauth.c2pa_rs': '0.67.1',
      'com.adobe.aca-version': 'b81f4d2',
    }],
    title: 'jane-example-creator-02.jpg',
    instance_id: 'xmp:iid:9d2e7a13-c5f8-4b60-8e1a-7f4c3b9d0e52',
    ingredients: [{
      title: 'jane-example-creator-02.jpg',
      format: 'image/jpeg',
      instance_id: 'xmp.iid:e6a3f027-4d1b-48c9-9f75-2b8e0c6a4d13',
      relationship: 'parentOf',
      label: 'c2pa.ingredient.v3',
    }],
    assertions: [
      {
        label: 'c2pa.actions.v2',
        data: {
          actions: [
            { action: 'c2pa.opened' },
            { action: 'c2pa.watermarked' },
          ],
        },
        created: true,
      },
      {
        label: 'cawg.training-mining',
        data: {
          entries: {
            'cawg.ai_inference': { use: 'notAllowed' },
            'cawg.ai_generative_training': { use: 'notAllowed' },
          },
        },
      },
      {
        label: 'c2pa.training-mining',
        data: {
          entries: {
            'c2pa.ai_inference': { use: 'notAllowed' },
            'c2pa.ai_generative_training': { use: 'notAllowed' },
          },
        },
      },
      {
        label: 'cawg.identity',
        data: {
          '@context': [
            'https://www.w3.org/ns/credentials/v2',
            'https://cawg.io/identity/1.1/ica/context/',
          ],
          type: ['VerifiableCredential', 'IdentityClaimsAggregationCredential'],
          issuer: 'did:web:connected-identities.identity.adobe.com',
          validFrom: '2026-10-20T08:18:47Z',
          verifiedIdentities: [
            {
              type: 'cawg.social_media',
              username: 'jane_example_creator',
              uri: 'https://www.instagram.com/#mock-test-only',
              verifiedAt: '2026-10-19T22:36:34Z',
              provider: { id: 'https://instagram.com', name: 'instagram' },
            },
            {
              type: 'cawg.document_verification',
              name: 'Jane Example Creator',
              uri: 'https://www.linkedin.com/#mock-test-only',
              verifiedAt: '2026-10-19T22:43:07Z',
              provider: { id: 'https://linkedin.com', name: 'LINKEDIN' },
            },
          ],
        },
      },
    ],
    signature_info: {
      alg: 'Ps256',
      issuer: 'Adobe Inc.',
      common_name: 'Adobe Content Authenticity',
      time: '2026-10-20T08:18:47+00:00',
    },
    label: MOCK_SOURCE_LABEL,
    claim_version: 2,
  };
}

/**
 * A manifest store as read from the original image.
 *
 * @returns {object}
 */
function createOriginalStore() {
  return {
    active_manifest: MOCK_SOURCE_LABEL,
    manifests: { [MOCK_SOURCE_LABEL]: createSourceManifest() },
  };
}

/**
 * A manifest store as written by a server resize: the active manifest only records the
 * resize, and the original credentials sit on its parent ingredient.
 *
 * @param {object} [active] Extra fields for the active manifest.
 * @returns {object}
 */
function createResizedStore(active = {}) {
  return {
    active_manifest: MOCK_RESIZED_LABEL,
    manifests: {
      [MOCK_RESIZED_LABEL]: {
        claim_generator_info: [{
          name: 'fastly_image_optimizer',
          'org.contentauth.c2pa_rs': '0.90.22',
        }],
        instance_id: 'xmp:iid:0c7b5e94-a2f1-4d3e-8b69-5e1d7f2a8c40',
        ingredients: [{
          format: 'jpeg',
          instance_id: 'xmp.iid:71f8d2a6-3e9c-4b05-a1d7-c4e6b0f3925e',
          relationship: 'parentOf',
          active_manifest: MOCK_SOURCE_LABEL,
          label: 'c2pa.ingredient.v3',
        }],
        assertions: [{
          label: 'c2pa.actions.v2',
          data: {
            actions: [
              { action: 'c2pa.opened', softwareAgent: 'Fastly Image Optimizer' },
              { action: 'c2pa.edited', softwareAgent: 'Fastly Image Optimizer' },
            ],
          },
        }],
        signature_info: { alg: 'Es256', issuer: 'Fastly, Inc.' },
        label: MOCK_RESIZED_LABEL,
        claim_version: 2,
        ...active,
      },
      [MOCK_SOURCE_LABEL]: createSourceManifest(),
    },
  };
}

/**
 * @returns {HTMLElement} The default content wrapper holding a single image.
 */
function createContentImage() {
  const wrapper = document.createElement('div');
  wrapper.className = 'default-content-wrapper';
  wrapper.append(createPicture());
  document.body.append(wrapper);
  return wrapper;
}

describe('content credentials', () => {
  beforeEach(() => {
    document.body.className = 'article';
    document.body.replaceChildren();
    createC2pa.mockResolvedValue({ dispose: jest.fn() });
    mockManifestStore(createOriginalStore());
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

  it('never adds a pin to a hero wrapped in a link, or fetches its image', async () => {
    const hero = createHero({ href: 'https://example.com/research/article' });

    await initContentCredentials();

    expect(hero.querySelector('.hero__link-wrap')).not.toBeNull();
    expect(hero.querySelector('.cr-pin-image, .cr-pin-button')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('leaves a hero without credentials unchanged', async () => {
    mockManifestStore(null);
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

  it('wraps a media-text image for its pin', async () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'media-text-wrapper';
    const block = document.createElement('div');
    block.className = 'media-text';
    wrapper.append(block);
    document.body.append(wrapper);
    const copy = document.createElement('p');
    copy.textContent = 'How the image was made.';
    buildMediaText({
      image: createPicture('A red rock canyon'),
      caption: 'Image: Bernardo Ramoning',
      content: [copy],
    }, block);

    await initContentCredentials();

    const pinWrapper = block.querySelector('.media-text__media .cr-pin-image');
    expect(pinWrapper).not.toHaveClass('cr-pin-image--hero');
    expect(pinWrapper.querySelector(':scope > picture')).not.toBeNull();
    expect(pinWrapper.querySelector(':scope > .cr-pin-button'))
      .toHaveAttribute('aria-label', 'View content credentials for this image: A red rock canyon');
    expect(block.querySelector('.media-text__content .cr-pin-image')).toBeNull();
    expect(block.querySelector('.media-text__caption')).toHaveTextContent('Image: Bernardo Ramoning');
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

  it('shows the tool that recorded the credentials', async () => {
    const wrapper = createContentImage();

    await initContentCredentials();

    expect(wrapper.querySelector('.cr-pin-popover__subheading'))
      .toHaveTextContent(/^Recorded by Adobe Content Authenticity$/);
  });

  it('shows the author name', async () => {
    const wrapper = createContentImage();

    await initContentCredentials();

    expect(wrapper.querySelector('.cr-pin-popover__author-name')).toHaveTextContent('Jane Example Creator');
  });

  it('shows the do not train notice', async () => {
    const wrapper = createContentImage();

    await initContentCredentials();

    expect(wrapper.querySelector('.cr-pin-popover__item--ai-notice'))
      .toHaveTextContent('I request that generative AI models not train on or use my content.');
  });

  it('shows the source content of a resized image (i.e. from server optimized params via fastly)', async () => {
    mockManifestStore(createResizedStore());
    const wrapper = createContentImage();

    await initContentCredentials();

    const subheading = wrapper.querySelector('.cr-pin-popover__subheading');
    expect(subheading.innerHTML).toBe('Source content recorded by: <br>Adobe Content Authenticity');
    expect(wrapper.querySelector('.cr-pin-popover__author-name')).toHaveTextContent('Jane Example Creator');
  });

  it('prefers the active manifest when it has data of its own', async () => {
    mockManifestStore(createResizedStore({
      assertions: [{
        label: 'stds.schema-org.CreativeWork',
        data: { author: [{ name: 'Resize Author' }] },
      }],
    }));
    const wrapper = createContentImage();

    await initContentCredentials();

    expect(wrapper.querySelector('.cr-pin-popover__subheading'))
      .toHaveTextContent(/^Recorded by fastly_image_optimizer$/);
    expect(wrapper.querySelector('.cr-pin-popover__author-name')).toHaveTextContent('Resize Author');
  });
});
