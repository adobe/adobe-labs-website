import { within } from '@testing-library/dom';
import { buildBlock, getMetadata } from '../aem.js';
import {
  buildArticleAuthorMeta,
  buildArticleMetaActions,
  buildArticlePreFooter,
  buildAuthorByline,
  buildPlayIcon,
  ensureSkipLink,
  ensureArticleBackToTop,
  decorateArticleSections,
  decorateSectionMetadata,
  formatCardDate,
  getAuthoredCells,
  getSection,
  getSectionFromPath,
  isArticleDetailPage,
  isAuthoredVideo,
} from './utils.js';

jest.mock('../aem.js', () => ({
  toClassName: (name) => (typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : ''),
  toCamelCase: (name) => (typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      .replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    : ''),
  readBlockConfig: (block) => {
    const config = {};
    [...block.children].forEach((row) => {
      const cols = [...row.children];
      if (cols[1]) {
        const name = cols[0].textContent.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        config[name] = cols[1].textContent.trim();
      }
    });
    return config;
  },
  getMetadata: jest.fn(() => ''),
  buildBlock: jest.fn(),
}));

function mockBuildBlock(blockName, content) {
  const block = document.createElement('div');
  block.className = blockName;
  const table = Array.isArray(content) ? content : [[content]];
  table.forEach((row) => {
    const rowEl = document.createElement('div');
    row.forEach((col) => {
      const colEl = document.createElement('div');
      const vals = col.elems ? col.elems : [col];
      vals.forEach((val) => {
        if (typeof val === 'string') {
          colEl.textContent += val;
        } else if (val) {
          colEl.append(val);
        }
      });
      rowEl.append(colEl);
    });
    block.append(rowEl);
  });
  return block;
}

function createKeyValueBlock(fields) {
  const block = document.createElement('div');
  Object.entries(fields).forEach(([label, html]) => {
    const row = document.createElement('div');
    row.innerHTML = `<div>${label}</div><div>${html}</div>`;
    block.append(row);
  });
  return block;
}

function mockTemplate(template, extra = {}) {
  getMetadata.mockImplementation((name) => {
    if (name === 'template') return template;
    return extra[name] || '';
  });
}

describe('getSection', () => {
  it('resolves a slug or authored name to label and path', () => {
    expect(getSection('Research')).toEqual({
      slug: 'research',
      label: 'Research',
      path: '/research/',
    });
    expect(getSection('workflows')).toEqual({
      slug: 'workflows',
      label: 'Workflows',
      path: '/workflows/',
    });
  });

  it('returns null for unknown names', () => {
    expect(getSection('')).toBeNull();
    expect(getSection('policy')).toBeNull();
  });
});

describe('getSectionFromPath', () => {
  it('uses the first path segment', () => {
    expect(getSectionFromPath('/sneaks/clip')).toEqual({
      slug: 'sneaks',
      label: 'Sneaks',
      path: '/sneaks/',
    });
  });

  it('returns null for unknown folders', () => {
    expect(getSectionFromPath('/policy/terms')).toBeNull();
  });
});

describe('formatCardDate', () => {
  it('formats a date as Month Year', () => {
    expect(formatCardDate('2026-10-21')).toBe('Oct 2026');
  });

  it('formats a date in a different year', () => {
    expect(formatCardDate('2027-10-21')).toBe('Oct 2027');
  });

  it('parses authored month-name dates', () => {
    expect(formatCardDate('August 3, 2026')).toBe('Aug 2026');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatCardDate('not a date')).toBe('');
    expect(formatCardDate('')).toBe('');
  });
});

describe('buildPlayIcon', () => {
  it('returns a hidden label and a play-icon with an inner svg', () => {
    const { label, icon } = buildPlayIcon();

    expect(label).toHaveClass('visually-hidden');
    expect(label).toHaveTextContent('Video article');
    expect(icon).toHaveClass('play-icon');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon.querySelector('svg')).toBeTruthy();
    expect(label).not.toBe(icon);
  });
});

describe('isAuthoredVideo', () => {
  it.each([
    ['Is Video', 'true'],
    ['Show Video Icon', 'yes'],
    ['is-video', '1'],
  ])('is true when %s is %s', (label, value) => {
    const cells = getAuthoredCells(createKeyValueBlock({ [label]: value }));
    expect(isAuthoredVideo(cells)).toBe(true);
  });

  it('is false when the flag is not true', () => {
    const cells = getAuthoredCells(createKeyValueBlock({ 'Is Video': 'false' }));
    expect(isAuthoredVideo(cells)).toBe(false);
  });
});

