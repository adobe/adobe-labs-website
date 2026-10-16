import { waitFor, within } from '@testing-library/dom';
import { loadScript } from '../../scripts/aem.js';
import decorate from './email-collection.js';

jest.mock('../../scripts/aem.js', () => ({
  loadScript: jest.fn(() => Promise.resolve()),
}));

const CONSENT_HTML = '<div><p>Emails about {{subscription-name}}.</p></div><div><p>cs4;ve1;en</p></div>';

function jsonResponse(data) {
  return { ok: true, json: async () => data, text: async () => '' };
}

function textResponse(text) {
  return { ok: true, json: async () => ({}), text: async () => text };
}

function mockFetch({ postOk = true, postBody } = {}) {
  window.fetch = jest.fn(async (url, options) => {
    const href = String(url);
    if (href.includes('sheet=placeholders')) {
      return jsonResponse({
        data: [
          { key: 'required', value: 'This field is required.' },
          { key: 'email', value: 'Enter a valid email.' },
        ],
      });
    }
    if (href.includes('/consents/')) return textResponse(CONSENT_HTML);
    if (href.includes('sheet=countries')) {
      return jsonResponse({ data: [{ key: 'US', value: 'United States' }] });
    }
    if (href.includes('/form-submit')) {
      if (postBody) postBody.current = { url: href, options };
      return { ok: postOk, json: async () => ({}), text: async () => '' };
    }
    return { ok: false, json: async () => ({}), text: async () => '' };
  });
}

function createBlock({
  email = 'Email address',
  country = 'Country',
  mpsSname = 'adbe_ml_ai_research',
  subscriptionName = 'AI Research',
  signIn = 'off',
  submit = true,
  showForm = false,
} = {}) {
  const section = document.createElement('div');
  section.className = 'section';
  if (email) section.dataset.email = email;
  if (country) section.dataset.country = country;
  if (mpsSname) section.dataset.mpsSname = mpsSname;
  if (subscriptionName) section.dataset.subscriptionName = subscriptionName;
  if (signIn) section.dataset.signIn = signIn;

  const block = document.createElement('div');
  block.className = 'email-collection mailing-list';
  const showFormLink = showForm ? '<p><a href="#show-form">Sign up with a separate email</a></p>' : '';
  const submitLink = submit
    ? '<p class="button-wrapper"><a class="button" href="#submit">Subscribe</a></p>'
    : '';
  block.innerHTML = `
    <div><div>
      <h2 id="subscribe">Subscribe</h2>
      <p>New AI research on creativity in your inbox as it publishes. No marketing, no hype.</p>
      ${submitLink}
    </div></div>
    <div><div>
      <p>We’ve received your response.</p>
      <p class="button-wrapper"><a class="button" href="#close-form">Back to the website</a></p>
      ${showFormLink}
    </div></div>
    <div><div>
      <p>Something went wrong</p>
      <p class="button-wrapper"><a class="button" href="#close-form">Back to the website</a></p>
    </div></div>
  `;
  section.append(block);
  document.body.append(section);
  return block;
}

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
  document.body.innerHTML = '';
  window.history.pushState({}, '', '/');
  delete window.adobeIMS;
  mockFetch();
});

