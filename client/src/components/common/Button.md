# Button Component Usage Guide

## Overview

The Button component system replaces the aggressive global `button` styling with intentional, scoped button variants. This provides consistency while allowing flexibility for different use cases.

---

## Problem Solved

**Before:**
- Global `button` selector forced ALL buttons to have gradient, uppercase text, and specific styling
- Required constant inline style overrides
- Broke SurveyJS and other third-party components
- Inconsistent button appearances across the app

**After:**
- Scoped `.btn` classes only apply intentional styling
- Clean, unstyled buttons by default
- No conflicts with third-party components
- Consistent, predictable button variants

---

## Basic Usage

### Import
```jsx
import { Button, IconButton, ButtonGroup } from './common/Button';
```

### Primary Button (Default)
```jsx
<Button onClick={handleClick}>Save Changes</Button>
```

### Button Variants
```jsx
{/* Primary - Gradient teal (VTrustX branded) */}
<Button variant="primary">Primary Action</Button>

{/* Secondary - Light gray */}
<Button variant="secondary">Secondary Action</Button>

{/* Danger - Red for destructive actions */}
<Button variant="danger">Delete</Button>

{/* Success - Green for positive actions */}
<Button variant="success">Approve</Button>

{/* Ghost - Transparent with border */}
<Button variant="ghost">Cancel</Button>

{/* Text - No background */}
<Button variant="text">Learn More</Button>
```

### Sizes
```jsx
<Button size="sm">Small</Button>
<Button size="md">Medium (Default)</Button>
<Button size="lg">Large</Button>
```

### With Icons
```jsx
import { Save, Trash2, Plus } from 'lucide-react';

{/* Icon on left (default) */}
<Button icon={<Save size={16} />}>Save</Button>

{/* Icon on right */}
<Button icon={<Trash2 size={16} />} iconPosition="right">Delete</Button>

{/* Icon only */}
<IconButton icon={<Plus size={20} />} aria-label="Add item" />
```

### States
```jsx
{/* Disabled */}
<Button disabled>Disabled Button</Button>

{/* Loading */}
<Button loading>Processing...</Button>

{/* Full width */}
<Button fullWidth>Full Width Button</Button>
```

### Custom Styling
```jsx
{/* Override specific styles */}
<Button
  variant="primary"
  style={{ borderRadius: '8px', padding: '12px 24px' }}
>
  Custom Style
</Button>

{/* Add custom class */}
<Button className="my-custom-class">
  With Custom Class
</Button>
```

---

## Advanced Usage

### Button Group
```jsx
import { ButtonGroup, Button } from './common/Button';

<ButtonGroup>
  <Button variant="secondary">Day</Button>
  <Button variant="secondary">Week</Button>
  <Button variant="primary">Month</Button>
</ButtonGroup>
```

### Icon Button Sizes
```jsx
<IconButton
  size="sm"
  variant="ghost"
  icon={<Settings size={16} />}
  aria-label="Settings"
/>

<IconButton
  size="md"
  variant="secondary"
  icon={<Edit size={18} />}
  aria-label="Edit"
/>

<IconButton
  size="lg"
  variant="danger"
  icon={<Trash2 size={20} />}
  aria-label="Delete"
/>
```

### Form Buttons
```jsx
<form onSubmit={handleSubmit}>
  <Button type="submit" variant="primary">
    Submit Form
  </Button>
  <Button type="button" variant="ghost" onClick={onCancel}>
    Cancel
  </Button>
  <Button type="reset" variant="secondary">
    Reset
  </Button>
</form>
```

---

## Migration Guide

### Replace Inline Styled Buttons

**Before:**
```jsx
<button
  onClick={handleSave}
  style={{
    background: 'linear-gradient(135deg, #00695C 0%, #004D40 100%)',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '24px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '700',
    textTransform: 'uppercase',
  }}
>
  Save
</button>
```

**After:**
```jsx
<Button variant="primary" onClick={handleSave}>
  Save
</Button>
```

---

### Replace Custom Button Components

**Before:**
```jsx
const CustomButton = ({ children, onClick, style }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 16px',
      background: '#f0f2f5',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      cursor: 'pointer',
      ...style,
    }}
  >
    {children}
  </button>
);

<CustomButton onClick={handleClick}>Click Me</CustomButton>
```

**After:**
```jsx
import { Button } from './common/Button';

<Button variant="secondary" onClick={handleClick}>
  Click Me
</Button>
```

---

### Use CSS Classes Directly

If you prefer not to use the React component, you can use the CSS classes directly:

```jsx
<button className="btn btn-primary" onClick={handleClick}>
  Primary Button
</button>

<button className="btn btn-secondary btn-sm" onClick={handleClick}>
  Small Secondary Button
</button>
```

---

## Variant Guidelines

### When to Use Each Variant

**Primary (`variant="primary"`)**
- Main call-to-action (CTA) buttons
- Submit forms
- Proceed to next step
- Save changes
- **Example:** "Create Survey", "Save Settings", "Continue"

**Secondary (`variant="secondary"`)**
- Secondary actions
- Alternative options
- Non-destructive actions
- **Example:** "Cancel", "Back", "View Details"

