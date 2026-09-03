# WCAG 2.2 Guidelines Reference

## Overview

The Web Content Accessibility Guidelines (WCAG) 2.2 provide recommendations for making web content more accessible. They are organized into four principles (POUR): Perceivable, Operable, Understandable, and Robust.

Examples in this document use vanilla JavaScript and native DOM APIs (no framework or build step required), so patterns can be dropped into any codebase.

## Conformance Levels

- **Level A**: Minimum accessibility (must satisfy)
- **Level AA**: Standard accessibility (should satisfy)
- **Level AAA**: Enhanced accessibility (may satisfy)

Most organizations target Level AA compliance.

## Principle 1: Perceivable

Content must be presentable in ways users can perceive.

### 1.1 Text Alternatives

#### 1.1.1 Non-text Content (Level A)

All non-text content needs text alternatives.

```html
<!-- Images -->
<img src="chart.png" alt="Q3 sales increased 25% compared to Q2" />

<!-- Decorative images -->
<img src="decorative-line.svg" alt="" role="presentation" />

<!-- Complex images with long descriptions -->
<figure>
  <img src="org-chart.png" alt="Organization chart" aria-describedby="org-desc" />
  <figcaption id="org-desc">
    The CEO reports to the board. Three VPs report to the CEO:
    VP Engineering, VP Sales, and VP Marketing...
  </figcaption>
</figure>

<!-- Icons with meaning -->
<button aria-label="Delete item">
  <svg aria-hidden="true" class="icon-trash"><!-- ... --></svg>
</button>

<!-- Icon buttons with visible text -->
<button>
  <svg aria-hidden="true" class="icon-download"><!-- ... --></svg>
  <span>Download</span>
</button>
```

### 1.2 Time-based Media

#### 1.2.1 Audio-only and Video-only (Level A)

```html
<!-- Audio with transcript -->
<audio src="podcast.mp3" controls></audio>
<details>
  <summary>View transcript</summary>
  <p>Full transcript text here...</p>
</details>

<!-- Video with captions -->
<video controls>
  <source src="tutorial.mp4" type="video/mp4" />
  <track kind="captions" src="captions-en.vtt" srclang="en" label="English" />
  <track kind="subtitles" src="subtitles-es.vtt" srclang="es" label="Spanish" />
</video>
```

### 1.3 Adaptable

#### 1.3.1 Info and Relationships (Level A)

Structure and relationships must be programmatically determinable.

```html
<!-- Proper heading hierarchy -->
<main>
  <h1>Page Title</h1>
  <section>
    <h2>Section Title</h2>
    <h3>Subsection</h3>
  </section>
</main>

<!-- Data tables with headers -->
<table>
  <caption>Quarterly Sales Report</caption>
  <thead>
    <tr>
      <th scope="col">Product</th>
      <th scope="col">Q1</th>
      <th scope="col">Q2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Widget A</th>
      <td>$10,000</td>
      <td>$12,000</td>
    </tr>
  </tbody>
</table>

<!-- Lists for grouped content -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>
```

#### 1.3.5 Identify Input Purpose (Level AA)

```html
<!-- Input with autocomplete for autofill -->
<form>
  <label for="name">Full Name</label>
  <input id="name" name="name" autocomplete="name" />

  <label for="email">Email</label>
  <input id="email" name="email" type="email" autocomplete="email" />

  <label for="phone">Phone</label>
  <input id="phone" name="phone" type="tel" autocomplete="tel" />

  <label for="address">Street Address</label>
  <input id="address" name="address" autocomplete="street-address" />

  <label for="cc">Credit Card Number</label>
  <input id="cc" name="cc" autocomplete="cc-number" />
</form>
```

### 1.4 Distinguishable

#### 1.4.1 Use of Color (Level A)

```html
<!-- Bad: color only indicates error -->
<input class="has-error" />

<!-- Good: color plus icon and text -->
<div>
  <input class="has-error" aria-invalid="true" aria-describedby="error-message" />
  <p id="error-message" class="field-error">
    <svg aria-hidden="true" class="icon-alert"><!-- ... --></svg>
    This field is required
  </p>
</div>
```

