/**
 * Newsletter form. Authors use an `email-collection (mailing-list)` table
 * plus section metadata (`email`, `mps-sname`, `subscription-name`, `sign-in`).
 * Consent copy and field errors come from federal content.
 */
import { loadScript } from '../../scripts/aem.js';

const FEDERAL_ROOT = 'https://main--federal--adobecom.aem.page/federal/email-collection';
const IMS_LIB = 'https://auth.services.adobe.com/imslib/imslib.min.js';
const IMS_CLIENT_ID = 'spectrumhub';
const API = {
  stage: 'https://www.stage.adobe.com/milo-email-collection-api',
  prod: 'https://www.adobe.com/milo-email-collection-api',
};
const FALLBACK_PLACEHOLDERS = {
  required: 'This field is required.',
  email: 'Enter a valid email.',
};
const FALLBACK_CONSENT_ID = 'cs4;ve1;en';
const FALLBACK_CONSENT_HTML = '<p>The <a href="https://www.adobe.com/privacy/policy.html#info-share">Adobe family of companies</a> may keep me informed with <a href="https://www.adobe.com/privacy/marketing.html#mktg-email">personalized</a> emails about {{subscription-name}}. See our <a href="https://www.adobe.com/privacy/policy.html">Privacy Policy</a> for more details or to opt-out at any time.</p>';
const EMAIL_PATTERN = /^[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}\p{N}-]{2,}$/u;

let fieldSeq = 0;

/**
 * @returns {boolean} True on localhost and AEM preview hosts
 */
function isNonProd() {
  const { hostname } = window.location;
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname.endsWith('.aem.page')
    || hostname.endsWith('.aem.live')
    || hostname.endsWith('.hlx.page')
    || hostname.endsWith('.hlx.live');
}

/**
 * Submit diagnostics. Filter the console for `[email-collection]`.
 * Never log the address or the bearer token.
 * @param {string} step
 * @param {unknown} [detail]
 * @returns {void}
 */
function reportFailure(step, detail) {
  if (detail === undefined) console.error('[email-collection]', step);
  else console.error('[email-collection]', step, detail);
}

/**
 * @param {string} step
 * @param {unknown} [detail]
 * @returns {void}
 */
