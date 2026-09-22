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
 * The c2pa-web library is vendored locally under scripts/vendor/c2pa-web/ (see the
 * "build:c2pa" npm script) rather than loaded from a CDN, since this project has no
 * build/bundler step. Run `npm run build:c2pa` after bumping the version in package.json.
 */

// TODO: remove once this prototype's debug logging is cleaned up for production.
/* eslint-disable no-console */

// Import the Content Authenticity Initiative (CAI) open-source SDK.
import { createC2pa, Reader } from '../../deps/c2pa-web/index.js';

// c2pa instance with the WASM binary.
let c2pa = null;

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

  // Create a c2pa instance with the WASM binary, if it has not been created yet.
  if (!c2pa) {
    c2pa = await createC2pa({
      wasmSrc: new URL('../../deps/c2pa-web/resources/c2pa_bg.wasm', import.meta.url).href,
    });
  }

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
    console.log(`No C2PA manifest found on: ${urlWithoutQueryParams}`);
    return false;
  }
  console.log(`Found a CR manifest on: ${urlWithoutQueryParams}`);

  // Read the manifest store from the fetched image.
  const activeManifest = await reader.activeManifest();

  // Free the reader to release WASM memory.
  await reader.free();

  return activeManifest;
};

/**
 * Adds a "CR" pin button to the image's pin wrapper. The button uses the native Popover API
 * to toggle a panel that displays the image's content credentials data and an inspect button.

 * @param {HTMLElement} pinWrapper The wrapper element to append the button to.
 */
const buildCRPinPopoverComponent = (pinWrapper) => {
  const popoverId = `cr-popover-${crypto.randomUUID()}`;
  const groupClass = 'cr-pin-popover__group';
  const itemClass = 'cr-pin-button__item';

  // CR pin button that toggles the popover.
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('cr-pin-button');
  button.setAttribute('popovertarget', popoverId);
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', popoverId);
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<svg aria-label="View content credentials for this image" class="cr-pin-button__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" part="svg"><path fill="white" stroke="black" stroke-width="2.08" d="M1.54 12C1.54 5.94696 6.44696 1.04 12.5 1.04C18.553 1.04 23.46 5.94696 23.46 12V22.96H12.5C6.44696 22.96 1.54 18.053 1.54 12Z"></path><path fill="black" d="M9.61051 17.322C6.89755 17.322 5.20411 15.1966 5.20411 12.6737C5.20411 10.1508 6.89755 8.02536 9.61051 8.02536C11.8051 8.02536 13.2912 9.4596 13.6886 11.3258H11.4768C11.183 10.4964 10.4918 9.99528 9.61051 9.99528C8.24539 9.99528 7.34683 11.0666 7.34683 12.6737C7.34683 14.2807 8.24539 15.3521 9.61051 15.3521C10.5264 15.3521 11.2348 14.8164 11.5113 13.9351H13.7059C13.343 15.8532 11.8396 17.322 9.61051 17.322ZM14.5797 17.0801V8.26728H16.6533V9.21768C17.1372 8.57832 17.8975 8.1636 19.038 8.1636H19.5736V10.2026H19.0207C18.2431 10.2026 17.7592 10.3754 17.3964 10.7038C16.9816 11.0494 16.7397 11.6196 16.7397 12.4836V17.0801H14.5797Z"></path></svg>';

  // Popover (container/content).
  const popover = document.createElement('div');
  popover.id = popoverId;
  popover.classList.add('cr-pin-popover');
  popover.setAttribute('popover', 'auto');
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Content credentials');
  popover.innerHTML = '<div class="cr-pin-popover__group"><h3 class="cr-pin-popover__heading">Content Credentials</h3><p class="cr-pin-popover__subheading">Recorded by Adobe Content Authenticity</p></div>';

  // Build groups of items based on the CR data in the manifest.
  const buildCredentialName = () => {
    const group = document.createElement('div');
    group.classList.add(groupClass);

    const item = document.createElement('div');
    item.classList.add(itemClass, `${itemClass}--name`);
    group.append(item);

    return group;
  };

  const buildCredentialSocials = () => {
    const group = document.createElement('div');
    group.classList.add(groupClass);

    const item = document.createElement('div');
    item.classList.add(itemClass, `${itemClass}--socials`);
    group.append(item);

    return group;
  };

  const buildCredentialAiNotice = () => {
    const group = document.createElement('div');
    group.classList.add(groupClass);

    const item = document.createElement('div');
    item.classList.add(itemClass, `${itemClass}--ai-notice`);
    group.append(item);

    return group;
  };

  const itemName = buildCredentialName();
  const itemSocials = buildCredentialSocials();
  const itemAiNotice = buildCredentialAiNotice();
  popover.append(itemName, itemSocials, itemAiNotice);

  // Keep `aria-expanded` in sync with the popover's open/closed state, including when it
  // is closed via light-dismiss (an outside click or Escape key).
  popover.addEventListener('toggle', (event) => {
    button.setAttribute('aria-expanded', event.newState === 'open' ? 'true' : 'false');
  });

  // Append the CR pin and its popover.
  pinWrapper.append(button, popover);
};

/**
 * Find and read images on the page, and read their CR data.
 */
const addContentCredentials = async (crImageSelector) => {
  // Get the image element(s) from the page
  const images = document.querySelectorAll(crImageSelector);
  if (!images) {
    return;
  }

  // Find all relevant images in the DOM and read their credentials.
  // If there is CR data, give it a wrapper and add the pin with its data.
  images.forEach((img) => {
    // Get CR data.
    const activeManifest = readCredentials(img);
    if (!activeManifest) return;

    // Give the picture element a wrapper, for positioning the CR pin on top of it.
    const picture = img.closest('picture');
    if (!picture) return;

    const crPinWrapper = document.createElement('span');
    crPinWrapper.classList.add('cr-pin-image');
    picture.before(crPinWrapper);
    crPinWrapper.append(picture);
    buildCRPinPopoverComponent(crPinWrapper);
  });
};

// Run on import for all relevant images.
try {
  await addContentCredentials(CR_IMAGE_SELECTORS);
} catch (error) {
  console.error('Error reading C2PA data:', error);
} finally {
  if (c2pa) {
    c2pa.dispose();
  }
}
