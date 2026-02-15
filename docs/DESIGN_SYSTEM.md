# VTrustX Design System Guide

## Overview

VTrustX uses a comprehensive design token system built on CSS custom properties (variables) to enable consistent theming, white-label customization, and dark mode support across the entire application.

## Design Tokens

Design tokens are centralized in `client/src/design-tokens.css` and provide a single source of truth for all design values.

### Spacing Scale

Use spacing tokens for padding, margin, and gap properties:

```css
/* Small to large spacing */
--space-1: 0.25rem;   /* 4px */
--space-1-25: 0.3125rem; /* 5px */
--space-1-5: 0.375rem;   /* 6px */
--space-2: 0.5rem;    /* 8px */
--space-2-5: 0.625rem;   /* 10px */
--space-3: 0.75rem;   /* 12px */
--space-3-5: 0.875rem;   /* 14px */
--space-4: 1rem;      /* 16px */
--space-4-5: 1.125rem;   /* 18px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-7: 1.875rem;  /* 30px - NEW */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3.125rem; /* 50px */
--space-15: 3.75rem;  /* 60px */
--space-20: 5rem;     /* 80px */
```

**Usage:**
```css
.card {
  padding: var(--space-6, 24px);
  margin-bottom: var(--space-5, 20px);
  gap: var(--space-4, 16px);
}
```

### Typography Scale

Use typography tokens for font sizes:

```css
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-2xl-alt: 1.75rem; /* 28px - NEW */
--text-3xl: 1.875rem;    /* 30px */
```

**Usage:**
```css
h1 {
  font-size: var(--text-2xl, 24px);
}

p {
  font-size: var(--text-base, 16px);
}

.caption {
  font-size: var(--text-sm, 14px);
}
```

### Border Radius Scale

Use radius tokens for consistent corner rounding:

```css
--radius-sm: 0.25rem;      /* 4px */
--radius-sm-alt: 0.375rem; /* 6px - NEW */
--radius-md: 0.5rem;       /* 8px */
--radius-lg: 0.75rem;      /* 12px */
--radius-xl: 1rem;         /* 16px */
--radius-xl-alt: 1.25rem;  /* 20px - NEW */
--radius-2xl: 1.5rem;      /* 24px */
--radius-full: 9999px;     /* Full circle */
```

**Usage:**
```css
.button {
  border-radius: var(--radius-md, 8px);
}

.card {
  border-radius: var(--radius-lg, 12px);
}

.avatar {
  border-radius: var(--radius-full, 9999px);
}
```

### Shadow Scale

Use shadow tokens for consistent elevation:

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

**Usage:**
```css
.card {
  box-shadow: var(--shadow-md);
}

.modal {
  box-shadow: var(--shadow-2xl);
}
```

### Color Tokens

#### Semantic Colors

```css
/* Background */
--background-color: ...;
--card-bg: ...;
--input-bg: ...;
--sidebar-bg: ...;

/* Text */
--text-primary: ...;
--text-secondary: ...;
--text-muted: ...;

/* Borders */
--border-light: ...;
--border-medium: ...;

/* Status */
--status-success: ...;
--status-error: ...;
--status-warning: ...;
--status-info: ...;

/* Primary Brand */
--primary-color: ...;
--primary-light: ...;
--primary-dark: ...;
```

**Usage:**
```css
.alert-success {
  background: var(--toast-success-bg);
  color: var(--status-success);
  border: 2px solid var(--status-success);
}
```

## Fallback Pattern

**Always include fallback values** for backward compatibility:

```css
/* ✅ Correct - with fallback */
padding: var(--space-4, 16px);

/* ❌ Incorrect - no fallback */
padding: var(--space-4);
```

## Migration from Hardcoded Values

### Before (Hardcoded):
```css
.wizard {
  padding: 40px 20px;
  margin-bottom: 30px;
  border-radius: 12px;
  font-size: 18px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

### After (Design Tokens):
```css
.wizard {
  padding: var(--space-10, 40px) var(--space-5, 20px);
  margin-bottom: var(--space-7, 30px);
  border-radius: var(--radius-lg, 12px);
  font-size: var(--text-lg, 18px);
  box-shadow: var(--shadow-md);
}
```

## Theme Switching

Design tokens enable instant theme switching:

```javascript
// Switch to dark mode
document.documentElement.setAttribute('data-theme', 'dark');

// Switch to custom white-label theme
document.documentElement.style.setProperty('--primary-color', '#FF5733');
document.documentElement.style.setProperty('--card-bg', '#F5F5F5');
```

## Common Migration Patterns

| Hardcoded Value | Design Token | Usage |
|----------------|--------------|-------|
| `padding: 24px` | `padding: var(--space-6, 24px)` | Card padding |
| `gap: 20px` | `gap: var(--space-5, 20px)` | Flex/grid gaps |
| `font-size: 14px` | `font-size: var(--text-sm, 14px)` | Body text |
| `border-radius: 8px` | `border-radius: var(--radius-md, 8px)` | Buttons |
| `margin-bottom: 30px` | `margin-bottom: var(--space-7, 30px)` | Section spacing |

## Best Practices

1. **Always use tokens for:**
   - Spacing (padding, margin, gap)
   - Typography (font-size, line-height)
   - Border radius
   - Colors
   - Shadows

2. **Always include fallback values:**
   ```css
   /* Good */
   padding: var(--space-4, 16px);

   /* Bad */
   padding: var(--space-4);
   ```

3. **Use semantic color tokens:**
   ```css
   /* Good */
   color: var(--status-success);

   /* Bad */
   color: #10B981;
   ```

4. **Test theme switching:**
   - Light mode
   - Dark mode
   - Custom white-label themes

## Files

- **Token definitions:** `client/src/design-tokens.css`
- **Theme system:** `client/src/index.css`
- **Responsive breakpoints:** `client/src/responsive.css`

## Migration Status

✅ **Completed (10 files):**
- CJMBuilder.css
- ABStatsComparison.css
- SentimentAnalyticsDashboard.css
- CxPersonaBuilder.css
- ExportModal.css
- APIKeysList.css
- RetentionPolicySettings.css
- Dashboard.css
- CRMConnectionWizard.css
- CRMSyncDashboard.css

📊 **Impact:** 521+ hardcoded values replaced across top 10 high-priority files

## White-Label Customization

To create a white-label deployment, override token values in your custom CSS:

```css
:root {
  /* Brand colors */
  --primary-color: #FF6B35;
  --primary-light: #FFE5DB;
  --primary-dark: #CC5529;

  /* Layout */
  --card-bg: #FFFFFF;
  --background-color: #F8F9FA;

  /* Typography */
  --text-primary: #1A202C;
}
```

## Support

For questions about the design system:
- Review `client/src/design-tokens.css` for all available tokens
- Check `client/src/index.css` for theme implementation
- See migrated CSS files for usage examples
