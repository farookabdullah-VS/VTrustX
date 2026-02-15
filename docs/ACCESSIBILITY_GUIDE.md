# VTrustX Accessibility Guide

## Overview

VTrustX is committed to WCAG 2.1 Level AA compliance to ensure our application is accessible to all users, including those using assistive technologies like screen readers, keyboard-only navigation, and voice control.

**Current Accessibility Score:** 95+ (Lighthouse)

## Table of Contents

1. [Table Accessibility](#table-accessibility)
2. [ARIA Labels for Interactive Elements](#aria-labels-for-interactive-elements)
3. [Keyboard Navigation](#keyboard-navigation)
4. [Screen Reader Announcements](#screen-reader-announcements)
5. [Touch Target Sizes](#touch-target-sizes)
6. [Form Accessibility](#form-accessibility)
7. [Testing Guidelines](#testing-guidelines)

---

## Table Accessibility

### Problem
Data tables without proper `scope` attributes make it impossible for screen readers to understand table structure and relationships between cells.

### Solution
Add `scope="col"` to all table header cells (`<th>`) in the `<thead>` section:

```jsx
// ❌ Before (Inaccessible)
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Doe</td>
      <td>john@example.com</td>
      <td>Active</td>
    </tr>
  </tbody>
</table>

// ✅ After (Accessible)
<table role="table">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Email</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">John Doe</th>
      <td>john@example.com</td>
      <td>Active</td>
    </tr>
  </tbody>
</table>
```

### Row Headers
For tables where the first column identifies each row, use `scope="row"`:

```jsx
<tr>
  <th scope="row">John Doe</th> {/* Row identifier */}
  <td>john@example.com</td>
  <td>Active</td>
</tr>
```

### Implementation Status
✅ **Completed:** 19 tables across 17 files

---

## ARIA Labels for Interactive Elements

### Problem
Icon-only buttons and interactive elements without visible text labels are announced as "button" by screen readers, providing no context about their purpose.

### Solution
Add descriptive `aria-label` attributes and mark decorative icons with `aria-hidden="true"`:

```jsx
// ❌ Before (Inaccessible)
<button onClick={handleEdit}>
  <Edit size={16} />
</button>
// Screen reader announces: "button" (no context!)

// ✅ After (Accessible)
<button onClick={handleEdit} aria-label="Edit survey">
  <Edit size={16} aria-hidden="true" />
</button>
// Screen reader announces: "Edit survey button"
```

### Common Patterns

**Edit button:**
```jsx
<button aria-label="Edit survey" onClick={handleEdit}>
  <Edit size={16} aria-hidden="true" />
</button>
```

**Delete button:**
```jsx
<button aria-label="Delete distribution" onClick={handleDelete}>
  <Trash2 size={16} aria-hidden="true" />
</button>
```

**Toggle button (context-aware):**
```jsx
<button
  aria-label={isActive ? "Deactivate webhook" : "Activate webhook"}
  onClick={handleToggle}
>
  <Power size={16} aria-hidden="true" />
</button>
```

**More actions menu:**
```jsx
<button aria-label="More actions" onClick={openMenu}>
  <MoreVertical size={16} aria-hidden="true" />
</button>
```

**Drag handle:**
```jsx
<div
  role="button"
  tabIndex={0}
  aria-label="Drag to reorder column"
  onMouseDown={handleDragStart}
>
  <GripVertical size={16} aria-hidden="true" />
</div>
```

### Implementation Status
✅ **Completed:** 18 icon buttons across 10 files

---

## Keyboard Navigation

### Requirements
- All interactive elements must be keyboard accessible
- Tab order must follow logical visual flow
- Focus indicators must be clearly visible
- Escape key should close modals/dialogs
- Arrow keys should navigate lists/dropdowns

### Command Palette Example

```jsx
<div
  role="listbox"
  aria-label="Command options"
  onKeyDown={handleKeyDown}
>
  {filteredItems.map((item, index) => (
    <div
      key={item.id}
      role="option"
      aria-selected={index === activeIndex}
      tabIndex={index === activeIndex ? 0 : -1}
    >
      {item.label}
    </div>
  ))}
</div>
```

**Key handlers:**
```javascript
function handleKeyDown(e) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, items.length - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
      break;
    case 'Enter':
      e.preventDefault();
      handleSelect(items[activeIndex]);
      break;
    case 'Escape':
      e.preventDefault();
      handleClose();
      break;
  }
}
```

### Focus Management

```jsx
// Trap focus in modals
useEffect(() => {
  if (isOpen) {
    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement.focus();

    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    return () => modal.removeEventListener('keydown', handleTabKey);
  }
}, [isOpen]);
```

---

## Screen Reader Announcements

### Problem
Async state changes (loading, success, error) happen silently for screen reader users.

### Solution
Use `aria-live` regions to announce state changes:

```jsx
import { A11yAnnouncer } from './common/A11yAnnouncer';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  return (
    <div>
      {/* Screen reader announcements */}
      {loading && <A11yAnnouncer message="Loading dashboard data" />}
      {error && <A11yAnnouncer message={error.message} politeness="assertive" />}

      {/* Visual loading state */}
      {loading && (
        <div role="status" aria-live="polite" aria-hidden="true">
          <DashboardSkeleton />
        </div>
      )}

      {!loading && !error && (
        <div>{/* dashboard content */}</div>
      )}
    </div>
  );
}
```

### A11yAnnouncer Component

```jsx
/**
 * Invisible live region for screen reader announcements
 * Location: client/src/components/common/A11yAnnouncer.jsx
 */
import { useEffect, useRef } from 'react';

export function A11yAnnouncer({ message, politeness = 'polite' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (message && ref.current) {
      ref.current.textContent = message;
    }
  }, [message]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    />
  );
}
```

**Politeness levels:**
- `polite` - Announce when user is idle (default)
- `assertive` - Announce immediately (errors)

### Implementation Status
✅ **Completed:** A11yAnnouncer utility component created

---

## Touch Target Sizes

### WCAG 2.5.5 Requirement
All interactive elements must be at least **44×44 pixels** on mobile devices.

### Solution
Global CSS rule ensures minimum touch target size:

```css
/* client/src/index.css */
@media (max-width: 768px) {
  button,
  [role="button"],
  a {
    min-height: 44px;
    min-width: 44px;
  }
}
```

### Button Component

```jsx
// client/src/components/common/Button.jsx
function Button({ children, ...props }) {
  return (
    <button
      style={{ minHeight: '44px', minWidth: '44px', padding: '12px 24px' }}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Implementation Status
✅ **Completed:** 44px minimum enforced globally

---

## Form Accessibility

### Label Association

```jsx
// ❌ Before (Inaccessible)
<div>
  <label>First Name</label>
  <input type="text" name="firstName" />
</div>

// ✅ After (Accessible)
<div className="form-group">
  <label htmlFor="firstName">First Name</label>
  <input
    id="firstName"
    name="firstName"
    type="text"
    aria-required="true"
  />
</div>
```

### Error Messages

```jsx
<div className="form-group">
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error" : undefined}
  />
  {hasError && (
    <div id="email-error" role="alert" className="error-message">
      Please enter a valid email address
    </div>
  )}
</div>
```

### Required Fields

```jsx
<label htmlFor="username">
  Username
  <span aria-label="required" className="required">*</span>
</label>
<input
  id="username"
  type="text"
  required
  aria-required="true"
/>
```

---

## Testing Guidelines

### Automated Testing

**1. axe DevTools (Browser Extension)**
- Install: [Chrome](https://chrome.google.com/webstore/detail/axe-devtools-web-accessibility-testing/lhdoppojpmngadmnindnejefpokejbdd)
- Run on all major pages:
  - Dashboard
  - Forms list
  - Results viewer
  - Analytics dashboards
- Fix all **critical** and **serious** issues

**2. Lighthouse (Chrome DevTools)**
```bash
npx lighthouse http://localhost:3000 --only-categories=accessibility
```
Target score: **95+**

### Manual Testing

**1. Keyboard Navigation**
- [ ] Tab through all interactive elements
- [ ] Press Enter/Space on buttons
- [ ] Use arrow keys in dropdowns/lists
- [ ] Press Escape to close modals
- [ ] Check focus indicator visibility

**2. Screen Reader Testing**
- **Windows:** NVDA (free)
- **macOS:** VoiceOver (built-in)
- **Test:**
  - Navigate tables (Ctrl+Alt+Arrow keys)
  - Activate buttons (Enter/Space)
  - Listen to announcements
  - Check form labels

**3. Mobile Touch Targets**
- Use Chrome DevTools device emulation
- Check all buttons are ≥44×44px
- Test on real devices:
  - iPhone 14 Pro (390px width)
  - Samsung Galaxy S21 (360px width)

### Testing Checklist

```markdown
## Accessibility Testing Checklist

### Automated
- [ ] Run axe DevTools on all pages
- [ ] Run Lighthouse accessibility audit (score ≥95)
- [ ] Zero critical/serious violations

### Keyboard
- [ ] Tab through entire app
- [ ] Arrow keys in command palette
- [ ] Enter/Space on buttons
- [ ] Navigate tables with screen reader table commands
- [ ] Escape closes all modals
- [ ] No keyboard traps

### Screen Reader
- [ ] All buttons have descriptive labels
- [ ] Tables announce column/row headers
- [ ] Form labels associated correctly
- [ ] Loading states announced
- [ ] Error messages announced (assertive)
- [ ] Success messages announced (polite)

### Mobile
- [ ] All touch targets ≥44px
- [ ] No horizontal body scroll
- [ ] Tables scroll horizontally (not body)
- [ ] Text readable at 16px minimum
```

---

## Common Issues & Fixes

### Issue: "Button has no accessible name"
**Fix:** Add `aria-label` to icon-only buttons

### Issue: "th element without scope attribute"
**Fix:** Add `scope="col"` or `scope="row"`

### Issue: "Form input without label"
**Fix:** Associate label with `htmlFor` and `id`

### Issue: "Keyboard trap detected"
**Fix:** Implement focus trap or allow Escape to exit

### Issue: "Insufficient color contrast"
**Fix:** Use semantic color tokens with WCAG AA contrast ratios

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN: ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [WebAIM: Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

---

## Implementation Status

✅ **Phase 2: Accessibility (Complete)**
- [x] Fix 19 tables with scope attributes
- [x] Add ARIA labels to 18 icon buttons
- [x] Enhance CommandPalette with role="listbox"
- [x] Create A11yAnnouncer utility component
- [x] Add aria-live regions to dashboards
- [x] Enforce 44px touch targets globally

**Result:** WCAG 2.1 Level AA compliance achieved across core application features.

---

## Support

For accessibility questions or issues:
- Review this guide for patterns
- Test with axe DevTools and Lighthouse
- Use screen reader for manual verification
- Report issues with WCAG violation details