describe('isArticleDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    buildBlock.mockImplementation(mockBuildBlock);
  });

  it('returns false when template metadata is empty', () => {
    expect(isArticleDetailPage()).toBe(false);
  });

  it('returns false when template metadata is unrelated', () => {
    getMetadata.mockReturnValue('home');
    expect(isArticleDetailPage()).toBe(false);
  });

  it('returns true when template metadata includes article', () => {
    getMetadata.mockReturnValue('article');
    expect(isArticleDetailPage()).toBe(true);
  });

  it('returns true when template metadata lists article among others', () => {
    getMetadata.mockReturnValue('Dark, Article');
    expect(isArticleDetailPage()).toBe(true);
  });
});

describe('buildArticlePreFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    buildBlock.mockImplementation(mockBuildBlock);
    document.body.innerHTML = '';
  });

  it('does not inject when main is detached from the document', () => {
    mockTemplate('article');
    const main = document.createElement('main');

    buildArticlePreFooter(main);

    expect(main.querySelector('.fragment')).toBeNull();
    expect(buildBlock).not.toHaveBeenCalled();
  });

  it('does not inject on non-article pages', () => {
    const main = document.createElement('main');
    document.body.append(main);

    buildArticlePreFooter(main);

    expect(main.querySelector('.fragment')).toBeNull();
    expect(buildBlock).not.toHaveBeenCalled();
  });

  it('appends a fragment block for the default article pre-footer path', () => {
    mockTemplate('article');
    const main = document.createElement('main');
    document.body.append(main);

    buildArticlePreFooter(main);

    expect(buildBlock).toHaveBeenCalledWith(
      'fragment',
      expect.objectContaining({
        elems: [expect.any(HTMLAnchorElement)],
      }),
    );
    const link = main.querySelector('a[href="/fragments/article-pre-footer"]');
    expect(link).not.toBeNull();
    expect(link).toHaveTextContent('/fragments/article-pre-footer');
    expect(link).not.toBeVisible();
    expect(main.querySelector(':scope > div > .fragment')).not.toBeNull();
  });

  it('uses article-pre-footer metadata when present', () => {
    mockTemplate('article', { 'article-pre-footer': '/fragments/custom-pre-footer' });
    const main = document.createElement('main');
    document.body.append(main);

    buildArticlePreFooter(main);

    expect(main.querySelector('a[href="/fragments/custom-pre-footer"]')).not.toBeNull();
  });
});

