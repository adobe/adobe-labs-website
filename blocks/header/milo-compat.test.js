/**
 * Labs shims for Milo APIs used by the copied global-navigation sources.
 */
import { decorateLinksAsync } from './milo-compat.js';

describe('milo-compat decorateLinksAsync', () => {
  it('turns authored svg | alt links into images', async () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <a href="/federal/assets/svgs/creative-cloud.svg">
        https://example.com/creative-cloud.svg | Adobe Creative Cloud
      </a>
      <a href="https://www.adobe.com/creativecloud.html">Creative Cloud</a>
    `;

    await decorateLinksAsync(root);

    const img = root.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', '/federal/assets/svgs/creative-cloud.svg');
    expect(img).toHaveAttribute('alt', 'Adobe Creative Cloud');
    expect(root.querySelector('a[href*=".svg"]')).toBeNull();
    expect(root.querySelector('a[href="https://www.adobe.com/creativecloud.html"]')).not.toBeNull();
  });

  it('leaves ordinary links unchanged', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<a href="/photoshop">Photoshop</a>';

    await decorateLinksAsync(root);

    expect(root.querySelector('a')).toHaveTextContent('Photoshop');
    expect(root.querySelector('img')).toBeNull();
  });
});