```js
// Toggle the error state and its message together
function setFieldError(input, errorEl, hasError) {
  input.classList.toggle('has-error', hasError);
  input.setAttribute('aria-invalid', String(hasError));
  input.setAttribute('aria-describedby', hasError ? errorEl.id : '');
  errorEl.hidden = !hasError;
}
```

#### 1.4.3 Contrast (Minimum) (Level AA)

```css
/* Minimum contrast ratios */
/* Normal text: 4.5:1 */
/* Large text (18pt+ or 14pt bold+): 3:1 */

/* Good contrast examples */
.text-on-white {
  color: #595959; /* 7:1 ratio on white */
}

.text-on-dark {
  color: #ffffff;
  background: #333333; /* 12.6:1 ratio */
}

/* Link must be distinguishable from surrounding text */
.link {
  color: #0066cc; /* 4.5:1 on white */
  text-decoration: underline; /* Additional visual cue */
}
```

#### 1.4.11 Non-text Contrast (Level AA)

```css
/* UI components need 3:1 contrast */
.button {
  border: 2px solid #767676; /* 3:1 against white */
  background: white;
}

.input {
  border: 1px solid #767676;
}

.input:focus {
  outline: 2px solid #0066cc; /* Focus indicator needs 3:1 */
  outline-offset: 2px;
}

/* Custom checkbox */
.checkbox {
  border: 2px solid #767676;
}

.checkbox:checked {
  background: #0066cc;
  border-color: #0066cc;
}
```

#### 1.4.12 Text Spacing (Level AA)

Content must not be lost when user adjusts text spacing.

```css
/* Allow text spacing adjustments without breaking layout */
.content {
  /* Use relative units */
  line-height: 1.5; /* At least 1.5x font size */
  letter-spacing: 0.12em; /* Support for 0.12em */
  word-spacing: 0.16em; /* Support for 0.16em */

  /* Don't use fixed heights on text containers */
  min-height: auto;

  /* Allow wrapping */
  overflow-wrap: break-word;
}

/* Test with these values: */
/* Line height: 1.5x font size */
/* Letter spacing: 0.12em */
/* Word spacing: 0.16em */
/* Paragraph spacing: 2x font size */
```

#### 1.4.13 Content on Hover or Focus (Level AA)

```html
<!-- Tooltip pattern -->
<span class="tooltip-trigger" tabindex="0">
  Hover or focus me
  <span role="tooltip" class="tooltip" hidden>Helpful information</span>
</span>
```

```js
function initTooltip(trigger) {
  const tooltip = trigger.querySelector('[role="tooltip"]');

  function show() {
    tooltip.hidden = false;
  }

  function hide() {
    tooltip.hidden = true;
  }

  // Dismissible: user can close without moving the pointer
  trigger.addEventListener('keydown', (e) => e.key === 'Escape' && hide());

  // Hoverable: content stays visible when the pointer moves onto it
  trigger.addEventListener('mouseenter', show);
  tooltip.addEventListener('mouseenter', show);
  trigger.addEventListener('mouseleave', hide);
  tooltip.addEventListener('mouseleave', hide);

  // Persistent: stays visible until the trigger loses focus/hover
  trigger.addEventListener('focus', show);
  trigger.addEventListener('blur', hide);
}
```

## Principle 2: Operable

Interface components must be operable by all users.

### 2.1 Keyboard Accessible

#### 2.1.1 Keyboard (Level A)

All functionality must be operable via keyboard.

```html
<!-- Avoid: reimplementing a button with a div -->
<div role="button" tabindex="0" class="custom-button">Save</div>

<!-- Better: just use a button -->
<button type="button">Save</button>
```

```js
// Only needed for the div version above — a real <button> gets this for free
function initCustomButton(el, onClick) {
  el.addEventListener('click', onClick);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  });
}
```