function reportStep(step, detail) {
  if (!isNonProd()) return;
  if (detail === undefined) console.info('[email-collection]', step);
  else console.info('[email-collection]', step, detail);
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

/**
 * @param {string} value Label, or `Label | Placeholder`
 * @returns {{ label: string, placeholder: string }}
 */
function splitField(value) {
  const [label, placeholder] = String(value || '').split('|');
  return {
    label: label.trim(),
    placeholder: placeholder?.trim() || '',
  };
}

/**
 * @param {HTMLAnchorElement} anchor
 * @returns {string} Hash without `#`, or `''`
 */
function linkHash(anchor) {
  try {
    return new URL(anchor.getAttribute('href'), window.location.href).hash.replace(/^#/, '');
  } catch {
    return '';
  }
}

/**
 * @param {Element} row Authored block row
 * @returns {Element} The row's content cell
 */
function rowCell(row) {
  const cell = row.querySelector(':scope > div') || row;
  cell.classList.add('email-collection__content');
  return cell;
}

/**
 * @param {Element} root
 * @param {string} hash
 * @returns {HTMLAnchorElement|undefined}
 */
function findHashLink(root, hash) {
  return [...root.querySelectorAll('a[href]')].find((anchor) => linkHash(anchor) === hash);
}

/**
 * @param {HTMLAnchorElement} anchor
 * @param {'submit'|'button'} type
 * @returns {HTMLButtonElement}
 */
function replaceWithButton(anchor, type) {
  const button = document.createElement('button');
  button.type = type;
  button.className = anchor.className;
  button.textContent = anchor.textContent.trim();
  anchor.replaceWith(button);
  return button;
}

/**
 * Section metadata is already on `section.dataset` when decorate runs.
 * @param {Element} block
 * @returns {{ fields: { email?: string, country?: string }, mpsSname: string,
 *   subscriptionName: string, signIn: string, consentId: string,
 *   runtimeEndpoint: string }}
 */
function readConfig(block) {
  const data = block.closest('.section')?.dataset || {};
  const fields = {};
  if (data.email) fields.email = data.email;
  if (data.country) fields.country = data.country;
  return {
    fields,
    mpsSname: data.mpsSname || '',
    subscriptionName: data.subscriptionName || '',
    signIn: data.signIn || '',
    consentId: data.consentId || '',
    runtimeEndpoint: data.runtimeEndpoint || '',
  };
}

/**
 * @param {ReturnType<typeof readConfig>} config
 * @returns {boolean}
 */
function hasRequiredConfig(config) {
  return Boolean(config.fields.email && config.mpsSname
    && (config.subscriptionName || config.consentId));
}

/**
 * @returns {Promise<Record<string, string>>}
 */
async function fetchPlaceholders() {
  try {
    const resp = await fetch(`${FEDERAL_ROOT}/form-config.json?sheet=placeholders`);
    if (!resp.ok) return { ...FALLBACK_PLACEHOLDERS };
    const { data } = await resp.json();
    const placeholders = { ...FALLBACK_PLACEHOLDERS };
    data.forEach(({ key, value }) => {
      if (key && value) placeholders[key] = value;
    });
    return placeholders;
  } catch {
    return { ...FALLBACK_PLACEHOLDERS };
  }
}

/**
 * @param {string} consentKey Filename key such as `cs4`. Empty uses the default.
 * @param {string} subscriptionName Injected into `{{subscription-name}}`
 * @returns {Promise<{ consentId: string, node: Element }>}
 */
async function fetchConsent(consentKey, subscriptionName) {
  const id = (consentKey || 'cs4').toLowerCase();
  const applyName = (html) => html.replaceAll(
    '{{subscription-name}}',
    escapeHtml(subscriptionName),
  );
  try {
    const resp = await fetch(`${FEDERAL_ROOT}/consents/${encodeURIComponent(id)}.plain.html`);
    if (!resp.ok) throw new Error('consent');
    const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    const [consentDiv, idDiv] = doc.querySelectorAll('body > div');
    if (!consentDiv) throw new Error('consent');
    consentDiv.innerHTML = applyName(consentDiv.innerHTML);
    return {
      consentId: idDiv?.textContent.trim() || FALLBACK_CONSENT_ID,
      node: consentDiv,
    };
  } catch {
    const node = document.createElement('div');
    node.innerHTML = applyName(FALLBACK_CONSENT_HTML);
    return { consentId: FALLBACK_CONSENT_ID, node };
  }
}

/**
 * @returns {Promise<{ key: string, value: string }[]>}
 */
async function fetchCountries() {
  try {
    const resp = await fetch(`${FEDERAL_ROOT}/form-config.json?sheet=countries`);
    if (!resp.ok) return [];
    const { data } = await resp.json();
    return data.filter((row) => row.key && row.value);
  } catch {
    return [];
  }
}

/**
 * @typedef {object} ImsToken
 * @property {string} [token] Guest access token
 */

/**
 * @typedef {object} ImsGuestClient
 * @property {function(): (ImsToken|Promise<ImsToken>)} getAccessToken
 */

/**
 * @param {unknown} value Token object from IMS, or a raw token string
 * @returns {string}
 */
function accessTokenValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'token' in value) return value.token || '';
  return '';
}

/**
 * @param {ImsGuestClient|undefined} ims
 * @returns {Promise<string>}
 */
function readStoredToken(ims) {
  try {
    const result = ims?.getAccessToken?.();
    if (result && typeof result.then === 'function') {
      return result.then(accessTokenValue).catch(() => '');
    }
    return Promise.resolve(accessTokenValue(result));
  } catch {
    return Promise.resolve('');
  }
}

/**
 * IMS wraps a failed guest `checkToken` as an expired-token exception.
 * @param {unknown} error
 * @returns {Record<string, unknown>}
 */
function imsErrorDetail(error) {
  const source = error && typeof error === 'object' && 'exception' in error
    ? error.exception
    : error;
  if (!source) return { message: 'no details' };
  if (typeof source === 'string') return { message: source };
  if (source instanceof Error) return { message: source.message };
  if (typeof source === 'object') {
    const {
      message,
      error: code,
      error_description: description,
      status,
      statusCode,
      data,
    } = source;
    return {
      message: message || description || code,
      status: status || statusCode,
      error: code,
      data: typeof data === 'string' ? data.slice(0, 300) : data,
    };
  }
  return { message: String(source) };
}

