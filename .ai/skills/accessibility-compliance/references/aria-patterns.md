# ARIA Patterns and Best Practices

## Overview

ARIA (Accessible Rich Internet Applications) provides attributes to enhance accessibility when native HTML semantics are insufficient. The first rule of ARIA is: don't use ARIA if native HTML can do the job.

Examples in this document use vanilla JavaScript and native DOM APIs (no framework or build step required), so patterns can be dropped into any codebase.

## ARIA Fundamentals

### Roles

Roles define what an element is or does.

```html
<!-- Widget roles -->
<div role="button">Click me</div>
<div role="checkbox" aria-checked="true">Option</div>
<div role="slider" aria-valuenow="50">Volume</div>

<!-- Landmark roles (prefer semantic HTML) -->
<main>...</main>
<!-- Fallback: <div role="main"> -->
<nav>...</nav>
<!-- Fallback: <div role="navigation"> -->
<header>...</header>
<!-- Fallback: <div role="banner"> -->

<!-- Document structure roles -->
<div role="region" aria-label="Featured">...</div>
<div role="group" aria-label="Formatting options">...</div>
```

### States and Properties

States indicate current conditions; properties describe relationships.

```html
<!-- States (can change) -->
aria-checked="true|false|mixed" aria-disabled="true|false"
aria-expanded="true|false" aria-hidden="true|false" aria-pressed="true|false"
aria-selected="true|false"

<!-- Properties (usually static) -->
aria-label="Accessible name" aria-labelledby="id-of-label"
aria-describedby="id-of-description" aria-controls="id-of-controlled-element"
aria-owns="id-of-owned-element" aria-live="polite|assertive|off"
```

## Common ARIA Patterns

### Accordion

```html
<div class="accordion">
  <h3>
    <button id="accordion-heading-0" aria-expanded="false" aria-controls="accordion-panel-0">
      Section 1
      <span aria-hidden="true">+</span>
    </button>
  </h3>
  <div id="accordion-panel-0" role="region" aria-labelledby="accordion-heading-0" hidden>
    Panel content
  </div>
  <!-- Repeat the heading/panel pair for each item -->
</div>
```

```js
function initAccordion(root) {
  const headers = root.querySelectorAll('h3 > button');

  headers.forEach((button) => {
    button.addEventListener('click', () => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      const isOpen = button.getAttribute('aria-expanded') === 'true';

      button.setAttribute('aria-expanded', String(!isOpen));
      panel.hidden = isOpen;
      button.querySelector('[aria-hidden]').textContent = isOpen ? '+' : '−';
    });
  });
}
```

### Tabs

```html
<div class="tabs">
  <div role="tablist" aria-label="Content tabs">
    <button role="tab" id="tab-0" aria-selected="true" aria-controls="panel-0" tabindex="0">
      Tab 1
    </button>
    <button role="tab" id="tab-1" aria-selected="false" aria-controls="panel-1" tabindex="-1">
      Tab 2
    </button>
  </div>
  <div id="panel-0" role="tabpanel" aria-labelledby="tab-0" tabindex="0">Panel 1 content</div>
  <div id="panel-1" role="tabpanel" aria-labelledby="tab-1" tabindex="0" hidden>Panel 2 content</div>
</div>
```

```js
function initTabs(root) {
  const tabs = [...root.querySelectorAll('[role="tab"]')];

  function selectTab(index) {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    });
    tabs[index].focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', (e) => {
      let newIndex = index;
      switch (e.key) {
        case 'ArrowRight':
          newIndex = (index + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          newIndex = (index - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = tabs.length - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      selectTab(newIndex);
    });
  });
}
```

### Menu Button

```html
<div class="menu-button">
  <button id="menu-button-1" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-1">
    Options
  </button>
  <ul id="menu-1" role="menu" aria-labelledby="menu-button-1" hidden>
    <li role="menuitem" tabindex="-1">Edit</li>
    <li role="menuitem" tabindex="-1">Duplicate</li>
    <li role="menuitem" tabindex="-1">Delete</li>
  </ul>
</div>
```

