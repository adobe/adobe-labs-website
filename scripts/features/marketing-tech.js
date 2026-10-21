/**
 * Adobe marketingtech: loads Adobe Experience Platform scripts.
 *
 * Note about integration with privacy library and cookie consent (consent-check.js):
 * As long as the privacy-standalone.js script is implemented, nothing additional is needed to
 * handle the marketingtech script's consent or checking cookie groups. Internally in
 * Adobe Launch/Tags code, it checks for all of that and listens for any changes in consent.
 *
 * Usage:
 * - Run from `loadDelayed()`, after the Privacy library has started loading. The Launch property
 *   reads the visitor's cookie consent from the Privacy library events.
 * - Must run after the `default` Trusted Types policy exists (created in scripts.js).
 */

import { loadScript } from '../aem.js';
import { PRODUCTION_HOSTS } from '../utils/utils.js';

/**
 * Adobe marketingtech "bootstrap" script.
 */
const MARKETING_TECH_URL = 'https://www.adobe.com/marketingtech/main.standard.min.js';

/**
 * Launch library URL and Edge (datastream) configuration ID for each environment.
 */
const ENVIRONMENTS = {
  development: {
    launchURL: 'https://assets.adobedtm.com/d4d114c60e50/a0e989131fd5/launch-2c94beadc94f-development.min.js',
    edgeConfigId: '3a30d55c-d57d-4851-af18-634780f03357',
  },
  production: {
    launchURL: 'https://assets.adobedtm.com/d4d114c60e50/a0e989131fd5/launch-5dd5dd2177e6.min.js',
    edgeConfigId: '913eac4d-900b-45e8-9ee7-306216765cd2',
  },
};

/**
 * Set initial data in the alloy_all data object, exactly per integration documentation.
 */
/* eslint-disable no-underscore-dangle, max-len */
const setAlloyData = () => {
  window.alloy_all = window.alloy_all || {};
  window.alloy_all.data = window.alloy_all.data || {};
  window.alloy_all.data._adobe_corpnew = window.alloy_all.data._adobe_corpnew || {};
  window.alloy_all.data._adobe_corpnew.digitalData = window.alloy_all.data._adobe_corpnew.digitalData || {};
  window.alloy_all.data._adobe_corpnew.digitalData.page = window.alloy_all.data._adobe_corpnew.digitalData.page || {};
  window.alloy_all.data._adobe_corpnew.digitalData.page.pageInfo = window.alloy_all.data._adobe_corpnew.digitalData.page.pageInfo || {};
  window.alloy_all.data._adobe_corpnew.digitalData.page.pageInfo.language = 'en-US';
};
/* eslint-enable no-underscore-dangle, max-len */

/**
 * Set the marketingtech flags read by the bootstrap script.
 */
const setMarketingTechConfig = () => {
  const environment = PRODUCTION_HOSTS.has(window.location.hostname)
    ? ENVIRONMENTS.production
    : ENVIRONMENTS.development;

  window.marketingtech = {
    adobe: {
      launch: {
        url: environment.launchURL,
        // When `true`, the pageload call must be fired manually with `_satellite.track('pageload')`
        controlPageLoad: false,
      },
      alloy: {
        edgeConfigId: environment.edgeConfigId,
      },
      target: false,
      audienceManager: false,
      skipIMS: true,
    },
    marketingTags: {
      disableGlobalTags: true,
      disableContentsquare: true,
    },
  };
};

/**
 * Configure and load Adobe Experience Platform (marketingtech) scripts.
 * Run once on page load.
 */
const loadMarketingTech = () => {
  setAlloyData();
  setMarketingTechConfig();
  return loadScript(MARKETING_TECH_URL);
};

export default loadMarketingTech;
