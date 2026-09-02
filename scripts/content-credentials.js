/**
 * Content Credentials / Content Authenticity
 *
 * - Reads content credentials data from signed images, using the open source c2pa-web library.
 * - Adds a "CR" button to the image if it has credentials.
 * - The button is a component that toggles a popover displaying the image data.
 *
 * Intended to run on deferred / delayed load due to the library size, processing time,
 * and its lower priority for the intial page render.
 *
 * The c2pa-web library is vendored locally under scripts/vendor/c2pa-web/ (see the
 * "vendor:c2pa" npm script) rather than loaded from a CDN, since this project has no
 * build/bundler step. Run `npm run vendor:c2pa` after bumping the version in package.json.
 */

// TODO: remove once this prototype's debug logging is cleaned up for production.
/* eslint-disable no-console */

// Import the Content Authenticity Initiative (CAI) open-source SDK.
import { createC2pa } from './vendor/c2pa-web/index.js';

// c2pa instance with the WASM binary.
let c2pa = null;

/**
 * Selector(s) for image elements that should be checked for CR data.
 */
const CR_IMAGE_SELECTOR = 'main picture > img';

/**
 * Read content credentials of image element.
 * @param {HTMLImageElement} img
 * @returns
 */
const readCredentials = async (img) => {
  if (!img?.src) return false;

  // Create a c2pa instance with the WASM binary.
  if (!c2pa) {
    c2pa = await createC2pa({
      wasmSrc: new URL('./vendor/c2pa-web/resources/c2pa_bg.wasm', import.meta.url).href,
    });
  }

  // Fetch the image from its source.
  // Must use original image without optimized/resized parameters; resized versions
  // don't have the CR!
  const urlWithoutQueryParams = new URL(img.src);
  urlWithoutQueryParams.search = '';
  const response = await fetch(urlWithoutQueryParams.toString());

  // Read the response body as a Blob.
  const blob = await response.blob();

  // Create a c2pa reader.
  const reader = await c2pa.reader.fromBlob(blob.type, blob);
  if (!reader) {
    console.log(`No C2PA manifest found on: ${img.src}`);
    return false;
  }
  console.log(`Found a CR manifest on: ${img.src}`);

  // Read the manifest store from the fetched image.
  const manifestStore = await reader.manifestStore();
  console.log(JSON.stringify(manifestStore, null, 2));

  const active = await reader.activeManifest();
  console.log('Active title:', active.title);

  // Free the reader to release WASM memory.
  await reader.free();
  return true;
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
  images.forEach((img) => {
    img.closest('picture').setAttribute('style', 'display:block; border:1px solid hotpink;');
    console.log(`reading ${img.src}`);
    readCredentials(img);
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
  await addContentCredentials(CR_IMAGE_SELECTOR);
} catch (error) {
  console.error('Error reading C2PA data:', error);
} finally {
  if (c2pa) {
    c2pa.dispose();
  }
}
