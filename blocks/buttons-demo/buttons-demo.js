/**
 * Builds demo buttons, including disabled native and link markup.
 * Page dark mode is `:root[data-theme="dark"]`.
 * @param {Element} block The buttons-demo block element
 */
export default function decorate(block) {
  const makeBtn = (tag, opts = {}) => {
    const el = document.createElement(tag);
    Object.entries(opts).forEach(([k, v]) => {
      if (k === 'text') el.textContent = v;
      else if (k === 'disabled') el.disabled = v;
      else if (k.startsWith('aria')) el.setAttribute(k, v);
      else el[k] = v;
    });
    if (el.getAttribute('aria-disabled') === 'true') {
      el.tabIndex = -1;
      el.addEventListener('click', (event) => event.preventDefault());
    }
    return el;
  };

  const toggle = document.createElement('button');
  toggle.type = 'button';
  const syncToggle = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    toggle.textContent = dark ? 'Theme: dark' : 'Theme: light';
  };
  toggle.addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
    syncToggle();
  });
  syncToggle();

  const contentGroups = [
    {
      heading: 'Buttons added via custom block:',
      sets: [
        {
          paragraph: 'Default buttons:',
          darkSurface: false,
          buttons: [
            { tag: 'button', opts: { className: 'button', type: 'button', text: 'Default native button' } },
            { tag: 'a', opts: { className: 'button', href: '#', text: 'Default button as link' } },
          ],
        },
        {
          paragraph: 'Default buttons (disabled):',
          darkSurface: false,
          buttons: [
            {
              tag: 'button',
              opts: {
                className: 'button',
                type: 'button',
                disabled: true,
                text: 'Disabled native button',
              },
            },
            {
              tag: 'a',
              opts: {
                className: 'button',
                href: '#',
                'aria-disabled': 'true',
                text: 'Disabled button as link',
              },
            },
          ],
        },
        {
          paragraph: 'Static white buttons (shown against static dark surface):',
          darkSurface: true,
          buttons: [
            { tag: 'button', opts: { className: 'button button--static-white', type: 'button', text: 'Native button, static white' } },
            { tag: 'a', opts: { className: 'button button--static-white', href: '#', text: 'Button as link, static white' } },
          ],
        },
        {
          paragraph: 'Static white buttons (disabled):',
          darkSurface: true,
          buttons: [
            {
              tag: 'button',
              opts: {
                className: 'button button--static-white',
                type: 'button',
                disabled: true,
                text: 'Native button, static white',
              },
            },
            {
              tag: 'a',
              opts: {
                className: 'button button--static-white',
                href: '#',
                'aria-disabled': 'true',
                text: 'Button as link, static white',
              },
            },
          ],
        },
      ],
    },
  ];

  const elements = [toggle];
  contentGroups.forEach((group) => {
    elements.push(Object.assign(document.createElement('h2'), { textContent: group.heading }));
    group.sets.forEach((set) => {
      elements.push(Object.assign(document.createElement('p'), { textContent: set.paragraph }));
      const btnContainer = document.createElement('div');
      btnContainer.style.display = 'flex';
      btnContainer.style.flexDirection = 'column';
      btnContainer.style.gap = '0.5rem';
      if (set.darkSurface) {
        btnContainer.style.background = 'var(--s2a-color-background-knockout, #000)';
        btnContainer.style.padding = '1rem';
        btnContainer.style.borderRadius = '0.5rem';
      }
      set.buttons.forEach((btn) => {
        btnContainer.appendChild(makeBtn(btn.tag, btn.opts));
      });
      elements.push(btnContainer);
    });
  });

  block.replaceChildren(...elements);
}