describe('buildArticleMetaActions', () => {
  let writeText;
  let originalClipboard;
  let originalExecCommand;

  function createArticleMain({ hero = true, extraSection = false } = {}) {
    const main = document.createElement('main');
    if (hero) {
      const heroSection = document.createElement('div');
      const heroBlock = document.createElement('div');
      heroBlock.className = 'hero';
      heroSection.append(heroBlock);
      main.append(heroSection);
    }
    const body = document.createElement('div');
    const heading = document.createElement('h2');
    heading.textContent = 'Headline';
    body.append(heading);
    main.append(body);
    let extra;
    if (extraSection) {
      extra = document.createElement('div');
      const more = document.createElement('p');
      more.textContent = 'More';
      extra.append(more);
      main.append(extra);
    }
    document.body.append(main);
    return { main, body, extra };
  }

  function addArticleMeta(section, position, { byline = true } = {}) {
    const wrapper = document.createElement('div');
    const meta = document.createElement('aside');
    meta.className = `article-meta article-meta--${position}`;
    if (byline) {
      const authors = document.createElement('div');
      authors.className = 'article-meta__authors';
      authors.textContent = 'Words by: Adobe Labs';
      meta.append(authors);
    }
    wrapper.append(meta);
    if (position === 'bottom') section.append(wrapper);
    else section.prepend(wrapper);
    return meta;
  }

  function setCanonical(href) {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = href;
    document.head.append(link);
    return link;
  }

  async function waitForCopy() {
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    document.body.innerHTML = '';
    document.head.querySelectorAll('link[rel="canonical"]').forEach((link) => link.remove());
    originalClipboard = navigator.clipboard;
    originalExecCommand = document.execCommand;
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
    document.head.querySelectorAll('link[rel="canonical"]').forEach((link) => link.remove());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
    document.execCommand = originalExecCommand;
  });

  it('does not inject when main is not a child of body', () => {
    mockTemplate('article');
    const main = document.createElement('main');

    buildArticleMetaActions(main);

    expect(main.querySelector('.article-meta__actions')).toBeNull();
  });

  it('does not inject on a fragment main nested under body', () => {
    mockTemplate('article');
    const wrapper = document.createElement('div');
    const main = document.createElement('main');
    wrapper.append(main);
    document.body.append(wrapper);

    buildArticleMetaActions(main);

    expect(main.querySelector('.article-meta__actions')).toBeNull();
  });

  it('does not inject on non-article pages', () => {
    const { main } = createArticleMain();

    buildArticleMetaActions(main);

    expect(main.querySelector('.article-meta__actions')).toBeNull();
  });

  it('injects Copy link into fallback .article-meta shells at the top and bottom', () => {
    mockTemplate('article');
    const { main, body } = createArticleMain();

    buildArticleMetaActions(main);

    const metas = main.querySelectorAll('.article-meta');
    expect(metas).toHaveLength(2);
    expect(body.firstElementChild.className).toBe('');
    expect(body.firstElementChild.querySelector('.article-meta')).toHaveClass('article-meta--top');
    expect(body.lastElementChild.querySelector('.article-meta')).toHaveClass('article-meta--bottom');
    expect(body.firstElementChild.querySelector('.article-meta').tagName).toBe('ASIDE');
    expect(main.querySelector('.article-meta--top')).toHaveAccessibleName('Article details');
    expect(main.querySelector('.article-meta--bottom')).toHaveAccessibleName(
      'Article details, bottom of article',
    );
    expect(main.querySelector('.article-meta-section')).toBeNull();

    const groups = main.querySelectorAll('.article-meta__actions');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAttribute('role', 'group');
    expect(groups[0]).toHaveAccessibleName('Article actions');
    expect(groups[1]).toHaveAccessibleName('Article actions, bottom of article');
    groups.forEach((group) => {
      expect(group.tagName).toBe('DIV');
      expect(group.parentElement).toHaveClass('article-meta');
      expect(within(group).getByRole('button', { name: 'Copy link' })).toBeTruthy();
      expect(group.querySelector('[data-meta-action="download"]')).toBeNull();
      const feedback = within(group).getByRole('link', { name: 'Feedback (opens email)' });
      expect(feedback.querySelector('.action-button__label').textContent).toBe('Feedback');
      expect(feedback.querySelector('.visually-hidden').textContent).toBe(' (opens email)');
      expect(feedback).toHaveAttribute('href', 'mailto:labs@adobe.com');
      expect(feedback).not.toHaveAttribute('download');
      expect([...group.children].map((el) => el.dataset.metaAction)).toEqual([
        'copy-link',
        'feedback',
      ]);
    });
    const status = main.querySelector(':scope > [data-meta-action-status]');
    expect(status).toBeTruthy();
    expect(status.parentElement).toBe(main);
    expect(groups[0].contains(status)).toBe(false);
  });

  it('places the bottom fallback on the last authored section when there are several', () => {
    mockTemplate('article');
    const { main, body, extra } = createArticleMain({ extraSection: true });

    buildArticleMetaActions(main);

    expect(body.querySelector('.article-meta--top .article-meta__actions')).toBeTruthy();
    expect(extra.querySelector('.article-meta--bottom .article-meta__actions')).toBeTruthy();
  });

  it('prepends the fallback to the first section when there is no hero', () => {
    mockTemplate('article');
    const { main, body } = createArticleMain({ hero: false });

    buildArticleMetaActions(main);

    expect(body.firstElementChild.querySelector('.article-meta--top')).toBeTruthy();
    expect(body.lastElementChild.querySelector('.article-meta--bottom')).toBeTruthy();
  });

  it('inserts the top fallback after a hero that shares its section', () => {
    mockTemplate('article');
    const section = document.createElement('div');
    const hero = document.createElement('div');
    hero.className = 'hero';
    const leadIn = document.createElement('div');
    leadIn.className = 'lead-in';
    leadIn.textContent = 'Lead in';
    section.append(hero, leadIn);
    const main = document.createElement('main');
    main.append(section);
    document.body.append(main);

    buildArticleMetaActions(main);

    expect(hero.nextElementSibling.querySelector('.article-meta--top')).toBeTruthy();
    expect(section.lastElementChild.querySelector('.article-meta--bottom')).toBeTruthy();
  });

  it('appends actions as the second child of existing .article-meta containers', () => {
    mockTemplate('article');
    const { main, body, extra } = createArticleMain({ extraSection: true });
    const topMeta = addArticleMeta(body, 'top');
    const bottomMeta = addArticleMeta(extra, 'bottom');

    buildArticleMetaActions(main);

    expect(main.querySelectorAll('.article-meta')).toHaveLength(2);
    expect(topMeta.children).toHaveLength(2);
    expect(topMeta.firstElementChild).toHaveClass('article-meta__authors');
    expect(topMeta.lastElementChild).toHaveClass('article-meta__actions');
    expect(bottomMeta.lastElementChild).toHaveClass('article-meta__actions');
    expect(topMeta).toHaveAccessibleName('Article details');
    expect(bottomMeta).toHaveAccessibleName('Article details, bottom of article');
    expect(body.querySelector(':scope > .article-meta__actions')).toBeNull();
  });

  it('does not add a second pair of groups when called again', () => {
    mockTemplate('article');
    const { main } = createArticleMain();

    buildArticleMetaActions(main);
    buildArticleMetaActions(main);

    expect(main.querySelectorAll('.article-meta')).toHaveLength(2);
    expect(main.querySelectorAll('.article-meta__actions')).toHaveLength(2);
  });

  it('copies the canonical URL without a hash from either group', async () => {
    mockTemplate('article');
    setCanonical('https://labs.adobe.com/research/foo#intro');
    const { main } = createArticleMain();
    buildArticleMetaActions(main);

    const groups = [...main.querySelectorAll('.article-meta__actions')];
    within(groups[0]).getByRole('button', { name: 'Copy link' }).click();
    await waitForCopy();

    expect(writeText).toHaveBeenCalledWith('https://labs.adobe.com/research/foo');
    expect(within(groups[0]).getByRole('button', { name: 'Copied' })).toBeTruthy();
    expect(groups[0].querySelector('[data-meta-action="copy-link"] svg'))
      .toHaveAttribute('aria-hidden', 'true');
    expect(within(groups[1]).getByRole('button', { name: 'Copy link' })).toBeTruthy();
    expect(main.querySelector(':scope > [data-meta-action-status]')).toHaveTextContent('Link copied');

    within(groups[1]).getByRole('button', { name: 'Copy link' }).click();
    await waitForCopy();

    expect(writeText).toHaveBeenCalledTimes(2);
    expect(within(groups[1]).getByRole('button', { name: 'Copied' })).toBeTruthy();
  });

  it('reverts Copied back to Copy link after the delay', async () => {
    jest.useFakeTimers();
    mockTemplate('article');
    setCanonical('https://labs.adobe.com/research/foo');
    const { main } = createArticleMain();
    buildArticleMetaActions(main);

    const button = within(main).getAllByRole('button', { name: 'Copy link' })[0];
    button.click();
    await waitForCopy();

    expect(button).toHaveAccessibleName('Copied');
    expect(main.querySelector(':scope > [data-meta-action-status]')).toHaveTextContent('Link copied');
    jest.advanceTimersByTime(2000);
    expect(button).toHaveAccessibleName('Copy link');
    expect(main.querySelector(':scope > [data-meta-action-status]')).toHaveTextContent('');
  });

  it('falls back to execCommand when the Clipboard API is missing', async () => {
    mockTemplate('article');
    setCanonical('https://labs.adobe.com/research/foo');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    document.execCommand = jest.fn(() => true);
    const { main } = createArticleMain();
    buildArticleMetaActions(main);

    const button = within(main).getAllByRole('button', { name: 'Copy link' })[0];
    button.focus();
    button.click();
    await waitForCopy();

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.activeElement).toBe(button);
    expect(button).toHaveAccessibleName('Copied');
  });

  it('announces failure when copying is not possible', async () => {
    mockTemplate('article');
    writeText.mockRejectedValue(new Error('denied'));
    document.execCommand = jest.fn(() => false);
    const { main } = createArticleMain();
    buildArticleMetaActions(main);

    const button = within(main).getAllByRole('button', { name: 'Copy link' })[0];
    button.click();
    await waitForCopy();

    expect(button).toHaveAccessibleName('Copy link');
    expect(main.querySelector(':scope > [data-meta-action-status]')).toHaveTextContent('Unable to copy link');
  });

  it('adds Download next to Copy link when download-link metadata is set', () => {
    mockTemplate('article', { 'download-link': 'https://example.com/data.zip' });
    const { main } = createArticleMain();

    buildArticleMetaActions(main);

    const groups = main.querySelectorAll('.article-meta__actions');
    expect(groups).toHaveLength(2);
    groups.forEach((group) => {
      expect(within(group).getByRole('button', { name: 'Copy link' })).toBeTruthy();
      const download = within(group).getByRole('link', { name: 'Download' });
      expect(download).toHaveAccessibleName('Download');
      expect(download).toHaveAttribute('href', 'https://example.com/data.zip');
      expect(download).toHaveAttribute('data-meta-action', 'download');
      expect(download).toHaveAttribute('download', 'data.zip');
      const icon = download.querySelector('.action-button__icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(download.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(download.querySelector('svg')).toHaveAttribute('focusable', 'false');
      const feedback = within(group).getByRole('link', { name: 'Feedback (opens email)' });
      expect(feedback).toHaveAttribute('data-meta-action', 'feedback');
      expect([...group.children].map((el) => el.dataset.metaAction)).toEqual([
        'copy-link',
        'download',
        'feedback',
      ]);
    });
  });

  it('resolves a relative download-link against the current origin', () => {
    mockTemplate('article', { 'download-link': '/media/dataset.pdf' });
    const { main } = createArticleMain();

    buildArticleMetaActions(main);

    const download = within(main.querySelector('.article-meta__actions'))
      .getByRole('link', { name: 'Download' });
    const href = new URL(download.getAttribute('href'));
    expect(href.origin).toBe(window.location.origin);
    expect(href.pathname).toBe('/media/dataset.pdf');
    expect(download).toHaveAttribute('download', 'dataset.pdf');
  });

  it('rewrites a DA media-browser URL for this site to a same-origin file path', () => {
    mockTemplate('article', {
      'download-link': 'https://da.live/media#/adobe/adobe-labs-website/media/c4611-sample-explain.pdf ',
    });
    const { main } = createArticleMain();

    buildArticleMetaActions(main);

    const download = within(main.querySelector('.article-meta__actions'))
      .getByRole('link', { name: 'Download' });
    const href = new URL(download.getAttribute('href'));
    expect(href.origin).toBe(window.location.origin);
    expect(href.pathname).toBe('/media/c4611-sample-explain.pdf');
    expect(download).toHaveAttribute('download', 'c4611-sample-explain.pdf');
  });

  it('rewrites content.da.live and da.live edit URLs for this site', () => {
    const cases = [
      'https://content.da.live/adobe/adobe-labs-website/media/c4611-sample-explain.pdf',
      'https://da.live/edit#/adobe/adobe-labs-website/media/c4611-sample-explain.pdf',
    ];

    cases.forEach((downloadLink) => {
      document.body.innerHTML = '';
      mockTemplate('article', { 'download-link': downloadLink });
      const { main } = createArticleMain();
      buildArticleMetaActions(main);

      const download = within(main.querySelector('.article-meta__actions'))
        .getByRole('link', { name: 'Download' });
      expect(new URL(download.getAttribute('href')).pathname).toBe(
        '/media/c4611-sample-explain.pdf',
      );
    });
  });

  it('does not render Download for a DA URL from another site or a folder', () => {
    [
      'https://da.live/media#/other-org/other-site/media/file.pdf',
      'https://da.live/media#/adobe/adobe-labs-website/media',
    ].forEach((downloadLink) => {
      document.body.innerHTML = '';
      mockTemplate('article', { 'download-link': downloadLink });
      const { main } = createArticleMain();
      buildArticleMetaActions(main);

      const groups = main.querySelectorAll('.article-meta__actions');
      expect(groups).toHaveLength(2);
      groups.forEach((group) => {
        expect(within(group).queryByRole('link', { name: 'Download' })).toBeNull();
        expect(group.querySelector('[data-meta-action="download"]')).toBeNull();
        expect(within(group).getByRole('button', { name: 'Copy link' })).toBeTruthy();
      });
    });
  });

  it('uses the metadata Title as the Feedback subject', () => {
    mockTemplate('article', {
      title: 'Ignored meta name',
      'og:title': 'How Creatives think',
    });
    document.title = 'Ignored browser title';
    const { main } = createArticleMain();

    buildArticleMetaActions(main);

    const groups = main.querySelectorAll('.article-meta__actions');
    expect(groups).toHaveLength(2);
    groups.forEach((group) => {
      const feedback = within(group).getByRole('link', { name: 'Feedback (opens email)' });
      expect(feedback).toHaveAttribute(
        'href',
        'mailto:labs@adobe.com?subject=Feedback%3A%20How%20Creatives%20think',
      );
      expect(feedback).not.toHaveAttribute('download');
      expect(feedback).not.toHaveAttribute('target');
      expect(feedback).not.toHaveAttribute('rel');
    });
  });

  it('percent-encodes spaces and ampersands in the Feedback subject', () => {
    const title = 'Research & design?';
    mockTemplate('article', { 'og:title': title });
    const { main } = createArticleMain();

    buildArticleMetaActions(main);

    const feedback = within(main.querySelector('.article-meta__actions'))
      .getByRole('link', { name: 'Feedback (opens email)' });
    expect(feedback).toHaveAttribute(
      'href',
      `mailto:labs@adobe.com?subject=${encodeURIComponent(`Feedback: ${title}`)}`,
    );
    expect(feedback.getAttribute('href')).not.toContain('&');
    expect(feedback.getAttribute('href')).toContain('%26');
    expect(feedback.getAttribute('href')).toContain('%3F');
  });

  it('omits the Feedback subject when Title is missing or whitespace', () => {
    ['', '   '].forEach((ogTitle) => {
      document.body.innerHTML = '';
      document.title = 'Browser title';
      mockTemplate('article', { title: 'Meta name title', 'og:title': ogTitle });
      const { main } = createArticleMain();
      buildArticleMetaActions(main);

      const feedback = within(main.querySelector('.article-meta__actions'))
        .getByRole('link', { name: 'Feedback (opens email)' });
      expect(feedback).toHaveAttribute('href', 'mailto:labs@adobe.com');
    });
  });

  it('uses the envelope icon on Feedback', () => {
    mockTemplate('article', { title: 'Article' });
    const { main } = createArticleMain();

    buildArticleMetaActions(main);

    const feedback = within(main.querySelector('.article-meta__actions'))
      .getByRole('link', { name: 'Feedback (opens email)' });
    const icon = feedback.querySelector('.action-button__icon');
    const svg = feedback.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('viewBox', '0 0 18 18');
    expect(svg.querySelector('path')).toHaveAttribute(
      'd',
      'M15.0749 2.69336H2.9249C1.8087 2.69336 0.899902 3.60215 0.899902 4.71836V13.2684C0.899902 14.3846 1.8087 15.2934 2.9249 15.2934H15.0749C16.1911 15.2934 17.0999 14.3846 17.0999 13.2684V4.71836C17.0999 3.60215 16.1911 2.69336 15.0749 2.69336ZM14.6963 4.04336L9.44287 8.61807C9.1915 8.83779 8.80918 8.83779 8.55606 8.61807L3.30349 4.04336H14.6963ZM15.0749 13.9434H2.9249C2.55312 13.9434 2.2499 13.6401 2.2499 13.2684V4.91523L7.66923 9.63584C8.04893 9.96631 8.52441 10.1315 8.9999 10.1315C9.47539 10.1315 9.95088 9.96631 10.3297 9.63584L15.7499 4.91523V13.2684C15.7499 13.6401 15.4467 13.9434 15.0749 13.9434Z',
    );
  });

  it('does not render Download for empty, whitespace, or non-http URLs', () => {
    const scriptUrl = ['javascript', 'alert(1)'].join(':');
    ['', '   ', scriptUrl].forEach((downloadLink) => {
      document.body.innerHTML = '';
      mockTemplate('article', { 'download-link': downloadLink });
      const { main } = createArticleMain();
      buildArticleMetaActions(main);

      expect(
        within(main.querySelector('.article-meta__actions')).queryByRole('link', { name: 'Download' }),
      ).toBeNull();
    });
  });
});