/**
 * @param {string} clientId
 * @returns {Promise<string>}
 */
function requestGuestToken(clientId) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout;

    /**
     * @param {string} token
     * @returns {void}
     */
    function succeed(token) {
      if (settled || !token) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(token);
    }

    /**
     * @param {Error} error
     * @returns {void}
     */
    function fail(error) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      reject(error);
    }

    timeout = window.setTimeout(() => {
      reportFailure('IMS timed out before a guest token', {
        clientId,
        environment: isNonProd() ? 'stg1' : 'prod',
      });
      fail(new Error('IMS timeout'));
    }, 8000);

    const environment = isNonProd() ? 'stg1' : 'prod';
    let refusal = null;

    /**
     * @param {unknown} [hint] Token from `onAccessToken`, if IMS passed one
     * @returns {void}
     */
    function consider(hint) {
      const hinted = accessTokenValue(hint);
      if (hinted) {
        reportStep('IMS onAccessToken', { token: true });
        succeed(hinted);
        return;
      }
      readStoredToken(window.adobeIMS).then((token) => {
        if (token) {
          reportStep('IMS onAccessToken', { token: true });
          succeed(token);
          return;
        }
        reportStep('IMS onAccessToken', { token: false });
      });
    }

    window.adobeid = {
      client_id: clientId,
      scope: 'AdobeID,openid',
      locale: 'en_US',
      environment,
      useLocalStorage: false,
      autoValidateToken: true,
      logsEnabled: isNonProd(),
      enableGuestAccounts: true,
      enableGuestTokenForceRefresh: true,
      enableGuestBotDetection: true,
      guestBotDetectionProvider: 'bfp',
      api_parameters: { check_token: { guest_allowed: true } },
      onAccessToken: consider,
      onAccessTokenHasExpired: (error) => {
        refusal = imsErrorDetail(error);
        reportFailure('IMS refused a guest token', { clientId, environment, ...refusal });
      },
      onReady: () => {
        if (!window.adobeIMS) {
          reportFailure('IMS onReady without adobeIMS');
          fail(new Error('IMS unavailable'));
          return;
        }
        readStoredToken(window.adobeIMS).then((token) => {
          if (token) {
            reportStep('IMS onReady', { token: true });
            succeed(token);
            return;
          }
          if (!refusal) {
            reportFailure('IMS onReady without a guest token', {
              clientId,
              environment,
              hint: 'This client did not return a guest access token. It has to be onboarded for guest tokens in this IMS environment.',
            });
          }
          fail(new Error('IMS did not return a guest token'));
        });
      },
      onError: (...args) => {
        reportFailure('IMS onError', args);
        fail(new Error('IMS error'));
      },
    };
    reportStep('loading IMS', {
      clientId,
      environment: window.adobeid.environment,
    });
    loadScript(IMS_LIB).catch((error) => {
      reportFailure('IMS script failed to load', error);
      fail(error);
    });
  });
}

/**
 * Loads Adobe IMS and resolves with a guest access token.
 * A guest token arrives in `onAccessToken` before `onReady`. If startup
 * finishes without one, IMS already refused the client.
 * @param {string} clientId IMS client id
 * @returns {Promise<string>}
 */
function loadImsGuest(clientId) {
  const existing = window.adobeIMS;
  if (existing?.getAccessToken) {
    return readStoredToken(existing).then((token) => token || requestGuestToken(clientId));
  }
  return requestGuestToken(clientId);
}

/**
 * @param {string} name
 * @returns {string}
 */
function nextFieldId(name) {
  fieldSeq += 1;
  return `email-collection-${name}-${fieldSeq}`;
}

/**
 * Visible asterisk only. The `required` attribute carries the accessible name.
 * @param {string} id
 * @param {string} labelText
 * @returns {HTMLLabelElement}
 */
function buildLabel(id, labelText) {
  const label = document.createElement('label');
  label.className = 'email-collection__label';
  label.htmlFor = id;
  label.append(document.createTextNode(labelText));
  const required = document.createElement('span');
  required.className = 'email-collection__required';
  required.setAttribute('aria-hidden', 'true');
  required.textContent = ' *';
  label.append(required);
  return label;
}

