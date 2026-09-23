/**
 * Content Credentials / Content Authenticity
 *
 * - Reads content credentials data from signed images, using the open source c2pa-web library.
 * - Adds a "CR" button to the image if it has credentials.
 * - The button is a component that toggles a popover displaying the image data.
 *
 * Intended to run on deferred / delayed load due to the library size, processing time,
 * and its lower priority for the intial page render. The WASM file is quite large.
 *
 * The c2pa-web library is vendored locally under deps/c2pa-web/ (see the
 * "build:c2pa" npm script), since this project has no build/bundler step.
 * Run `npm run build:c2pa` after bumping the version in package.json.
 */

import { toSafeHttpUrl } from '../utils/utils.js';

// c2pa instance with the WASM binary, and the reader class it is read through. Both come
// from the Content Authenticity Initiative (CAI) open-source SDK, which is imported
// dynamically so pages with no credentialed images never pay for the bundle.
let c2pa = null;
let Reader = null;

// Images are read concurrently, so the setup is memoised as a promise rather than by
// null-checking `c2pa`: that check is not atomic across an await, and every read racing
// it would spin up its own worker and WASM instance.
let c2paReady = null;

/**
 * Selector(s) for image elements that should display a CR pin if they have CR data.
 */
const CR_IMAGE_SELECTORS = [
  'body.article .image-wrapper picture > img',
  'body.article .side-by-side-image-wrapper picture > img',
  'body.article .default-content-wrapper picture > img',
].join(', ');

/**
 * Read content credentials of image element and return the manifest data if it exists.
 * @param {HTMLImageElement} img
 * @returns {Promise<object|false>} The image's active C2PA manifest, or false if none was found.
 */
const readCredentials = async (img) => {
  // Make sure image exists and has a `src` value.
  if (!img?.src) return false;

  // Load the SDK and create a c2pa instance with the WASM binary, once per page.
  // `import.meta.url` still resolves against this file, so the WASM sits alongside
  // the bundle either way.
  if (!c2paReady) {
    c2paReady = (async () => {
      const sdk = await import('../../deps/c2pa-web/index.js');
      Reader = sdk.Reader;
      c2pa = await sdk.createC2pa({
        wasmSrc: new URL('../../deps/c2pa-web/resources/c2pa_bg.wasm', import.meta.url).href,
      });
    })();
  }
  await c2paReady;

  // Fetch the image from its source.
  // Must use original image without optimized/resized parameters; resized versions
  // being returned do not currently include the manifest.
  const urlWithoutQueryParams = new URL(img.src);
  urlWithoutQueryParams.search = '';
  const response = await fetch(urlWithoutQueryParams.toString());

  // Read the response body as a Blob.
  const blob = await response.blob();

  // Create a c2pa reader.
  const reader = await Reader.fromBlob(c2pa, blob.type, blob);
  if (!reader) {
    return false;
  }

  // Read the manifest store from the fetched image.
  const activeManifest = await reader.activeManifest();

  // Free the reader to release WASM memory.
  await reader.free();

  return activeManifest;
};

/**
 * Training/mining assertion entries that express an AI opt-out, and the `use` values
 * that count as "do not train".
 */
const TRAINING_MINING_ENTRY_KEYS = [
  'cawg.ai_inference',
  'cawg.ai_generative_training',
  'c2pa.ai_inference',
  'c2pa.ai_generative_training',
];
const TRAINING_MINING_NOT_ALLOWED = ['notAllowed', 'constrained'];

/**
 * SVG icons.
 */
