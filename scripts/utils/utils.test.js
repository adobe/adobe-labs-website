import { within } from '@testing-library/dom';
import { buildBlock, getMetadata } from '../aem.js';
import {
  buildArticleMetaActions,
  buildArticlePreFooter,
  buildPlayIcon,
  ensureSkipLink,
  decorateArticleSections,
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
  const now = new Date(2026, 7, 25);

  it('formats a current-year date as Month Day', () => {
    expect(formatCardDate('2026-10-21', now)).toBe('Oct 21');
  });

  it('includes the year when the date is not this year', () => {
    expect(formatCardDate('2027-10-21', now)).toBe('Oct 21, 2027');
  });

  it('includes the year for past years', () => {
    expect(formatCardDate('2025-10-21', now)).toBe('Oct 21, 2025');
  });

  it('parses authored month-name dates', () => {
    expect(formatCardDate('August 3, 2026', now)).toBe('Aug 3');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatCardDate('not a date', now)).toBe('');
    expect(formatCardDate('', now)).toBe('');
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
      expect(group.querySelector('[data-meta-action="feedback"]')).toBeNull();
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
      expect(download).toHaveAttribute('href', 'https://example.com/data.zip');
      expect(download).toHaveAttribute('data-meta-action', 'download');
      expect(download).toHaveAttribute('download', 'data.zip');
      expect(group.querySelector('[data-meta-action="feedback"]')).toBeNull();
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