/**
 * @param {HTMLInputElement|HTMLSelectElement} control
 * @param {Record<string, string>} placeholders
 * @returns {boolean} True when the control is valid
 */
function applyFieldError(control, placeholders) {
  const field = control.closest('.email-collection__field');
  const error = field?.querySelector('.email-collection__error');
  const value = control.value.trim();
  let message = '';
  if (!value) message = placeholders.required;
  else if (control instanceof HTMLInputElement && control.type === 'email' && !EMAIL_PATTERN.test(value)) {
    message = placeholders.email;
  }
  if (error) {
    error.textContent = message;
    error.hidden = !message;
  }
  if (message) {
    control.setAttribute('aria-invalid', 'true');
    if (error) control.setAttribute('aria-describedby', error.id);
    return false;
  }
  control.removeAttribute('aria-invalid');
  control.removeAttribute('aria-describedby');
  return true;
}

/**
 * @param {string} id
 * @param {string} labelText
 * @param {string} [placeholder]
 * @returns {{ field: HTMLDivElement, control: HTMLInputElement, error: HTMLParagraphElement }}
 */
function buildEmailField(id, labelText, placeholder) {
  const field = document.createElement('div');
  field.className = 'email-collection__field';
  const label = buildLabel(id, labelText);
  const control = document.createElement('input');
  control.className = 'email-collection__control';
  control.id = id;
  control.name = 'email';
  control.type = 'email';
  control.autocomplete = 'email';
  control.required = true;
  control.autofocus = true;
  if (placeholder) control.placeholder = placeholder;
  const error = document.createElement('p');
  error.className = 'email-collection__error';
  error.id = `${id}-error`;
  error.hidden = true;
  error.setAttribute('role', 'alert');
  control.setAttribute('aria-errormessage', error.id);
  field.append(label, control, error);
  return { field, control, error };
}

/**
 * @param {string} id
 * @param {string} labelText
 * @param {{ key: string, value: string }[]} countries
 * @returns {{ field: HTMLDivElement, control: HTMLSelectElement }}
 */
function buildCountryField(id, labelText, countries) {
  const field = document.createElement('div');
  field.className = 'email-collection__field';
  const label = buildLabel(id, labelText);
  const control = document.createElement('select');
  control.className = 'email-collection__control';
  control.id = id;
  control.name = 'country';
  control.autocomplete = 'country';
  control.required = true;
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = labelText;
  control.append(placeholder);
  countries.forEach(({ key, value }) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = value;
    control.append(option);
  });
  const error = document.createElement('p');
  error.className = 'email-collection__error';
  error.id = `${id}-error`;
  error.hidden = true;
  error.setAttribute('role', 'alert');
  control.setAttribute('aria-errormessage', error.id);
  field.append(label, control, error);
  return { field, control };
}

/**
 * First authored message in a panel, skipping the form and its buttons.
 * @param {Element} panel
 * @returns {HTMLElement|undefined}
 */
function messageNode(panel) {
  return [...panel.querySelectorAll('h1, h2, h3, h4, h5, h6, p')]
    .find((node) => !node.closest('form') && !node.querySelector('button, a'));
}

/**
 * Points the parent dialog at the visible panel. A hidden heading would
 * leave the dialog unnamed after success or error.
 * @param {Element|undefined} panel
 * @returns {void}
 */
function nameDialog(panel) {
  const dialog = panel?.closest('dialog');
  if (!dialog || !panel) return;
  const heading = panel.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    if (!heading.id) heading.id = 'email-collection-heading';
    dialog.setAttribute('aria-labelledby', heading.id);
    dialog.removeAttribute('aria-label');
    const description = [...panel.querySelectorAll('p')]
      .find((node) => !node.closest('form') && !node.querySelector('button, a'));
    if (description) {
      if (!description.id) description.id = 'email-collection-description';
      dialog.setAttribute('aria-describedby', description.id);
    } else {
      dialog.removeAttribute('aria-describedby');
    }
    return;
  }
  dialog.removeAttribute('aria-describedby');
  const label = messageNode(panel)?.textContent.trim();
  if (!label) return;
  dialog.removeAttribute('aria-labelledby');
  dialog.setAttribute('aria-label', label);
}