```js
function initMenuButton(root, { onSelect } = {}) {
  const button = root.querySelector('button[aria-haspopup="menu"]');
  const menu = root.querySelector('[role="menu"]');
  const items = [...menu.querySelectorAll('[role="menuitem"]')];
  let activeIndex = -1;

  function open() {
    button.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
  }

  function close() {
    button.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    activeIndex = -1;
  }

  function focusItem(index) {
    activeIndex = index;
    items[index]?.focus();
  }

  button.addEventListener('click', () => {
    if (menu.hidden) {
      open();
      focusItem(0);
    } else {
      close();
    }
  });

  button.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      open();
      focusItem(0);
    }
  });

  menu.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusItem(Math.min(activeIndex + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusItem(Math.max(activeIndex - 1, 0));
        break;
      case 'Escape':
        close();
        button.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        items[activeIndex]?.click();
        break;
      default:
        break;
    }
  });

  items.forEach((item, index) => {
    item.addEventListener('click', () => {
      onSelect?.(item, index);
      close();
      button.focus();
    });
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) close();
  });
}
```

### Combobox (Autocomplete)

```html
<div class="combobox">
  <input type="text" role="combobox" id="combobox-input" aria-expanded="false"
    aria-controls="listbox-1" aria-autocomplete="list" />
  <ul id="listbox-1" role="listbox" hidden></ul>
</div>
```

```js
function initCombobox(root, options) {
  const input = root.querySelector('input[role="combobox"]');
  const listbox = root.querySelector('[role="listbox"]');
  let activeIndex = -1;
  let filtered = options;

  function renderOptions() {
    listbox.innerHTML = '';
    filtered.forEach((option, index) => {
      const li = document.createElement('li');
      li.id = `option-${index}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(index === activeIndex));
      li.textContent = option;
      li.addEventListener('click', () => selectOption(option));
      li.addEventListener('mouseenter', () => setActive(index));
      listbox.append(li);
    });
  }

  function setActive(index) {
    activeIndex = index;
    input.setAttribute('aria-activedescendant', index >= 0 ? `option-${index}` : '');
    renderOptions();
  }

  function open() {
    filtered = options.filter((opt) => opt.toLowerCase().includes(input.value.toLowerCase()));
    input.setAttribute('aria-expanded', 'true');
    listbox.hidden = filtered.length === 0;
    renderOptions();
  }

  function close() {
    input.setAttribute('aria-expanded', 'false');
    listbox.hidden = true;
    activeIndex = -1;
  }

  function selectOption(option) {
    input.value = option;
    root.dispatchEvent(new CustomEvent('select', { detail: option, bubbles: true }));
    close();
  }

  input.addEventListener('input', open);
  input.addEventListener('focus', open);
  input.addEventListener('blur', () => setTimeout(close, 200));
  input.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        open();
        setActive(Math.min(activeIndex + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive(Math.max(activeIndex - 1, 0));
        break;
      case 'Enter':
        if (activeIndex >= 0) {
          e.preventDefault();
          selectOption(filtered[activeIndex]);
        }
        break;
      case 'Escape':
        close();
        break;
      default:
        break;
    }
  });
}
```

### Alert Dialog

```html
<div class="alert-dialog" role="alertdialog" aria-modal="true"
  aria-labelledby="dialog-title" aria-describedby="dialog-desc" hidden>
  <div class="backdrop"></div>
  <div class="dialog">
    <h2 id="dialog-title">Delete item?</h2>
    <p id="dialog-desc">This action cannot be undone.</p>
    <div class="actions">
      <button class="cancel-btn">Cancel</button>
      <button class="confirm-btn">Confirm</button>
    </div>
  </div>
</div>
```

```js
function initAlertDialog(root, { onConfirm, onCancel } = {}) {
  const backdrop = root.querySelector('.backdrop');
  const confirmBtn = root.querySelector('.confirm-btn');
  const cancelBtn = root.querySelector('.cancel-btn');
  let previouslyFocused = null;

  function open() {
    previouslyFocused = document.activeElement;
    root.hidden = false;
    confirmBtn.focus();
  }

  function close() {
    root.hidden = true;
    previouslyFocused?.focus();
  }

  confirmBtn.addEventListener('click', () => {
    onConfirm?.();
    close();
  });

  cancelBtn.addEventListener('click', () => {
    onCancel?.();
    close();
  });

  backdrop.addEventListener('click', () => {
    onCancel?.();
    close();
  });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      onCancel?.();
      close();
    }
  });

  return { open, close };
}
```

### Toolbar

```html
<div role="toolbar" aria-label="Text formatting">
  <button tabindex="0" aria-pressed="false" aria-label="Bold">B</button>
  <button tabindex="-1" aria-pressed="false" aria-label="Italic">I</button>
  <button tabindex="-1" aria-pressed="false" aria-label="Underline">U</button>