**Danger (`variant="danger"`)**
- Destructive actions
- Delete operations
- Permanent changes
- **Example:** "Delete Survey", "Remove User", "Clear Data"

**Success (`variant="success"`)**
- Positive confirmations
- Approve actions
- Success messages
- **Example:** "Approve", "Confirm", "Accept"

**Ghost (`variant="ghost"`)**
- Tertiary actions
- Less prominent options
- Modal actions
- **Example:** "Skip", "Maybe Later", "Dismiss"

**Text (`variant="text"`)**
- Inline text links
- Minimal visual weight
- Navigation within content
- **Example:** "Learn More", "See Details", "Read Documentation"

---

## Accessibility

### Built-in Accessibility Features

1. **Keyboard Navigation**
   - All buttons are keyboard accessible
   - Focus states automatically styled (from global CSS)

2. **ARIA Attributes**
   - `aria-busy` automatically added when `loading={true}`
   - `aria-label` required for IconButton

3. **Disabled State**
   - Properly communicates disabled state to assistive tech
   - Prevents interaction when disabled

### Best Practices

```jsx
{/* Always provide aria-label for icon-only buttons */}
<IconButton
  icon={<Settings size={20} />}
  aria-label="Open settings"
  onClick={handleSettings}
/>

{/* Loading state announces to screen readers */}
<Button loading aria-label="Saving changes">
  Save
</Button>

{/* Descriptive text for screen readers */}
<Button variant="danger" onClick={handleDelete}>
  Delete Survey
</Button>
```

---

## Common Patterns

### Modal Actions
```jsx
<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
  <Button variant="ghost" onClick={onCancel}>
    Cancel
  </Button>
  <Button variant="primary" onClick={onConfirm}>
    Confirm
  </Button>
</div>
```

### Form Actions
```jsx
<ButtonGroup>
  <Button type="submit" variant="primary" loading={isSubmitting}>
    {isSubmitting ? 'Saving...' : 'Save Changes'}
  </Button>
  <Button type="button" variant="secondary" onClick={onCancel}>
    Cancel
  </Button>
</ButtonGroup>
```

### Table Row Actions
```jsx
<td>
  <IconButton
    variant="ghost"
    icon={<Edit size={16} />}
    aria-label="Edit row"
    onClick={() => handleEdit(row.id)}
  />
  <IconButton
    variant="ghost"
    icon={<Trash2 size={16} />}
    aria-label="Delete row"
    onClick={() => handleDelete(row.id)}
  />
</td>
```

### Toolbar Actions
```jsx
<ButtonGroup>
  <IconButton
    variant={view === 'grid' ? 'primary' : 'ghost'}
    icon={<Grid size={18} />}
    aria-label="Grid view"
    onClick={() => setView('grid')}
  />
  <IconButton
    variant={view === 'list' ? 'primary' : 'ghost'}
    icon={<List size={18} />}
    aria-label="List view"
    onClick={() => setView('list')}
  />
</ButtonGroup>
```

---

## Dark Mode Support

All button variants automatically adapt to dark mode using CSS variables:

```css
/* Light mode */
--button-bg: #00695C;
--button-text: #ffffff;
--input-bg: #f0f2f5;
--input-border: #e2e8f0;

/* Dark mode */
[data-theme="dark"] {
  --button-bg: #C8A052;
  --button-text: #0A0E1A;
  --input-bg: #1A2035;
  --input-border: rgba(255, 255, 255, 0.08);
}
```

No additional code needed - buttons automatically adjust!

---

## Performance

### Lightweight
- CSS-based styling (no JavaScript for visual effects)
- Minimal bundle size (~2KB gzipped)
- No external dependencies (except Lucide icons when used)

### Best Practices
- Use `IconButton` for icon-only buttons (optimized for circular shape)
- Avoid excessive nesting of Button components
- Use `ButtonGroup` for related actions

---

## TypeScript Support

```typescript
import { Button, IconButton, ButtonGroup } from './common/Button';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'text';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  uppercase?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}
```

---

## FAQ

### Q: Can I still use regular `<button>` elements?
**A:** Yes! Regular buttons now have minimal styling, so they won't inherit aggressive styles. Use Button component for intentional, styled buttons.

### Q: What about third-party components (SurveyJS, react-grid-layout)?
**A:** They're unaffected! The scoped `.btn` classes only apply when you explicitly use them.

### Q: Can I customize the colors?
**A:** Yes! Override CSS variables or pass custom styles:
```jsx
<Button
  variant="primary"
  style={{
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    color: 'white',
  }}
>
  Custom Color
</Button>
```

### Q: How do I migrate existing buttons?
**A:** Gradually! Start with high-traffic pages (Dashboard, FormBuilder), then migrate others over time. Both patterns coexist safely.

---

## Examples

See these components for real-world usage:
- `Dashboard.jsx` - Primary actions, secondary actions, icon buttons
- `FormBuilder.jsx` - Form submission, cancel, delete
- `CxDashboard.jsx` - Metric card actions, filters

---

## Support

For questions or issues with the Button component:
1. Check this guide first
2. Review example implementations in key components
3. Test in both light and dark mode
4. Verify accessibility with keyboard navigation

---

**Last Updated:** 2026-02-11
**Component Version:** 1.0.0
