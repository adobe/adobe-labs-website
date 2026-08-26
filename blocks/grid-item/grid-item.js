function getFields(block) {
  const fields = {};
  [...block.children].forEach((row) => {
    const [label, cell] = row.children;
    if (!label || !cell) return;
    const name = label.textContent.trim().toLowerCase().replace(/\s+/g, '-');
    fields[name] = cell;
  });
  return fields;
}

function textFrom(cell) {
  return cell?.textContent.trim() || '';
}

function hrefFrom(cell) {
  if (!cell) return '';
  const link = cell.querySelector('a[href]');
  return link ? link.href : textFrom(cell);
}

function safeHref(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.href);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch {
    /* ignore invalid URLs */
  }
  return '';
}

function mediaFrom(cell) {
  if (!cell) return null;
  return cell.querySelector('picture') || cell.querySelector('img');
}

function htmlToFragment(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

function setText(root, selector, value) {
  const el = root.querySelector(selector);
  if (!el) return;
  if (value) el.textContent = value;
  else el.remove();
}

const CATEGORY_PATHS = {
  research: '/research',
  workflows: '/workflows',
  sneaks: '/sneaks',
  playground: '/playground',
};

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^0-9a-z]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveCategory(name) {
  if (!name) return null;
  const slug = toSlug(name);
  const path = CATEGORY_PATHS[slug];
  if (!path) return null;
  return { slug, path, label: name };
}

function isTrue(cell) {
  return /^(true|yes|1)$/i.test(textFrom(cell));
}

export default function decorate(block) {
  const fields = getFields(block);
  const title = textFrom(fields.title);
  const href = safeHref(hrefFrom(fields.url));
  const category = resolveCategory(textFrom(fields.category));
  const subhead = textFrom(fields.subhead);
  const alt = textFrom(fields['alt-text']);
  const media = mediaFrom(fields.image);
  const isVideo = isTrue(fields.isvideo || fields['is-video']);
  const mainTag = href ? 'a' : 'div';

  const root = htmlToFragment(`
    ${category ? `<a class="grid-item__category label">
      <span class="grid-item__category-swatch" aria-hidden="true"></span>
      <span class="grid-item__category-name"></span>
    </a>` : ''}
    <${mainTag} class="grid-item__main">
      ${isVideo ? '<span class="visually-hidden">Video article</span>' : ''}
      <div class="grid-item__image">
        ${isVideo ? `<span class="grid-item__play" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" focusable="false">
            <path fill="currentColor" d="M9.95 5.079c.467.269.467.943 0 1.212L3.05 10.275C2.583 10.544 2 10.207 2 9.668V1.701c0-.539.583-.876 1.05-.606z"/>
          </svg>
        </span>` : ''}
      </div>
      <div class="grid-item__body">
        <p class="grid-item__title heading-6"></p>
        ${subhead ? '<p class="grid-item__subhead body-md"></p>' : ''}
      </div>
    </${mainTag}>
  `);

  const main = root.querySelector('.grid-item__main');
  if (href) main.href = href;

  if (media) {
    const img = media.tagName === 'IMG' ? media : media.querySelector('img');
    if (img) {
      if (alt) img.alt = alt;
      else if (title || subhead) img.alt = '';
    }
    const image = root.querySelector('.grid-item__image');
    const play = image.querySelector('.grid-item__play');
    if (play) play.before(media);
    else image.append(media);
  }

  if (category) {
    const categoryEl = root.querySelector('.grid-item__category');
    categoryEl.href = category.path;
    setText(root, '.grid-item__category-name', category.label);
    block.dataset.category = category.slug;
  }

  if (subhead) setText(root, '.grid-item__subhead', subhead);
  setText(root, '.grid-item__title', title);

  block.replaceChildren(root);
}