const CR_PIN_ICON = '<svg aria-label="View content credentials for this image" class="cr-pin-button__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" part="svg"><path fill="white" stroke="black" stroke-width="2.08" d="M1.54 12C1.54 5.94696 6.44696 1.04 12.5 1.04C18.553 1.04 23.46 5.94696 23.46 12V22.96H12.5C6.44696 22.96 1.54 18.053 1.54 12Z"></path><path fill="black" d="M9.61051 17.322C6.89755 17.322 5.20411 15.1966 5.20411 12.6737C5.20411 10.1508 6.89755 8.02536 9.61051 8.02536C11.8051 8.02536 13.2912 9.4596 13.6886 11.3258H11.4768C11.183 10.4964 10.4918 9.99528 9.61051 9.99528C8.24539 9.99528 7.34683 11.0666 7.34683 12.6737C7.34683 14.2807 8.24539 15.3521 9.61051 15.3521C10.5264 15.3521 11.2348 14.8164 11.5113 13.9351H13.7059C13.343 15.8532 11.8396 17.322 9.61051 17.322ZM14.5797 17.0801V8.26728H16.6533V9.21768C17.1372 8.57832 17.8975 8.1636 19.038 8.1636H19.5736V10.2026H19.0207C18.2431 10.2026 17.7592 10.3754 17.3964 10.7038C16.9816 11.0494 16.7397 11.6196 16.7397 12.4836V17.0801H14.5797Z"></path></svg>';
const VERIFIED_ICON = '<svg aria-label="Verified" class="cr-pin-popover__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.0004 18.749C9.67084 18.749 9.34125 18.6855 9.03461 18.5576C8.40033 18.2939 7.86518 17.8516 7.48578 17.2773C7.27728 17.0137 6.92426 16.8711 6.58099 16.9121C5.94378 17.0498 5.26068 16.9893 4.63275 16.7334C4.01654 16.4834 3.51849 15.9853 3.26703 15.3662C3.01215 14.7412 2.9516 14.0596 3.0932 13.3955C3.12982 13.0693 2.98041 12.709 2.70648 12.501C2.1596 12.1484 1.70892 11.6084 1.44134 10.9648C1.18646 10.3516 1.18646 9.64844 1.44183 9.03516C1.70892 8.39161 2.1596 7.85157 2.74505 7.47168C2.9804 7.29102 3.12982 6.93066 3.08734 6.58106C2.95209 5.94239 3.01166 5.26075 3.26654 4.63477C3.518 4.01563 4.01654 3.51758 4.63519 3.26661C5.26019 3.01368 5.94085 2.9502 6.60345 3.09278C6.92572 3.12598 7.27972 2.98536 7.4887 2.71973C7.86663 2.14746 8.40032 1.70606 9.03411 1.44141C9.64837 1.18848 10.351 1.18653 10.9643 1.44141C11.5971 1.70508 12.1293 2.14453 12.5073 2.71289C12.7143 2.98242 13.0703 3.13086 13.4184 3.08691C14.0576 2.95312 14.7387 3.01074 15.3666 3.26464C15.9838 3.51757 16.4814 4.01562 16.7328 4.63183C16.9882 5.26074 17.0483 5.94238 16.9067 6.60546C16.8705 6.9248 17.0151 7.27929 17.2807 7.48925C17.8534 7.86718 18.2949 8.40136 18.5585 9.03515C18.8134 9.64843 18.8134 10.3516 18.558 10.9648C18.2909 11.6084 17.8403 12.1484 17.2548 12.5283C17.0195 12.709 16.87 13.0693 16.9125 13.4189C17.0483 14.0596 16.9877 14.7412 16.7323 15.3672C16.4814 15.9853 15.9833 16.4834 15.3656 16.7344C14.7392 16.9902 14.0571 17.0498 13.393 16.9062C13.0663 16.8623 12.7074 17.0215 12.5019 17.293C12.4911 17.3076 12.4794 17.3213 12.4677 17.335C12.0619 17.9111 11.5566 18.3115 10.9643 18.5576C10.6581 18.6855 10.3295 18.749 10.0004 18.749ZM8.6933 16.3867C8.72357 16.4268 8.75043 16.4697 8.77191 16.5127C8.94427 16.7686 9.24847 17.0225 9.61078 17.1729C9.85834 17.2754 10.1406 17.2773 10.3881 17.1729C10.7514 17.0225 11.0556 16.7686 11.27 16.4385C11.2812 16.4219 11.2934 16.4043 11.3066 16.3867C11.833 15.6914 12.7011 15.3193 13.5883 15.4219C13.6132 15.4248 13.686 15.4346 13.7104 15.4395C14.0776 15.5195 14.4531 15.4854 14.8007 15.3447C15.0463 15.2451 15.2436 15.0478 15.3432 14.8018C15.4848 14.4541 15.518 14.0762 15.4399 13.708C15.4355 13.6895 15.4272 13.6279 15.4243 13.6094C15.3164 12.7188 15.685 11.8398 16.3852 11.3076C16.769 11.0557 17.0224 10.751 17.1728 10.3887C17.2758 10.1416 17.2758 9.8584 17.1733 9.61133C17.0224 9.24903 16.769 8.94434 16.4394 8.73145C16.4184 8.71778 16.3979 8.70313 16.3784 8.6875C15.6762 8.14062 15.3173 7.27148 15.4233 6.39941C15.4262 6.37793 15.435 6.31347 15.4399 6.29101C15.5185 5.92382 15.4848 5.54589 15.3432 5.19726C15.2436 4.95214 15.0458 4.7539 14.8012 4.65429C14.454 4.51367 14.0756 4.47851 13.7094 4.55956C13.6889 4.56347 13.6235 4.57323 13.603 4.57616C12.7187 4.67968 11.8486 4.31639 11.3178 3.62792C11.3002 3.60546 11.2836 3.583 11.2695 3.56151C11.0556 3.23143 10.7509 2.97753 10.3876 2.82616C10.1415 2.7246 9.85686 2.7246 9.61076 2.82616C9.24894 2.97753 8.94426 3.23143 8.73039 3.56151C8.70744 3.59667 8.68156 3.62987 8.65324 3.66112C8.0922 4.34178 7.24308 4.6826 6.39885 4.57616C6.37688 4.57421 6.31438 4.56444 6.29289 4.55956C5.92375 4.48144 5.54631 4.51561 5.19914 4.65624C4.95353 4.75585 4.75578 4.95409 4.65617 5.19921C4.51506 5.54687 4.48185 5.9248 4.55998 6.29198C4.56437 6.31053 4.57268 6.37206 4.5756 6.39061C4.68351 7.28123 4.31486 8.16014 3.61466 8.69237C3.23087 8.94432 2.97745 9.24901 2.82706 9.61132C2.72403 9.85839 2.72403 10.1416 2.82657 10.3887C2.97745 10.751 3.23087 11.0556 3.56046 11.2685C4.31485 11.8398 4.68351 12.7187 4.57657 13.6006C4.57364 13.622 4.56485 13.6865 4.55997 13.708C4.48185 14.0761 4.51505 14.4541 4.65616 14.8008C4.75626 15.0478 4.95352 15.2451 5.19766 15.3437C5.54776 15.4863 5.92422 15.5195 6.28946 15.4394C6.31632 15.4336 6.36466 15.4267 6.392 15.4248C7.28555 15.3183 8.16254 15.6855 8.6933 16.3867Z" fill="currentColor"></path><path d="M9.0375 13.3302C8.76406 13.3302 8.50479 13.2082 8.32949 12.9982L6.79336 11.1554C6.46768 10.7648 6.52041 10.1838 6.91152 9.8576C7.30166 9.53143 7.8832 9.58514 8.20937 9.97576L9.0165 10.9435L11.7768 7.43083C12.0907 7.03044 12.6698 6.96013 13.0707 7.27556C13.4711 7.59001 13.5404 8.16911 13.226 8.56951L9.7621 12.9777C9.59022 13.1965 9.32899 13.3254 9.05067 13.3302H9.0375Z" fill="currentColor"></path></svg>';