#### 2.1.2 No Keyboard Trap (Level A)

```html
<!-- Modal with proper focus management -->
<div role="dialog" aria-modal="true" class="modal" hidden>
  <button class="modal-close">Close</button>
  <div class="modal-content"><!-- modal content --></div>
</div>
```

```js
function initModal(root) {
  const closeButton = root.querySelector('.modal-close');
  let previouslyFocused = null;

  function open() {
    previouslyFocused = document.activeElement;
    root.hidden = false;
    closeButton.focus();
  }

  function close() {
    root.hidden = true;
    previouslyFocused?.focus();
  }

  // Allow Escape to close
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  closeButton.addEventListener('click', close);

  return { open, close };
}
```

Pair this with a focus trap (cycle `Tab`/`Shift+Tab` between the modal's first and last focusable elements) so focus can't escape to the page behind it while it's open.

### 2.4 Navigable

#### 2.4.1 Bypass Blocks (Level A)

```html
<!-- Skip links -->
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <a href="#nav" class="skip-link">Skip to navigation</a>

  <header>...</header>

  <nav id="nav" aria-label="Main">...</nav>

  <main id="main" tabindex="-1">
    <!-- Main content -->
  </main>
</body>
```

#### 2.4.4 Link Purpose (In Context) (Level A)

```html
<!-- Bad: ambiguous link text -->
<a href="/report">Click here</a>
<a href="/report">Read more</a>

<!-- Good: descriptive link text -->
<a href="/report">View quarterly sales report</a>

<!-- Good: context provides meaning -->
<article>
  <h2>Quarterly Sales Report</h2>
  <p>Sales increased by 25% this quarter...</p>
  <a href="/report">Read full report</a>
</article>

<!-- Good: visually hidden text for context -->
<a href="/report">
  Read more
  <span class="visually-hidden"> about quarterly sales report</span>
</a>
```

#### 2.4.7 Focus Visible (Level AA)

```css
/* Always show focus indicator */
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* Custom focus styles */
.button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-focus);
}

/* High visibility focus for links */
.link:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
  background: var(--color-focus-bg);
}
```

### 2.5 Input Modalities (New in 2.2)

#### 2.5.8 Target Size (Minimum) (Level AA) - NEW

Interactive targets must be at least 24x24 CSS pixels.

```css
/* Minimum target size */
.interactive {
  min-width: 24px;
  min-height: 24px;
}

/* Recommended size for touch (44x44) */
.touch-target {
  min-width: 44px;
  min-height: 44px;
}

/* Inline links are exempt if they have adequate spacing */
.link {
  /* Inline text links don't need minimum size */
  /* but should have adequate line-height */
  line-height: 1.5;
}
```

## Principle 3: Understandable

Content and interface must be understandable.

### 3.1 Readable

#### 3.1.1 Language of Page (Level A)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    ...
  </head>
  <body>
    ...
  </body>
</html>
```

#### 3.1.2 Language of Parts (Level AA)

```html
<p>
  The French phrase <span lang="fr">c'est la vie</span> means "that's life."
</p>
```

### 3.2 Predictable

#### 3.2.2 On Input (Level A)

Don't automatically change context on input.

```html
<!-- Bad: auto-submits on selection -->
<select id="country-autosubmit">
  <option>Select country</option>
</select>

<!-- Good: explicit submit action -->
<form>
  <select id="country">
    <option>Select country</option>
  </select>
  <button type="submit">Continue</button>
</form>
```

```js
// Bad: changes context without warning
document.getElementById('country-autosubmit')
  .addEventListener('change', (e) => e.target.form.submit());

// Good: just update state, let the user submit explicitly
document.getElementById('country')
  .addEventListener('change', (e) => setCountry(e.target.value));
```

### 3.3 Input Assistance

#### 3.3.1 Error Identification (Level A)

```html
<div class="form-field">
  <label for="email">Email</label>
  <input id="email" aria-invalid="false" />
</div>
```

```js
function setFieldError(fieldEl, error) {
  const input = fieldEl.querySelector('input');
  const errorId = `${input.id}-error`;

  input.setAttribute('aria-invalid', String(!!error));
  input.setAttribute('aria-describedby', error ? errorId : '');

  let errorEl = fieldEl.querySelector(`#${errorId}`);
  if (error) {
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.id = errorId;
      errorEl.setAttribute('role', 'alert');
      errorEl.className = 'field-error';
      fieldEl.append(errorEl);
    }
    errorEl.textContent = error;
  } else {
    errorEl?.remove();
  }
}
```

#### 3.3.7 Redundant Entry (Level A) - NEW

Don't require users to re-enter previously provided information.

```html
<!-- Auto-fill shipping address from billing -->
<form>
  <fieldset>
    <legend>Billing Address</legend>
    <!-- billing address fields -->
  </fieldset>

  <label>
    <input type="checkbox" id="same-as-billing" />
    Shipping same as billing
  </label>

  <fieldset id="shipping-fieldset">
    <legend>Shipping Address</legend>
    <!-- shipping address fields -->
  </fieldset>
