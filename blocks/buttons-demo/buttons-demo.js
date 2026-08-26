/**
 * Builds demo buttons for disabled native and link markup.
 * @param {Element} block The buttons-demo block element
 */
export default function decorate(block) {
  // Helper to make a button or link
  const makeBtn = (tag, opts = {}) => {
    const el = document.createElement(tag);
    Object.entries(opts).forEach(([k, v]) =>
      k === 'text'
        ? (el.textContent = v)
        : k === 'disabled'
          ? (el.disabled = v)
          : k.startsWith('aria')
            ? el.setAttribute(k, v)
            : (el[k] = v)
    );
    return el;
  };

  // Content configuration: headings, paragraphs, and button variants.
  const contentGroups = [
    {
      heading: 'Buttons added via custom block:',
      sets: [
        {
          paragraph: 'Default buttons:', buttons: [
            { tag: 'button', opts: { className: 'button', type: 'button', text: 'Default native button' } },
            { tag: 'a', opts: { className: 'button', href: '#', text: 'Default button as link' } },
          ]
        },
        {
          paragraph: 'Default buttons (disabled):', buttons: [
            { tag: 'button', opts: { className: 'button', type: 'button', disabled: true, text: 'Disabled native button' } },
            { tag: 'a', opts: { className: 'button', href: '#', 'aria-disabled': 'true', text: 'Disabled button as link' } },
          ]
        },
        {
          paragraph: 'Static white buttons:', buttons: [
            { tag: 'button', opts: { className: 'button button--static-white', type: 'button', text: 'Native button, static white' } },
            { tag: 'a', opts: { className: 'button button--static-white', href: '#', text: 'Button as link, static white' } },
          ]
        },
        {
          paragraph: 'Static white buttons (disabled):', buttons: [
            { tag: 'button', opts: { className: 'button button--static-white', type: 'button', disabled: true, text: 'Native button, static white' } },
            { tag: 'a', opts: { className: 'button button--static-white', href: '#', 'aria-disabled': 'true', text: 'Button as link, static white' } },
          ]
        },
      ],
    },
  ];

  const elements = [];
  contentGroups.forEach(group => {
    elements.push(Object.assign(document.createElement('h2'), { textContent: group.heading }));
    group.sets.forEach(set => {
      elements.push(Object.assign(document.createElement('p'), { textContent: set.paragraph }));
      // Create a container for the vertical button stack
      const btnContainer = document.createElement('div');
      btnContainer.style.display = 'flex';
      btnContainer.style.flexDirection = 'column';
      btnContainer.style.gap = '0.5rem'; // Space between buttons
      set.buttons.forEach(btn => {
        btnContainer.appendChild(makeBtn(btn.tag, btn.opts));
      });
      elements.push(btnContainer);
    });
  });

  block.replaceChildren(...elements);
}