/**
 * Find an assertion in a manifest by its label.
 *
 * `Assertions` is a flat array of `{ label, data }`
 *
 * @param {object} manifest The active C2PA manifest.
 * @param {string} label Assertion label, in reverse domain format.
 * @returns {object|undefined} The assertion's `data`, if the assertion exists.
 */
const getAssertionData = (manifest, label) => (manifest?.assertions ?? [])
  .find((assertion) => assertion.label === label)?.data;

/**
 * CAWG verified identities, from the decoded `cawg.identity` assertion.
 *
 * The SDK decodes that assertion in place while reading, so its data is the identity
 * claims aggregation credential itself, with `verifiedIdentities` at the top level.
 *
 * @param {object} manifest The active C2PA manifest.
 * @returns {object[]} Verified identities, or an empty array.
 */
const getVerifiedIdentities = (manifest) => {
  const identities = getAssertionData(manifest, 'cawg.identity')?.verifiedIdentities;
  return Array.isArray(identities) ? identities.filter(Boolean) : [];
};

/**
 * Parse a claim generator string into a human-readable one, e.g.
 * `Adobe_Photoshop/23.3.1` becomes `Adobe Photoshop 23.3.1`.
 *
 * Ported from the legacy c2pa SDK's `parseGenerator`.
 *
 * @param {string} value The claim generator / software agent string.
 * @returns {string} The formatted generator string.
 */