</div>
```

```js
function initToolbar(root) {
  const buttons = [...root.querySelectorAll('button')];
  let activeIndex = 0;

  function focusButton(index) {
    buttons[activeIndex].tabIndex = -1;
    activeIndex = index;
    buttons[activeIndex].tabIndex = 0;
    buttons[activeIndex].focus();
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const pressed = button.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', String(!pressed));
    });
  });

  root.addEventListener('keydown', (e) => {
    let newIndex = activeIndex;
    switch (e.key) {
      case 'ArrowRight':
        newIndex = (activeIndex + 1) % buttons.length;
        break;
      case 'ArrowLeft':
        newIndex = (activeIndex - 1 + buttons.length) % buttons.length;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = buttons.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    focusButton(newIndex);
  });
}
```

## Live Regions

### Polite Announcements

```html
<!-- Status messages that don't interrupt -->
<div id="search-status" role="status" aria-live="polite" aria-atomic="true"></div>

<!-- Progress indicator -->
<div id="loading-status" role="status" aria-live="polite"></div>
```

```js
function announceSearchStatus(count, query) {
  document.getElementById('search-status').textContent = `${count} results found for "${query}"`;
}

function updateLoadingStatus(progress) {
  document.getElementById('loading-status').textContent = `Loading: ${progress}% complete`;
}
```

### Assertive Announcements

```html
<!-- Important errors that should interrupt -->
<div id="error-alert" role="alert" aria-live="assertive"></div>
```

```js
function showError(message) {
  document.getElementById('error-alert').textContent = `Error: ${message}`;
}

// Form validation summary
function renderValidationSummary(root, errors) {
  root.innerHTML = '';
  if (errors.length === 0) return;

  root.setAttribute('role', 'alert');
  root.setAttribute('aria-live', 'assertive');

  const heading = document.createElement('h2');
  heading.textContent = 'Please fix the following errors:';

  const list = document.createElement('ul');
  errors.forEach((err) => {
    const li = document.createElement('li');
    li.textContent = err;
    list.append(li);
  });

  root.append(heading, list);
}
```

### Log Region

```html
<div class="chat-log" role="log" aria-live="polite" aria-relevant="additions"></div>
```

```js
function appendChatMessage(root, { author, text }) {
  const message = document.createElement('div');

  const authorEl = document.createElement('span');
  authorEl.className = 'author';
  authorEl.textContent = `${author}:`;

  const textEl = document.createElement('span');
  textEl.className = 'text';
  textEl.textContent = text;

  message.append(authorEl, textEl);
  root.append(message);
}
```

## Common Mistakes to Avoid

### 1. Redundant ARIA

```html
<!-- Bad: role="button" on a button -->
<button role="button">Click me</button>

<!-- Good: just use button -->
<button>Click me</button>

<!-- Bad: aria-label duplicating visible text -->
<button aria-label="Submit form">Submit form</button>

<!-- Good: just use visible text -->
<button>Submit form</button>
```

### 2. Invalid ARIA

```html
<!-- Bad: aria-selected on non-selectable element -->
<div aria-selected="true">Item</div>

<!-- Good: use with proper role -->
<div role="option" aria-selected="true">Item</div>

<!-- Bad: aria-expanded without aria-controls relationship -->
<button aria-expanded="true">Menu</button>
<div>Menu content</div>

<!-- Good: with aria-controls -->
<button aria-expanded="true" aria-controls="menu">Menu</button>
<div id="menu">Menu content</div>
```

### 3. Hidden Content Still Announced

```html
<!-- Bad: visually hidden but still in accessibility tree -->
<div style="display: none;">Hidden content</div>

<!-- Good: properly hidden -->
<div style="display: none;" aria-hidden="true">Hidden content</div>

<!-- Or just use hidden attribute (implicitly hidden) -->
<div hidden>Hidden content</div>
```

## Resources

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [ARIA in HTML](https://www.w3.org/TR/html-aria/)
- [Using ARIA](https://www.w3.org/TR/using-aria/)
