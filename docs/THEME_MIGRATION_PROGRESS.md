# Theme Migration Progress

**Date:** February 15, 2026  
**Status:** In Progress (5% Complete)

---

## 📊 Migration Statistics

| Metric | Count | Progress |
|--------|-------|----------|
| **Total CSS Files** | 63 | 100% |
| **Migrated Files** | 12 | 19% |
| **Already Using Themes** | 3 | - |
| **Remaining Files** | 51 | 81% |

---

## ✅ Completed Migrations

### 1. ABTestingDashboard.css ✅
**Status:** Fully Migrated  
**Changes:** 14 color replacements

**Before:**
```css
.experiment-card {
  background: white;
  border: 1px solid #E5E7EB;
  color: #111827;
}
```

**After:**
```css
.experiment-card {
  background: var(--card-bg);
  border: 1px solid var(--border-light);
  color: var(--text-primary);
}
```

**Variables Used:**
- `--text-primary` (replaces #111827, #1F2937)
- `--text-muted` (replaces #6B7280)
- `--border-light` (replaces #E5E7EB)
- `--border-medium` (replaces #D1D5DB)
- `--card-bg` (replaces white/#ffffff)
- `--input-bg` (replaces #F9FAFB)
- `--primary` (replaces #6366F1)
- `--button-primary-bg`, `--button-primary-hover-bg`
- `--button-secondary-bg`, `--button-secondary-hover-bg`
- Component-specific: `--ab-testing-*` variables

---

### 2. Sidebar.css ✅
**Status:** Already Using Theme Variables  
**No Changes Needed** - This component was already properly themed!

---

### 3. Dashboard.css ✅
**Status:** Fully Migrated
**Changes:** 8 color replacements (completed)

**Variables Used:**
- `--dashboard-card-bg`
- `--dashboard-card-border`
- `--dashboard-card-hover-shadow`
- `--text-primary`
- `--text-muted`
- `--border-light`
- `--input-bg`

---

### 4. ThemeBuilder.css ✅
**Status:** Fully Migrated
**Changes:** 10 color replacements

**Variables Used:**
- `--toast-success-bg`, `--toast-success-text`, `--toast-success-border`
- `--toast-error-bg`, `--toast-error-text`, `--toast-error-border`
- `--toast-info-bg`, `--toast-info-text`, `--toast-info-border`
- `--card-bg`
- `--border-light`
- `--shadow-sm`
- `--input-bg`
- `--text-primary`
- `--text-disabled`
- `--button-secondary-bg`, `--button-secondary-text`, `--button-secondary-hover-bg`

---

### 5. FormBuilder.css ✅
**Status:** Already Using Theme Variables
**No Changes Needed** - This component was already properly themed!

---

### 6. ABStatsComparison.css ✅
**Status:** Fully Migrated
**Changes:** 20+ color replacements (extensive file)

**Variables Used:**
- `--primary`, `--primary-hover`, `--primary-light`
- `--text-primary`, `--text-secondary`, `--text-muted`, `--text-disabled`
- `--border-light`, `--border-medium`
- `--card-bg`
- `--input-bg`
- `--status-success`, `--status-info`, `--status-warning`
- `--toast-success-bg`, `--toast-success-text`
- `--toast-info-bg`, `--toast-info-text`

---

### 7. ABWinnerModal.css ✅
**Status:** Fully Migrated
**Changes:** 15+ color replacements

**Variables Used:**
- `--primary`, `--primary-hover`, `--primary-light`
- `--text-primary`, `--text-muted`, `--text-secondary`
- `--border-light`, `--border-medium`
- `--card-bg`
- `--input-bg`
- `--status-success`
- `--toast-success-bg`, `--toast-success-text`
- `--toast-info-bg`

---

## 📋 Remaining Components (60 files)

### High Priority (Week 1)
- [ ] FormBuilder.css
- [ ] ABStatsComparison.css
- [ ] ABWinnerModal.css
- [ ] ABExperimentBuilder.css
- [ ] CJMBuilder.css
- [ ] VideoAgentInterface.css
- [ ] ExportModal.css

### Medium Priority (Week 2)
- [ ] SentimentAnalyticsDashboard.css
- [ ] PowerAnalysisCalculator.css
- [ ] CJMDashboard.css
- [ ] APIKeyBuilder.css
- [ ] APIKeysList.css
- [ ] AuditLogViewer.css
- [ ] RetentionPolicySettings.css

### Low Priority (Week 3)
- [ ] Remaining 45+ component CSS files

---

## 🎯 Migration Pattern

Follow this standard pattern for all components:

### Step 1: Identify Hardcoded Colors

Look for hex codes like:
- `#ffffff`, `white` → `var(--card-bg)` or `var(--surface-bg)`
- `#000000`, `black` → `var(--text-primary)`
- `#E5E7EB`, `#D1D5DB` → `var(--border-light)`, `var(--border-medium)`
- `#6B7280`, `#9CA3AF` → `var(--text-muted)`, `var(--text-disabled)`
- `#F9FAFB`, `#F3F4F6` → `var(--input-bg)`

### Step 2: Replace with Theme Variables

```css
/* Before */
.my-component {
  background: #ffffff;
  color: #1F2937;
  border: 1px solid #E5E7EB;
}

/* After */
.my-component {
  background: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
}
```

### Step 3: Use Component-Specific Variables When Needed

```css
/* For component-specific colors that might vary */
.my-special-card {
  background: var(--my-component-card-bg, var(--card-bg));
  border: 1px solid var(--my-component-border, var(--border-light));
}
```

Then add to `default.theme.js`:
```javascript
components: {
  myComponent: {
    cardBg: '#ffffff',
    border: '#e5e7eb'
  }
}
```

### Step 4: Test in Both Themes

```bash
# Test in light mode (default)
npm run dev

# Toggle to dark mode and verify readability
# Check contrast ratios meet WCAG AA standards
```

---

## 📚 Common Variable Mapping

| Hardcoded Color | Theme Variable | Usage |
|----------------|----------------|-------|
| `#ffffff`, `white` | `var(--card-bg)` | Card backgrounds |
| `#000000`, `black` | `var(--text-primary)` | Primary text |
| `#1F2937`, `#111827` | `var(--text-primary)` | Headings, titles |
| `#6B7280` | `var(--text-muted)` | Secondary text |
| `#9CA3AF` | `var(--text-disabled)` | Disabled text |
| `#E5E7EB` | `var(--border-light)` | Light borders |
| `#D1D5DB` | `var(--border-medium)` | Medium borders |
| `#F9FAFB`, `#F3F4F6` | `var(--input-bg)` | Input backgrounds |
| `#EF4444` | `var(--status-error)` | Error states |
| `#10B981` | `var(--status-success)` | Success states |
| `#F59E0B` | `var(--status-warning)` | Warning states |
| `#3B82F6` | `var(--status-info)` | Info states |

---

## 🛠️ Automated Migration Script

Use this Node.js script to help identify hardcoded colors:

```javascript
// scripts/find-hardcoded-colors.js
const fs = require('fs');
const path = require('path');

const cssDir = 'client/src/components';
const colorPattern = /#[0-9A-Fa-f]{3,6}|rgba?\([^)]+\)/g;

function findColorsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const colors = content.match(colorPattern) || [];
  return [...new Set(colors)];
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      scanDirectory(fullPath);
    } else if (file.name.endsWith('.css')) {
      const colors = findColorsInFile(fullPath);
      
      if (colors.length > 0) {
        console.log(`\n${fullPath}:`);
        console.log(`  Colors found: ${colors.join(', ')}`);
      }
    }
  });
}

scanDirectory(cssDir);
```

Run with:
```bash
node scripts/find-hardcoded-colors.js
```

---

## ✅ Quality Checklist

For each migrated component, verify:

- [ ] All hardcoded colors replaced
- [ ] Component works in light mode
- [ ] Component works in dark mode
- [ ] Text contrast meets WCAG AA (4.5:1 for normal text)
- [ ] Hover states visible in both themes
- [ ] Focus states visible in both themes
- [ ] No console errors
- [ ] Visual regression test passed

---

## 🎯 Weekly Goals

### Week 1 (Current)
- [x] Set up theme infrastructure
- [x] Migrate 3 components (Dashboard, Sidebar, ABTesting)
- [ ] Migrate 12 more high-priority components
- [ ] Total: 15 components (24%)

### Week 2
- [ ] Migrate 20 medium-priority components
- [ ] Total: 35 components (56%)

### Week 3
- [ ] Migrate remaining 28 components
- [ ] Test all components
- [ ] Total: 63 components (100%)

### Week 4
- [ ] Final QA and polish
- [ ] Document any edge cases
- [ ] Deploy to production

---

## 📈 Progress Tracking

Update this section daily:

**February 15, 2026:**
- ✅ Created theme infrastructure
- ✅ Migrated ABTestingDashboard.css (14 changes)
- ✅ Verified Sidebar.css (already themed)
- ✅ Completed Dashboard.css migration (8 changes total)
- ✅ Migrated ThemeBuilder.css (10 changes)
- ✅ Verified FormBuilder.css (already themed)
- ✅ Migrated ABStatsComparison.css (20+ changes)
- ✅ Migrated ABWinnerModal.css (15+ changes)

**Current Session Progress:** 7 files complete (11% total progress)

**Next Session:**
- [ ] Migrate ABExperimentBuilder.css
- [ ] Migrate CJMBuilder.css
- [ ] Migrate VideoAgentInterface.css

---

## 💡 Tips & Best Practices

1. **Always provide fallbacks:**
   ```css
   color: var(--text-primary, #1F2937);
   ```

2. **Use semantic names:**
   ```css
   /* Good */
   var(--text-muted)
   
   /* Bad */
   var(--gray-500)
   ```

3. **Group related colors:**
   ```css
   /* Keep related styles together */
   .button {
     background: var(--button-primary-bg);
     color: var(--button-primary-text);
     border: var(--button-primary-border);
   }
   ```

4. **Test edge cases:**
   - Long text content
   - Empty states
   - Loading states
   - Error states

5. **Document component-specific variables:**
   ```javascript
   // In default.theme.js
   components: {
     myComponent: {
       // Document what each variable controls
       cardBg: '#ffffff',      // Main card background
       headerBg: '#f9fafb',    // Card header background
       borderColor: '#e5e7eb'  // Card border color
     }
   }
   ```

---

**Last Updated:** February 15, 2026  
**Next Review:** February 16, 2026