const parseGenerator = (value) => {
  // Strip parentheses so that any version inside them does not influence the test below.
  let withoutParens = '';
  let depth = 0;
  [...value].forEach((character) => {
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    } else if (depth === 0) {
      withoutParens += character;
    }
  });

  // Old-style (XMP Agent) string: matches space + version.
  if (/\s+\d+\.\d(\.\d)*\s+/.test(withoutParens)) {
    return value.split('(')[0]?.trim();
  }

  // User-Agent string. The RFC uses a space as the separator, and `product/version`
  // within each item.
  const [product, version] = (withoutParens.split(/\s+/)?.[0] ?? '').split('/');
  const formattedProduct = product.replace(/_/g, ' ');

  return version ? `${formattedProduct} ${version}` : formattedProduct;
};

/**
 * The tool that recorded the credentials, e.g. "Adobe Content Authenticity".
 *
 * Prefer the first named claim generator info entry, and fall back to parsing the
 * claim generator string.
 *
 * @param {object} manifest The active C2PA manifest.
 * @returns {string|null}
 */
const getRecordedBy = (manifest) => {
  const claimGeneratorInfo = manifest?.claim_generator_info;
  const generatorName = (Array.isArray(claimGeneratorInfo) ? claimGeneratorInfo : [])
    .find((info) => info?.name)?.name;
  if (generatorName) return generatorName;

  return manifest?.claim_generator ? parseGenerator(manifest.claim_generator) : null;
};

/**
 * Reduce a manifest to the values the CR pin popover displays.
 *
 * @param {object} manifest The active C2PA manifest.
 * @returns {{
 *   recordedBy: string|null,
 *   authorName: string|null,
 *   nameIsVerified: boolean,
 *   socialAccounts: {provider: string, url: string|null, username: string, verified: boolean}[],
 *   doNotTrain: boolean,
 * }}
 */