describe('ensureSkipLink', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('prepends a skip link to the site header and names main', () => {
    document.body.innerHTML = '<header></header><main></main>';

    ensureSkipLink(document);

    const skip = document.querySelector('.header__skip');
    expect(skip).toHaveTextContent('Skip to main content');
    expect(skip).toHaveAttribute('href', '#main');
    expect(document.querySelector('header').firstElementChild).toBe(skip);
    expect(document.querySelector('main')).toHaveAttribute('id', 'main');
    expect(document.querySelector('main')).toHaveAttribute('tabindex', '-1');
  });

  it('does not add a second skip link', () => {
    document.body.innerHTML = '<header></header><main id="main"></main>';

    ensureSkipLink(document);
    ensureSkipLink(document);

    expect(document.querySelectorAll('.header__skip')).toHaveLength(1);
  });
});

describe('ensureArticleBackToTop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not inject on non-article pages', () => {
    document.body.innerHTML = '<main></main><footer></footer>';

    ensureArticleBackToTop(document);

    expect(document.querySelector('.back-to-top')).toBeNull();
  });

  it('does not inject when there is no body main', () => {
    mockTemplate('article');
    document.body.innerHTML = '<div></div>';

    ensureArticleBackToTop(document);

    expect(document.querySelector('.back-to-top')).toBeNull();
  });

  it('injects one control after main on article pages', () => {
    mockTemplate('article');
    document.body.innerHTML = '<main></main><footer></footer>';

    ensureArticleBackToTop(document);

    const control = document.querySelector('a.back-to-top');
    expect(control).toHaveAccessibleName('Back to top');
    expect(control).toHaveAttribute('href', '#top');
    expect(document.querySelector('main').nextElementSibling).toBe(control);
    expect(control.querySelector('.back-to-top__icon')).toHaveAttribute('aria-hidden', 'true');
    expect(control.querySelector('svg')).toHaveAttribute('focusable', 'false');
  });

  it('does not add a second control', () => {
    mockTemplate('article');
    document.body.innerHTML = '<main></main>';

    ensureArticleBackToTop(document);
    ensureArticleBackToTop(document);

    expect(document.querySelectorAll('.back-to-top')).toHaveLength(1);
  });
});

