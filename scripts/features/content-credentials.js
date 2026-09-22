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
  });
};

/**
 * Adds a "CR" button to the image. The button is a component that toggles a popover
 * displaying the image data.
 */
// eslint-disable-next-line no-unused-vars
const buildComponent = (imageElement, crData) => {
  throw new Error('Not Implemented Exception');
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
