/**
 * Runs the author byline through the real (unmocked) aem.js section/block
 * decoration pipeline, not just buildArticleAuthorMeta in isolation. This is
 * the only way to catch real bugs a mocked-aem.js unit test can't see:
 *  - decorateSections nesting `.article-meta` inside a shared
 *    `.default-content-wrapper`, which caps it to that wrapper's narrow
 *    --article-content-inline-size-sm instead of its own wider width.
 *  - decorateBlocks treating any classed `div.section > div > div` as a
 *    block and trying to load a nonexistent `blocks/<name>/<name>.js`.
 *  - `.article-meta-section` (the class decorateArticleMetaSections adds)
 *    landing on the correct element — the actual `main > .section > div`
 *    decorateSections creates — not one level too deep, which is what
 *    caused a subtle ~24px misalignment against `.lead-in-wrapper` (that
 *    rule's `--article-content-inline-size-*` values already assume they're
 *    applied to the same element that carries the site's inline padding).
 */
import { decorateSections, decorateBlocks } from '../aem.js';
import { buildArticleAuthorMeta, decorateArticleMetaSections, decorateArticleSections } from './utils.js';

function decorate(main) {
  buildArticleAuthorMeta(main);
  decorateSections(main);
  decorateArticleSections(main);
  decorateArticleMetaSections(main);
  decorateBlocks(main);
}

describe('article meta section structure (real aem.js pipeline)', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="template" content="article">';
    document.body.innerHTML = '';
  });

  it('does not get swept up by decorateBlocks as a phantom block', () => {
    document.body.innerHTML = '<main>'
      + '<div><div class="hero"></div></div>'
      + '<div><h2>Heading</h2><p>Body copy</p></div>'
      + '</main>';
    const main = document.querySelector('main');
    document.body.append(main);

    decorate(main);

    const meta = main.querySelector('.article-meta');
    expect(meta.tagName).toBe('ASIDE');
    expect(meta.classList.contains('block')).toBe(false);
    expect(meta.dataset.blockName).toBeUndefined();
    expect(meta.closest('.section').classList.contains('article-meta-container')).toBe(false);
  });

  it('is not nested inside a .default-content-wrapper, so its own width rules apply', () => {
    document.body.innerHTML = '<main>'
      + '<div><div class="hero"></div></div>'
      + '<div><h2>Heading</h2><p>Body copy</p></div>'
      + '</main>';
    const main = document.querySelector('main');
    document.body.append(main);

    decorate(main);

    main.querySelectorAll('.article-meta').forEach((meta) => {
      expect(meta.closest('.default-content-wrapper')).toBeNull();
    });
  });

  it('sits as a section-level sibling of .lead-in-wrapper when hero and lead-in share a section', () => {
    document.body.innerHTML = '<main>'
      + '<div>'
      + '<div class="hero"></div>'
      + '<div class="lead-in"><div><div>Lead in text</div></div></div>'
      + '<p>Body copy</p>'
      + '</div>'
      + '</main>';
    const main = document.querySelector('main');
    document.body.append(main);

    decorate(main);

    const meta = main.querySelector('.article-meta');
    const leadInWrapper = main.querySelector('.lead-in-wrapper');
    expect(leadInWrapper).not.toBeNull();
    expect(meta.closest('.default-content-wrapper')).toBeNull();
    // Same section as lead-in-wrapper, and not nested inside it or vice
    // versa — structurally parallel, so it shares the same width/centering.
    expect(meta.closest('.section')).toBe(leadInWrapper.closest('.section'));
    expect(leadInWrapper.contains(meta)).toBe(false);
    expect(meta.contains(leadInWrapper)).toBe(false);
  });

  it('names the actual section-level wrapper .article-meta-section, at the same depth as .lead-in-wrapper', () => {
    document.body.innerHTML = '<main>'
      + '<div>'
      + '<div class="hero"></div>'
      + '<div class="lead-in"><div><div>Lead in text</div></div></div>'
      + '<p>Body copy</p>'
      + '</div>'
      + '</main>';
    const main = document.querySelector('main');
    document.body.append(main);

    decorate(main);

    const section = main.querySelector('.section');
    const metaSection = main.querySelector('.article-meta-section');
    const leadInWrapper = main.querySelector('.lead-in-wrapper');

    expect(metaSection).not.toBeNull();
    // Direct child of .section — the same structural position lead-in's own
    // wrapper occupies — not a level deeper, which is what threw off width.
    expect(metaSection.parentElement).toBe(section);
    expect(leadInWrapper.parentElement).toBe(section);
    expect(metaSection.contains(main.querySelector('.article-meta'))).toBe(true);
  });
});