function createSection({ hero = false } = {}) {
  const section = document.createElement('div');
  section.className = 'section';
  if (hero) {
    const block = document.createElement('div');
    block.className = 'hero';
    section.append(block);
  }
  return section;
}

describe('decorateArticleSections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    document.body.innerHTML = '';
  });

  it('does not add the class on non-article pages', () => {
    const main = document.createElement('main');
    main.append(createSection(), createSection());

    decorateArticleSections(main);

    expect(main.querySelector('.section-rounded-default')).toBeNull();
  });

  it('skips the hero and adds the class to other article sections', () => {
    mockTemplate('article');
    const hero = createSection({ hero: true });
    const body = createSection();
    const preFooter = createSection();
    const main = document.createElement('main');
    main.append(hero, body, preFooter);
    document.body.append(main);

    decorateArticleSections(main);

    expect(hero).not.toHaveClass('section-rounded-default');
    expect(body).toHaveClass('section-rounded-default');
    expect(preFooter).toHaveClass('section-rounded-default');
  });

  it('adds the class to every section when there is no hero', () => {
    mockTemplate('article');
    const first = createSection();
    const second = createSection();
    const main = document.createElement('main');
    main.append(first, second);
    document.body.append(main);

    decorateArticleSections(main);

    expect(first).toHaveClass('section-rounded-default');
    expect(second).toHaveClass('section-rounded-default');
  });

  it('adds the class to all sections of a detached fragment main', () => {
    mockTemplate('article');
    const first = createSection();
    const second = createSection();
    const main = document.createElement('main');
    main.append(first, second);

    decorateArticleSections(main);

    expect(first).toHaveClass('section-rounded-default');
    expect(second).toHaveClass('section-rounded-default');
  });
});