/**
 * Moves focus to the visible message so the result is announced.
 * @param {Element|undefined} panel
 * @returns {void}
 */
function focusMessage(panel) {
  const target = panel && messageNode(panel);
  if (!target) return;
  if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
  target.focus();
}

/**
 * Shows one panel and hides the others. Success and error receive focus.
 * @param {{ form: Element, success: Element|undefined, error: Element|undefined }} panels
 * @param {HTMLElement} status Live region. Cleared so the focused message is not announced twice.
 * @param {'form'|'success'|'error'} state
 * @returns {void}
 */
function showState(panels, status, state) {
  Object.entries(panels).forEach(([name, panel]) => {
    if (panel) panel.hidden = name !== state;
  });
  const current = panels[state];
  status.textContent = '';
  nameDialog(current);
  if (state !== 'form') focusMessage(current);
}

/**
 * Names and focuses the open dialog. Decorate runs before the dialog exists.
 * @param {Element} node
 * @param {(dialog: HTMLDialogElement) => void} onOpen
 * @returns {void}
 */
function whenDialogReady(node, onOpen) {
  const attach = (dialog) => {
    if (dialog.open) onOpen(dialog);
    else {
      dialog.addEventListener('toggle', () => {
        if (dialog.open) onOpen(dialog);
      }, { once: true });
    }
  };
  const tryAttach = () => {
    const dialog = node.closest('dialog');
    if (!dialog) return false;
    attach(dialog);
    return true;
  };
  if (tryAttach() || node.isConnected) return;
  const timer = window.setInterval(() => {
    if (tryAttach() || node.isConnected) {
      window.clearInterval(timer);
    }
  }, 16);
  window.setTimeout(() => window.clearInterval(timer), 5000);
}

/**
 * Turns `#close-form` and `#show-form` links into buttons.
 * @param {Element} panel
 * @param {(button: HTMLButtonElement) => void} onClose
 * @param {() => void} [onShowForm]
 * @returns {void}
 */
function wireMessageLinks(panel, onClose, onShowForm) {
  const closeLink = findHashLink(panel, 'close-form');
  if (closeLink) {
    const button = replaceWithButton(closeLink, 'button');
    button.classList.add('email-collection__text-button');
    button.addEventListener('click', () => onClose(button));
  }
  const showLink = findHashLink(panel, 'show-form');
  if (showLink && onShowForm) {
    const button = replaceWithButton(showLink, 'button');
    button.classList.add('email-collection__text-button', 'email-collection__show-form');
    button.addEventListener('click', onShowForm);
  }
}

/**
 * @param {ReturnType<typeof readConfig>} config
 * @param {string} consentId
 * @param {HTMLFormElement} form
 * @returns {Promise<boolean>} True when the API accepts the submission
 */
async function postSubscription(config, consentId, form) {
  const token = await loadImsGuest(IMS_CLIENT_ID);
  if (!token) {
    reportFailure('no guest token');
    return false;
  }

  const email = form.querySelector('input[name="email"]')?.value.trim() || '';
  const country = form.querySelector('select[name="country"]')?.value || '';
  const body = {
    email,
    mpsSname: config.mpsSname,
    consentId,
    isGuest: true,
    appClientId: IMS_CLIENT_ID,
    ...(country && { countryCode: country }),
  };
  const base = (isNonProd() && config.runtimeEndpoint) || (isNonProd() ? API.stage : API.prod);
  const endpoint = `${base}/form-submit`;
  reportStep('POST', {
    endpoint,
    mpsSname: config.mpsSname,
    consentId,
    hasCountry: Boolean(country),
  });
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const responseText = await resp.text().catch(() => '');
    reportFailure('form-submit rejected', {
      status: resp.status,
      endpoint,
      body: responseText.slice(0, 500),
    });
    return false;
  }
  reportStep('form-submit accepted', { status: resp.status });
  return true;
}

/**
 * Builds the mailing-list form from the block rows and section metadata.
 * @param {Element} block
 * @returns {Promise<void>}
 */
