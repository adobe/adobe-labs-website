/**
 * Integration with Adobe CMP (Consent Management Platform).
 *
 * Adobe's CMP is used by Adobe web properties to provide end users and site visitors notice,
 * transparency, and choice around Adobe’s usage of cookies, web trackers, and other similar
 * technologies as they visit, navigate, and use the site.
 *
 * Usage:
 * - For scripts that save cookies and are tied to the cookie consent preferences, only load
 *   or use them when allowed, after the appropriate cookie group check.
 */

import { loadScript } from '../aem.js';
import { PRODUCTION_HOSTS } from '../utils/utils.js';

/**
 * Adobe Standalone Privacy library.
 */
const PRIVACY_LIBRARY_URL = 'https://www.adobe.com/etc.clientlibs/globalnav/clientlibs/base/privacy-standalone.js';

/**
 * "Represents the unique domain ID that holds all info regarding cookies, and applicable
 * settings." Adobe Labs uses the adobe.com ID, per wiki documentation.
 */
const DOMAIN_ID = {
  test: '7a5eb705-95ed-4cc4-a11d-0cc5760e93db-test',
  production: '7a5eb705-95ed-4cc4-a11d-0cc5760e93db',
};

// "CSS selector for the DOM element that should act as a button to show the Preference
// Center. Clicking on the button will prompt the user with a modal to update the consent.
// NOTE: the code will also populate the DOM element with the correct text."
const FOOTER_LINK_SELECTOR = '#cmp-cookie-preferences';

/**
 * Initialize and load the Privacy library.
 *
 * Run once on page load.
 * Intended for delayed/deferred loading after other high priority scripts.
 */
const initPrivacyLibrary = () => {
  /**
   * Set CMP Configuration.
   *
   * "Before loading the library, a configuration object must be provided that instructs the CMP to
   * load the correct settings for this domain."
   */
  window.fedsConfig = {
    privacy: {
      // Unique domain ID that holds cookie settings.
      otDomainId: PRODUCTION_HOSTS.has(window.location.hostname)
        ? DOMAIN_ID.production
        : DOMAIN_ID.test,
      // Selector for DOM element that will open the preference center.
      footerLinkSelector: FOOTER_LINK_SELECTOR,
      // Force use of HTML defined language, instead of using the default browser preferred locale.
      documentLanguage: false,
    },
  };

  // Load the Privacy library script. It's a classic (non-module) script served without CORS
  // headers, so it must be loaded with a <script> tag rather than import().
  loadScript(PRIVACY_LIBRARY_URL)
    .catch((error) => {
      /* eslint-disable-next-line no-console */
      console.error('The Adobe Privacy library encountered an error while trying to initialize:', error);
    });
};

export default initPrivacyLibrary;