describe('buildAuthorByline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
  });

  it('falls back to Adobe Labs when there is no author metadata', () => {
    const byline = buildAuthorByline();

    expect(byline).toHaveClass('article-meta__authors');
    expect(byline.querySelector('.article-meta__authors-label')).toHaveTextContent('Words by:');
    const names = [...byline.querySelectorAll('.article-meta__author-name')].map((el) => el.textContent);
    expect(names).toEqual(['Adobe Labs']);
  });

  it('reads one author per name from comma-separated metadata', () => {
    getMetadata.mockReturnValue('Randy Oest, Josh Winn');

    const byline = buildAuthorByline();

    const names = [...byline.querySelectorAll('.article-meta__author-name')].map((el) => el.textContent);
    expect(names).toEqual(['Randy Oest', 'Josh Winn']);
    expect(byline.querySelectorAll('.article-meta__author')).toHaveLength(2);
  });

  it('requests each author image by slugified name and hides it until it loads', () => {
    getMetadata.mockReturnValue('Randy Oest');

    const byline = buildAuthorByline();

    const img = byline.querySelector('.article-meta__author-image');
    expect(img).toHaveAttribute('src', '/media/authors/randy-oest.png');
    expect(img).toHaveAttribute('alt', '');
    expect(img.hidden).toBe(true);
  });

  it('reveals the image on load and removes it on error', () => {
    getMetadata.mockReturnValue('Randy Oest');
    const byline = buildAuthorByline();
    const img = byline.querySelector('.article-meta__author-image');
    const item = img.closest('.article-meta__author');

    img.dispatchEvent(new Event('load'));
    expect(img.hidden).toBe(false);

    img.dispatchEvent(new Event('error'));
    expect(item.querySelector('.article-meta__author-image')).toBeNull();
    expect(item.querySelector('.article-meta__author-name')).toHaveTextContent('Randy Oest');
  });

  it('does not render authors as links', () => {
    getMetadata.mockReturnValue('Randy Oest');

    const byline = buildAuthorByline();

    expect(byline.querySelector('a')).toBeNull();
  });

  it('returns a new element on every call', () => {
    expect(buildAuthorByline()).not.toBe(buildAuthorByline());
  });
});