const getManifestSummaryData = (manifest) => {
  const verifiedIdentities = getVerifiedIdentities(manifest);

  // Authors on the schema.org CreativeWork assertion. Those carrying an `@id` are
  // social accounts; the one without it is the producer. The assertion is signed but
  // otherwise unconstrained, so only trust entries that are actually objects.
  const authored = getAssertionData(manifest, 'stds.schema-org.CreativeWork')?.author;
  const authors = (Array.isArray(authored) ? authored : [])
    .filter((author) => author && typeof author === 'object');
  const producer = authors.find((author) => !('@id' in author)) ?? null;

  // A CAWG document verification supersedes the CreativeWork producer.
  const verifiedName = verifiedIdentities
    .find((identity) => identity.type === 'cawg.document_verification');

  // Verified social accounts replace the CreativeWork ones outright; they are not merged.
  const verifiedSocialAccounts = verifiedIdentities
    .filter((identity) => identity.type === 'cawg.social_media')
    .map((identity) => ({
      provider: identity.provider?.id ?? '',
      url: identity.uri ?? null,
      username: identity.username,
      verified: true,
    }));
  const authoredSocialAccounts = authors
    .filter((author) => '@id' in author)
    .map((author) => ({
      provider: author['@id'] ?? '',
      url: author['@id'] ?? null,
      username: author.name,
      verified: false,
    }));

  // The opt-out is recorded on either the CAWG or the C2PA training/mining assertion.
  const entries = getAssertionData(manifest, 'cawg.training-mining')?.entries
    ?? getAssertionData(manifest, 'c2pa.training-mining')?.entries
    ?? {};

  return {
    recordedBy: getRecordedBy(manifest),
    authorName: verifiedName?.name ?? producer?.name ?? null,
    // Only a CAWG document verification is vouched for; a CreativeWork producer is not.
    nameIsVerified: Boolean(verifiedName?.name),
    socialAccounts: verifiedSocialAccounts.length
      ? verifiedSocialAccounts
      : authoredSocialAccounts,
    doNotTrain: TRAINING_MINING_ENTRY_KEYS
      .some((key) => TRAINING_MINING_NOT_ALLOWED.includes(entries[key]?.use)),
  };
};

/**
 * Adds a "CR" pin button to the image's pin wrapper. The button uses the native Popover API
 * to toggle a panel that displays the image's content credentials data and an inspect button.

 * @param {HTMLElement} pinWrapper The wrapper element to append the button to.
 * @param {object} manifest The image's active C2PA manifest.
 */
const buildCRPinPopoverComponent = (pinWrapper, manifest) => {
  const popoverId = `cr-popover-${crypto.randomUUID()}`;
  const groupClass = 'cr-pin-popover__group';
  const itemClass = 'cr-pin-popover__item';

  // CR pin button that toggles the popover.
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('cr-pin-button');
  button.setAttribute('popovertarget', popoverId);
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', popoverId);
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = CR_PIN_ICON;

  // Popover (container/content).
  const popover = document.createElement('div');
  popover.id = popoverId;
  popover.classList.add('cr-pin-popover');
  popover.setAttribute('popover', 'auto');
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Content credentials');
  popover.innerHTML = '<div class="cr-pin-popover__group"><h3 class="cr-pin-popover__heading">Content Credentials</h3></div>';

  // Build groups of items based on the CR data in the manifest.
  // Manifest values are third-party data: always set them as text, never as markup.
  const {
    recordedBy, authorName, nameIsVerified, socialAccounts, doNotTrain,
  } = getManifestSummaryData(manifest);

  // The tool that recorded the credentials, alongside the heading.
  if (recordedBy) {
    const subheading = document.createElement('p');
    subheading.classList.add('cr-pin-popover__subheading');
    subheading.textContent = `Recorded by ${recordedBy}`;
    popover.firstElementChild.append(subheading);
  }

  /**
   * Group holding the name of the credential's author and followed by the
   * verified badge when an identity provider vouched for that name.
   *
   * @returns {HTMLElement|null} The group, or null when the manifest names no author.
   */
  const buildCredentialName = () => {
    if (!authorName) return null;

    const group = document.createElement('div');
    group.classList.add(groupClass);
    const item = document.createElement('div');
    item.classList.add(itemClass, `${itemClass}--name`);
    group.append(item);

    const label = document.createElement('span');
    label.classList.add('cr-pin-popover__label');
    label.textContent = 'Name ';

    const nameText = document.createElement('span');
    nameText.classList.add('cr-pin-popover__name');
    nameText.textContent = authorName;

    item.append(label, nameText);

    // The badge is only truthful for a name an identity provider vouched for.
    if (nameIsVerified) {
      const verifiedIcon = document.createElement('span');
      verifiedIcon.classList.add('cr-pin-popover__verified');
      verifiedIcon.innerHTML = VERIFIED_ICON;
      item.append(verifiedIcon);
    }

    return group;
  };

  /**
   * Group listing the author's connected social accounts. Each account links out when
   * its URL is a usable http(s) one, and is plain text otherwise.
   *
   * @returns {HTMLElement|null} The list, or null when there is no account to show.
   */
  const buildCredentialSocials = () => {
    if (!socialAccounts.length) return null;

    const list = document.createElement('ul');
    list.classList.add(groupClass, 'cr-pin-popover__socials');

    // Append each social account.
    socialAccounts.forEach(({ username, url }) => {
      if (!username) return;

      const listItem = document.createElement('li');
      listItem.classList.add(itemClass, `${itemClass}--social`);
      const accountUrl = toSafeHttpUrl(url);

      if (accountUrl) {
        const link = document.createElement('a');
        link.href = accountUrl;
        link.textContent = username;
        listItem.append(link);
      } else {
        listItem.textContent = username;
      }

      list.append(listItem);
    });

    if (!list.children.length) return null;
    return list;
  };

  /**
   * Group holding the rights and usage notice: the author's opt-out of generative AI
   * training and use.
   *
   * @returns {HTMLElement|null} The group, or null when the author did not opt out.
   */
  const buildCredentialAiNotice = () => {
    if (!doNotTrain) return null;

    const group = document.createElement('div');
    group.classList.add(groupClass);
    const item = document.createElement('div');
    item.classList.add(itemClass, `${itemClass}--ai-notice`);
    group.append(item);

    const notice = document.createElement('p');
    notice.textContent = 'I request that generative AI models not train on or use my content.';
    item.append(notice);

    return group;
  };

  // Only append the groups that have something to show.
  popover.append(...[
    buildCredentialName(),
    buildCredentialSocials(),
    buildCredentialAiNotice(),
  ].filter(Boolean));

  // Keep `aria-expanded` in sync with the popover's open/closed state, including when it
  // is closed via light-dismiss (an outside click or Escape key).
  popover.addEventListener('toggle', (event) => {
    button.setAttribute('aria-expanded', event.newState === 'open' ? 'true' : 'false');
  });

  // Append the CR pin and its popover.
  pinWrapper.append(button, popover);
};