</form>
```

```js
function initCheckoutForm(form) {
  const sameAsBilling = form.querySelector('#same-as-billing');
  const shippingFieldset = form.querySelector('#shipping-fieldset');
  const billingFields = form.querySelector('fieldset').elements;

  sameAsBilling.addEventListener('change', () => {
    shippingFieldset.hidden = sameAsBilling.checked;
    if (sameAsBilling.checked) copyFieldValues(billingFields, shippingFieldset.elements);
  });
}
```

## Principle 4: Robust

Content must be robust enough for assistive technologies.

### 4.1 Compatible

#### 4.1.2 Name, Role, Value (Level A)

```html
<!-- Custom components must expose name, role, and value -->
<button role="checkbox" aria-checked="false" aria-label="Subscribe to newsletter">
  <span aria-hidden="true">○</span> Subscribe to newsletter
</button>

<div role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"
  aria-label="Volume" tabindex="0" class="slider">
  <div class="slider-fill"></div>
</div>
```

```js
function initCustomCheckbox(button) {
  button.addEventListener('click', () => {
    const checked = button.getAttribute('aria-checked') === 'true';
    button.setAttribute('aria-checked', String(!checked));
    button.querySelector('[aria-hidden]').textContent = checked ? '○' : '✓';
  });
}

function initCustomSlider(root, { min, max, onChange }) {
  const fill = root.querySelector('.slider-fill');

  function setValue(value) {
    const clamped = Math.min(Math.max(value, min), max);
    root.setAttribute('aria-valuenow', clamped);
    fill.style.width = `${((clamped - min) / (max - min)) * 100}%`;
    onChange(clamped);
  }

  root.addEventListener('keydown', (e) => {
    const current = Number(root.getAttribute('aria-valuenow'));
    if (e.key === 'ArrowRight') setValue(current + 1);
    if (e.key === 'ArrowLeft') setValue(current - 1);
  });
}
```

## Testing Checklist

```markdown
## Keyboard Testing

- [ ] All interactive elements focusable with Tab
- [ ] Focus order matches visual order
- [ ] Focus indicator always visible
- [ ] No keyboard traps
- [ ] Escape closes modals/dropdowns
- [ ] Enter/Space activates buttons and links

## Screen Reader Testing

- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Headings in logical order
- [ ] Landmarks present (main, nav, header, footer)
- [ ] Dynamic content announced
- [ ] Error messages announced

## Visual Testing

- [ ] Text contrast at least 4.5:1
- [ ] UI component contrast at least 3:1
- [ ] Works at 200% zoom
- [ ] Content readable with text spacing
- [ ] Focus indicators visible
- [ ] Color not sole indicator of meaning
```

## Resources

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
- [Techniques for WCAG 2.2](https://www.w3.org/WAI/WCAG22/Techniques/)