describe('buildArticleAuthorMeta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    document.body.innerHTML = '';
  });

  it('does not inject when main is detached from the document', () => {
    mockTemplate('article');
    const main = document.createElement('main');
    main.append(createSection());

    buildArticleAuthorMeta(main);

    expect(main.querySelector('.article-meta')).toBeNull();
  });

  it('does not inject on non-article pages', () => {
    const main = document.createElement('main');
    main.append(createSection());
    document.body.append(main);

    buildArticleAuthorMeta(main);

    expect(main.querySelector('.article-meta')).toBeNull();
  });

  it('prepends the top meta and appends the bottom meta to the non-hero sections', () => {
    mockTemplate('article');
    const hero = createSection({ hero: true });
    const body = createSection();
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Body copy';
    body.append(paragraph);
    const preFooter = createSection();
    const main = document.createElement('main');
    main.append(hero, body, preFooter);
    document.body.append(main);

    buildArticleAuthorMeta(main);

    expect(hero.querySelector('.article-meta')).toBeNull();
    expect(body.firstElementChild.querySelector('.article-meta')).not.toBeNull();
    expect(preFooter.lastElementChild.querySelector('.article-meta')).not.toBeNull();
    // The meta lives in its own classless wrapper div, not directly as the
    // section's child, so decorateSections can't merge it into a shared
    // .default-content-wrapper with neighboring content.
    expect(body.firstElementChild).not.toHaveClass('article-meta');
    expect(body.firstElementChild.className).toBe('');
    expect(body.querySelector('.article-meta').tagName).toBe('ASIDE');
  });

  it('places both the top and bottom meta in the only section when there is no hero', () => {
    mockTemplate('article');
    const only = createSection();
    const main = document.createElement('main');
    main.append(only);
    document.body.append(main);

    buildArticleAuthorMeta(main);

    expect(only.firstElementChild.querySelector('.article-meta')).not.toBeNull();
    expect(only.lastElementChild.querySelector('.article-meta')).not.toBeNull();
    expect(only.querySelectorAll('.article-meta')).toHaveLength(2);
  });

  it('marks the top and bottom instances with article-meta--top/--bottom', () => {
    mockTemplate('article');
    const hero = createSection({ hero: true });
    const body = createSection();
    const main = document.createElement('main');
    main.append(hero, body);
    document.body.append(main);

    buildArticleAuthorMeta(main);

    expect(body.firstElementChild.querySelector('.article-meta')).toHaveClass('article-meta--top');
    expect(body.lastElementChild.querySelector('.article-meta')).toHaveClass('article-meta--bottom');
  });

  it('inserts the top meta right after the hero when authors skip the section break after it', () => {
    mockTemplate('article');
    const section = document.createElement('div');
    section.className = 'section';
    const hero = document.createElement('div');
    hero.className = 'hero';
    const leadIn = document.createElement('div');
    leadIn.className = 'lead-in';
    leadIn.textContent = 'Lead in text';
    section.append(hero, leadIn);
    const main = document.createElement('main');
    main.append(section);
    document.body.append(main);

    buildArticleAuthorMeta(main);

    expect(hero.nextElementSibling.querySelector('.article-meta')).not.toBeNull();
    expect(section.lastElementChild.querySelector('.article-meta')).not.toBeNull();
    expect(section.querySelectorAll('.article-meta')).toHaveLength(2);
  });
});