/**
 * Find the page's matching images, read their CR data, and give every image that has a
 * manifest a wrapped `picture` carrying the CR pin and its popover. Images without
 * credentials are left untouched.
 *
 * @param {string} crImageSelector Selector matching the images to read.
 * @returns {Promise<void>} Resolves once every image has been read.
 */
const addContentCredentials = async (crImageSelector) => {
  // Get the image element(s) from the page. Bailing here is what keeps a page with no
  // candidate images from ever loading the c2pa bundle or its WASM.
  const images = document.querySelectorAll(crImageSelector);
  if (!images.length) {
    return;
  }

  // Find all relevant images in the DOM and read their credentials.
  // If there is CR data, give it a wrapper and add the pin with its data.
  // Awaited as a whole so the c2pa instance is not disposed while reads are in flight.
  await Promise.all([...images].map(async (img) => {
    // Get CR data.
    const activeManifest = await readCredentials(img);
    if (!activeManifest) return;

    // Give the picture element a wrapper, for positioning the CR pin on top of it.
    const picture = img.closest('picture');
    if (!picture) return;

    const crPinWrapper = document.createElement('span');
    crPinWrapper.classList.add('cr-pin-image');
    picture.before(crPinWrapper);
    crPinWrapper.append(picture);
    buildCRPinPopoverComponent(crPinWrapper, activeManifest);
  }));
};

/**
 * Add content credentials to every relevant image on the page.
 *
 * Errors are caught so a failed read never breaks the page, and the c2pa instance is
 * always disposed of, releasing the worker and its WASM memory.
 *
 * @returns {Promise<void>} Resolves once the page has been processed.
 */
export default async function initContentCredentials() {
  try {
    await addContentCredentials(CR_IMAGE_SELECTORS);
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('Error reading C2PA data:', error);
  } finally {
    if (c2pa) {
      c2pa.dispose();
      c2pa = null;
    }
    // Cleared alongside the instance so a later call sets up a fresh one, rather than
    // resolving against the memoised promise for the disposed instance.
    c2paReady = null;
  }
}
