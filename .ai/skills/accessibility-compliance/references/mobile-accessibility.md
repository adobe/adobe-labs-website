# Mobile Accessibility

## Overview

Mobile accessibility ensures apps work for users with disabilities on iOS and Android devices. This includes support for screen readers (VoiceOver, TalkBack), motor impairments, and various visual disabilities.

Web examples in this document use vanilla JavaScript and native DOM APIs (no framework or build step required), so patterns can be dropped into any codebase.

## Touch Target Sizing

### Minimum Sizes

```css
/* WCAG 2.2 Level AA: 24x24px minimum */
.interactive-element {
  min-width: 24px;
  min-height: 24px;
}

/* WCAG 2.2 Level AAA / Apple HIG / Material Design: 44x44dp */
.touch-target {
  min-width: 44px;
  min-height: 44px;
}
```

### Touch Target Spacing

```html
<!-- Ensure adequate spacing between touch targets (e.g. 12px minimum gap) -->
<div class="button-group" style="display: flex; gap: 12px;">
  <button type="button" style="min-width: 44px; min-height: 44px;">Save</button>
  <button type="button" style="min-width: 44px; min-height: 44px;">
    Cancel
  </button>
</div>
```

```js
// Expand hit area without changing visual size (44x44 touch area)
function createIconButton({ label, icon }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.style.cssText = 'position: relative; padding: 12px; min-width: 44px; min-height: 44px;';

  const iconSpan = document.createElement('span');
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.style.cssText = 'display: block; width: 20px; height: 20px;';
  iconSpan.textContent = icon;

  button.append(iconSpan);
  return button;
}
```

## Screen reader support

On web, use ARIA attributes and live regions so VoiceOver (iOS Safari) and TalkBack (Android) get the same information.

```js
// Basic accessible button: label + hint
function createAccessibleButton({ title, hint }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', title);
  button.textContent = title;

  if (!hint) return [button];

  const hintId = `hint-${crypto.randomUUID()}`;
  button.setAttribute('aria-describedby', hintId);

  const hintEl = document.createElement('span');
  hintEl.id = hintId;
  hintEl.className = 'visually-hidden';
  hintEl.textContent = hint;

  return [button, hintEl];
}

// Complex component with grouped content and custom actions
function createProductCard(product, { onViewDetails, onAddToCart }) {
  const { name, price, rating } = product;

  const card = document.createElement('div');
  card.setAttribute('role', 'button');
  card.tabIndex = 0;
  card.setAttribute('aria-label', `${name}, ${price}, ${rating} stars`);

  const img = document.createElement('img');
  img.src = '';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');

  const nameEl = document.createElement('span');
  nameEl.textContent = name;

  const priceEl = document.createElement('span');
  priceEl.textContent = price;

  const addToCartLink = document.createElement('a');
  addToCartLink.href = '#';
  addToCartLink.setAttribute('aria-label', 'Add to cart');
  addToCartLink.textContent = 'Add to cart';

  card.append(img, nameEl, priceEl, addToCartLink);

  card.addEventListener('click', () => onViewDetails(product));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') onViewDetails(product);
  });
  addToCartLink.addEventListener('click', (e) => {
    e.stopPropagation();
    onAddToCart(product);
  });

  return card;
}
```

```html
<!-- Announcing dynamic changes (live region) -->
<div class="counter">
  <div role="status" aria-live="polite" aria-atomic="true">Count: 0</div>
  <button type="button" aria-label="Increment" aria-describedby="counter-hint">+</button>
  <span id="counter-hint" class="visually-hidden">Increases the counter by one</span>
</div>
```

```js
function initCounter(root) {
  const statusEl = root.querySelector('[role="status"]');
  const button = root.querySelector('button');
  let count = 0;

  function announce(message) {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.className = 'visually-hidden';
    el.textContent = message;
    document.body.append(el);
    setTimeout(() => el.remove(), 1000);
  }

  button.addEventListener('click', () => {
    count += 1;
    statusEl.textContent = `Count: ${count}`;
    announce(`Count is now ${count}`);
  });
}
```

## Gesture Accessibility

### Alternative Gestures

On web, provide a visible control for screen reader and keyboard users instead of relying on swipe-only actions.

```js
// Provide alternatives to complex gestures: always-visible delete for a11y
function createSwipeableCard(item, { onDelete }) {
  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'listitem');

  const title = document.createElement('span');
  title.className = 'card-title';
  title.textContent = item.title;

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.setAttribute('aria-label', `Delete ${item.title}`);
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', () => onDelete(item));

  card.append(title, deleteButton);
  return card;
}
```

### Motion and Animation

Respect the user's reduced motion preference (e.g. `prefers-reduced-motion: reduce`).

```css
/* Prefer CSS so reduced motion is automatic */
.animated {
  animation: slide 0.3s ease;
}

@media (prefers-reduced-motion: reduce) {
  .animated {
    animation: none;
  }
}
```

```js
// Fallback for animations applied via JS rather than CSS
function initAnimatedElement(el) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => {
    el.style.animation = mq.matches ? 'none' : 'slide 0.3s ease';
  };
  mq.addEventListener('change', apply);
  apply();
}
```

## Web text scaling

Use relative units and avoid fixing font sizes so browser and OS text scaling work.

```html
<!-- Scalable: use rem or em so text respects user font size -->
<p style="font-size: 1rem;">Scalable text</p>

<!-- Limit scaling with max() if needed (use sparingly) -->
<p style="font-size: clamp(1rem, 2vw, 1.5rem);">Limited scaling</p>
```

```css
/* Prefer rem for body text so it scales with user settings */
body {
  font-size: 100%; /* 16px default; user can change */
}

.component-title {
  font-size: 1.25rem;
}
```

## Testing Checklist

```markdown
## Screen reader testing

- [ ] All interactive elements have labels
- [ ] Focus order is logical
- [ ] All content is reachable in logical order
- [ ] Custom actions available for complex interactions
- [ ] Dynamic content announced (live regions)
- [ ] Headings properly marked and navigable via rotor
- [ ] Images have appropriate descriptions or are hidden
- [ ] Grouped content read together

## Motor accessibility

- [ ] Touch targets at least 44x44 points
- [ ] Adequate spacing between targets (8dp minimum)
- [ ] Alternatives to complex gestures
- [ ] No time-limited interactions

## Visual accessibility

- [ ] Text scales to 200% without loss
- [ ] Content visible in high contrast mode
- [ ] Color not sole indicator
- [ ] Animations respect reduced motion
```

## Resources

- [Apple Accessibility Programming Guide](https://developer.apple.com/accessibility/)
- [Android Accessibility Developer Guide](https://developer.android.com/guide/topics/ui/accessibility)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [Mobile Accessibility WCAG](https://www.w3.org/TR/mobile-accessibility-mapping/)