/**
 * Mirrors the DOM shape decorateSections leaves behind: a `.section` whose
 * `Section Metadata` table sits in its own wrapper div, as `.section-metadata`.
 */
function createSectionMetadataFixture(fields) {
  const meta = createKeyValueBlock(fields);
  meta.className = 'section-metadata';
  const wrapper = document.createElement('div');
  wrapper.append(meta);
  const section = document.createElement('div');
  section.className = 'section';
  section.append(wrapper);
  return { section, meta };
}

describe('decorateSectionMetadata', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('copies metadata keys onto section.dataset and removes the table', () => {
    const { section, meta } = createSectionMetadataFixture({ Toc: 'Section 1' });
    const main = document.createElement('main');
    main.append(section);

    decorateSectionMetadata(main);

    expect(section.dataset.toc).toBe('Section 1');
    expect(section.contains(meta)).toBe(false);
  });

  it('copies a Table of Contents metadata row onto section.dataset', () => {
    const { section, meta } = createSectionMetadataFixture({ 'Table of Contents': 'Section 1' });
    const main = document.createElement('main');
    main.append(section);

    decorateSectionMetadata(main);

    expect(section.dataset.tableOfContents).toBe('Section 1');
    expect(section.dataset.toc).toBeUndefined();
    expect(section.contains(meta)).toBe(false);
  });

  it('splits the style key into one or more section classes instead of a dataset entry', () => {
    const { section } = createSectionMetadataFixture({ Style: 'section-rounded-blue, highlight' });
    const main = document.createElement('main');
    main.append(section);

    decorateSectionMetadata(main);

    expect(section).toHaveClass('section-rounded-blue');
    expect(section).toHaveClass('highlight');
    expect(section.dataset.style).toBeUndefined();
  });

  it('does not touch sections without a Section Metadata table', () => {
    const section = createSection();
    const main = document.createElement('main');
    main.append(section);

    expect(() => decorateSectionMetadata(main)).not.toThrow();
    expect(section.dataset.toc).toBeUndefined();
    expect(section.dataset.tableOfContents).toBeUndefined();
  });
});