describe('email-collection', () => {
  it('builds an email and country form with federal consent', async () => {
    const block = createBlock();

    await decorate(block);

    const email = within(block).getByRole('textbox', { name: /email address/i });
    expect(email).toBeRequired();
    expect(email).toHaveAttribute('autofocus');
    expect(within(block).getByRole('combobox', { name: /country/i })).toBeRequired();
    expect(within(block).getByRole('option', { name: 'United States' })).toBeInTheDocument();
    expect(block).toHaveTextContent('Emails about AI Research.');
    expect(within(block).getByRole('button', { name: 'Subscribe' })).toHaveAttribute('type', 'submit');
    expect(block.querySelector('.email-collection__panel--success')).toHaveAttribute('hidden');
  });

  it('does not build a form when email metadata or the Submit link is missing', async () => {
    const missingEmail = createBlock({ email: '' });
    await decorate(missingEmail);
    expect(missingEmail.querySelector('form')).toBeNull();
    expect(missingEmail.querySelector('.email-collection__panel--error')).not.toHaveAttribute('hidden');

    document.body.innerHTML = '';
    const missingSubmit = createBlock({ submit: false });
    await decorate(missingSubmit);
    expect(missingSubmit.querySelector('form')).toBeNull();
  });

  it('shows the federal email message after an invalid address is submitted', async () => {
    const block = createBlock();
    await decorate(block);

    const email = within(block).getByRole('textbox', { name: /email address/i });
    email.value = 'not-an-email';
    email.closest('form').requestSubmit();

    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Enter a valid email.');
    expect(block.querySelector(`#${email.getAttribute('aria-errormessage')}`)).toHaveAttribute('role', 'alert');
    expect(window.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/form-submit'),
      expect.anything(),
    );
  });

  it('shows the required message when email is empty', async () => {
    const block = createBlock({ country: '' });
    await decorate(block);

    const email = within(block).getByRole('textbox', { name: /email address/i });
    email.closest('form').requestSubmit();

    expect(email).toHaveAccessibleDescription('This field is required.');
  });

  it('posts a guest subscription and shows the success message', async () => {
    window.adobeIMS = { getAccessToken: () => ({ token: 'guest-token' }) };
    const postBody = {};
    mockFetch({ postBody });
    const block = createBlock();
    await decorate(block);

    const email = within(block).getByRole('textbox', { name: /email address/i });
    const country = within(block).getByRole('combobox', { name: /country/i });
    email.value = 'ada@adobe.com';
    country.value = 'US';
    email.closest('form').requestSubmit();

    await waitFor(() => {
      expect(block.querySelector('.email-collection__panel--success')).not.toHaveAttribute('hidden');
    });
    expect(postBody.current.url).toBe('https://www.stage.adobe.com/milo-email-collection-api/form-submit');
    expect(postBody.current.options.headers.Authorization).toBe('Bearer guest-token');
    expect(JSON.parse(postBody.current.options.body)).toEqual({
      email: 'ada@adobe.com',
      mpsSname: 'adbe_ml_ai_research',
      consentId: 'cs4;ve1;en',
      isGuest: true,
      appClientId: 'spectrumhub',
      countryCode: 'US',
    });
    expect(within(block).getByText('We’ve received your response.')).toBeVisible();
  });

  it('posts when IMS issues a guest token during startup', async () => {
    const postBody = {};
    mockFetch({ postBody });
    loadScript.mockImplementation(() => {
      window.adobeIMS = { getAccessToken: () => ({ token: 'guest-token' }) };
      window.adobeid.onAccessToken({ token: 'guest-token' });
      window.adobeid.onReady();
      return Promise.resolve();
    });
    const block = createBlock({ country: '' });
    await decorate(block);

    const email = within(block).getByRole('textbox', { name: /email address/i });
    email.value = 'ada@adobe.com';
    email.closest('form').requestSubmit();

    await waitFor(() => {
      expect(block.querySelector('.email-collection__panel--success')).not.toHaveAttribute('hidden');
    });
    expect(window.adobeid.client_id).toBe('spectrumhub');
    expect(window.adobeid.enableGuestBotDetection).toBe(true);
    expect(window.adobeid.guestBotDetectionProvider).toBe('bfp');
    expect(window.adobeid.api_parameters).toEqual({ check_token: { guest_allowed: true } });
    expect(postBody.current.options.headers.Authorization).toBe('Bearer guest-token');
  });

  it('logs the IMS refusal when no guest token is issued', async () => {
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    loadScript.mockImplementation(() => {
      window.adobeIMS = { getAccessToken: () => null };
      window.adobeid.onAccessTokenHasExpired({ exception: new Error('access_denied') });
      window.adobeid.onReady();
      return Promise.resolve();
    });
    const block = createBlock({ country: '' });
    await decorate(block);

    const email = within(block).getByRole('textbox', { name: /email address/i });
    email.value = 'ada@adobe.com';
    email.closest('form').requestSubmit();

    await waitFor(() => {
      expect(block.querySelector('.email-collection__panel--error')).not.toHaveAttribute('hidden');
    });
    expect(errorLog).toHaveBeenCalledWith(
      '[email-collection]',
      'IMS refused a guest token',
      expect.objectContaining({ message: 'access_denied', clientId: 'spectrumhub' }),
    );
    expect(window.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/form-submit'),
      expect.anything(),
    );
    errorLog.mockRestore();
  });

  it('closes the dialog from Back to the website and returns to the form', async () => {
    window.history.pushState({}, '', '/?email-collection-show=success');
    const block = createBlock({ showForm: true });
    const dialog = document.createElement('dialog');
    dialog.append(block.parentElement);
    document.body.append(dialog);
    dialog.showModal();

    await decorate(block);

    expect(block.querySelector('.email-collection__panel--success')).not.toHaveAttribute('hidden');
    expect(document.activeElement).toHaveTextContent('We’ve received your response.');
    within(block).getByRole('button', { name: 'Sign up with a separate email' }).click();
    expect(dialog).toHaveAttribute('aria-labelledby', 'subscribe');
    expect(dialog).toHaveAttribute('aria-describedby', 'email-collection-description');
    expect(block.querySelector('.email-collection__panel--form')).not.toHaveAttribute('hidden');

    window.history.pushState({}, '', '/?email-collection-show=error');
    document.body.innerHTML = '';
    const errorBlock = createBlock();
    const errorDialog = document.createElement('dialog');
    errorDialog.append(errorBlock.parentElement);
    document.body.append(errorDialog);
    errorDialog.showModal();
    await decorate(errorBlock);

    expect(errorDialog).toHaveAttribute('aria-label', 'Something went wrong');
    within(errorBlock).getByRole('button', { name: 'Back to the website' }).click();
    expect(errorDialog).not.toHaveAttribute('open');
  });
});