export default async function decorate(block) {
  const rows = [...block.children];
  const formRow = rows[0];
  const successRow = rows[1];
  const errorRow = rows[2];
  if (!formRow) return;

  const panels = {
    form: formRow,
    success: successRow,
    error: errorRow,
  };
  Object.entries(panels).forEach(([name, panel]) => {
    panel?.classList.add('email-collection__panel', `email-collection__panel--${name}`);
    if (panel && panel !== formRow) panel.hidden = true;
  });

  const status = document.createElement('div');
  status.className = 'email-collection__status visually-hidden';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  status.setAttribute('role', 'status');
  block.append(status);

  const reveal = (state) => showState(panels, status, state);
  const closeDialog = (button) => button.closest('dialog')?.close();
  const syncDialog = () => {
    const panel = Object.values(panels).find((item) => item && !item.hidden);
    nameDialog(panel);
    if (panel && panel !== formRow) focusMessage(panel);
  };

  const config = readConfig(block);
  const formCell = rowCell(formRow);
  const submitLink = findHashLink(formCell, 'submit');

  if (successRow) {
    rowCell(successRow);
    wireMessageLinks(successRow, closeDialog, () => {
      const emailInput = formCell.querySelector('input[name="email"]');
      if (emailInput) emailInput.value = '';
      reveal('form');
      emailInput?.focus();
    });
  }
  if (errorRow) {
    rowCell(errorRow);
    wireMessageLinks(errorRow, closeDialog);
  }

  if (!hasRequiredConfig(config) || !submitLink) {
    reveal('error');
    whenDialogReady(block, syncDialog);
    return;
  }

  const [placeholders, consent, countries] = await Promise.all([
    fetchPlaceholders(),
    fetchConsent(config.consentId, config.subscriptionName),
    config.fields.country ? fetchCountries() : Promise.resolve([]),
  ]);

  const emailId = nextFieldId('email');
  const emailParts = splitField(config.fields.email);
  const emailField = buildEmailField(emailId, emailParts.label, emailParts.placeholder);
  const controls = [emailField.control];
  const form = document.createElement('form');
  form.className = 'email-collection__form';
  form.noValidate = true;
  const heading = formRow.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    if (!heading.id) heading.id = 'email-collection-heading';
    form.setAttribute('aria-labelledby', heading.id);
  }
  form.append(emailField.field);

  if (config.fields.country) {
    const countryId = nextFieldId('country');
    const countryField = buildCountryField(
      countryId,
      splitField(config.fields.country).label,
      countries,
    );
    controls.push(countryField.control);
    form.append(countryField.field);
  }

  consent.node.classList.add('email-collection__consent');
  form.append(consent.node);

  const submitButton = replaceWithButton(submitLink, 'submit');
  submitButton.classList.add('button', 'email-collection__submit');
  const submitWrap = submitButton.closest('p') || submitButton;
  submitWrap.classList.add('email-collection__actions');
  form.append(submitWrap);
  formCell.append(form);

  const watch = (control) => {
    control.addEventListener('blur', () => applyFieldError(control, placeholders));
    control.addEventListener('input', () => {
      if (control.getAttribute('aria-invalid') === 'true') applyFieldError(control, placeholders);
    });
    control.addEventListener('change', () => {
      if (control.getAttribute('aria-invalid') === 'true') applyFieldError(control, placeholders);
    });
  };
  controls.forEach(watch);

  let submitting = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    const invalid = controls.find((control) => !applyFieldError(control, placeholders));
    if (invalid) {
      invalid.focus();
      return;
    }

    submitting = true;
    status.textContent = 'Submitting';
    submitButton.setAttribute('aria-busy', 'true');
    submitButton.setAttribute('aria-disabled', 'true');
    try {
      reportStep('submit', { clientId: IMS_CLIENT_ID, consentId: consent.consentId });
      const ok = await postSubscription(config, consent.consentId, form);
      reveal(ok ? 'success' : 'error');
    } catch (error) {
      reportFailure('submit failed', error);
      reveal('error');
    } finally {
      submitting = false;
      submitButton.removeAttribute('aria-busy');
      submitButton.removeAttribute('aria-disabled');
    }
  });

  if (isNonProd()) {
    const preview = new URLSearchParams(window.location.search).get('email-collection-show');
    if (preview === 'success' || preview === 'subscribed') {
      reveal('success');
    } else if (preview === 'error') {
      reveal('error');
    } else {
      nameDialog(formRow);
    }
  } else {
    nameDialog(formRow);
  }
  whenDialogReady(block, syncDialog);
}
