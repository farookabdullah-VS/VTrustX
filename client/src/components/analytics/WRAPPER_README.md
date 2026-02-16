# Analytics Studio Wrapper - Technical Documentation

## Overview

The `AnalyticsStudioWrapper` component provides seamless migration between the legacy monolithic Analytics Studio and the new refactored version. This document explains the technical implementation for developers.

## Architecture

### Component Structure

```
AnalyticsStudioWrapper.jsx (Main wrapper)
├── BetaBanner (User notification)
├── FeatureComparisonModal (Version comparison UI)
├── AnalyticsStudio (Legacy version)
└── NewAnalyticsStudio (Refactored version)
    ├── Core Components
    │   ├── ReportList
    │   ├── ReportDesigner
    │   └── CreateReportModal
    ├── Widget Components
    │   ├── KPIWidget
    │   ├── ChartWidget
    │   ├── CohortWidget
    │   └── ForecastWidget
    ├── Modal Components
    │   ├── FilterModal
    │   ├── ExportModal
    │   └── ScheduleModal
    └── Shared Utilities
        └── LiveRegion (Accessibility)
```

## Key Components

### 1. AnalyticsStudioWrapper

**Purpose**: Orchestrates version switching and user preferences

**Props**: None (reads from localStorage)

**State Management**:
```javascript
const [useNewVersion, setUseNewVersion] = useState(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'true';
});

const [showBanner, setShowBanner] = useState(() => {
  const dismissed = localStorage.getItem(DISMISSED_BANNER_KEY);
  return dismissed !== 'true';
});

const [showComparison, setShowComparison] = useState(false);
```

**Storage Keys**:
- `analytics_use_new_version`: User's version preference (boolean)
- `analytics_beta_banner_dismissed`: Whether user dismissed the banner (boolean)

**Features**:
- Persistent version preference
- Keyboard shortcut (`Ctrl/Cmd+Shift+V`) for quick access
- Toast notifications on version switch
- Floating toggle button for easy access
- Automatic localStorage synchronization

### 2. BetaBanner

**Purpose**: Inform users about available versions and allow switching

**Props**:
```typescript
interface BetaBannerProps {
  onSwitch: () => void;      // Called when user clicks switch button
  onDismiss: () => void;     // Called when user dismisses banner
  isUsingNew: boolean;       // Current version flag
}
```

**Design**:
- Gradient purple background for visibility
- ARIA live region for accessibility
- Responsive layout with flexbox
- Hover effects for better UX

### 3. FeatureComparisonModal

**Purpose**: Provide side-by-side comparison of versions

**Props**:
```typescript
interface FeatureComparisonModalProps {
  onClose: () => void;                           // Close modal
  onSelectVersion: (version: 'legacy' | 'new') => void;  // Version selection
}
```

**Features**:
- Modal overlay with backdrop blur
- Grid layout for comparison
- Detailed feature lists
- CTA buttons for each version
- Click-outside-to-close behavior

### 4. NewAnalyticsStudio

**Purpose**: Refactored Analytics Studio with enhanced features

**Architecture**: Modular component composition

**Key Features**:
- Tab-based navigation
- Report list and designer views
- Integration with all dashboards
- Error boundary for resilience
- Live region for accessibility

**State Management**:
```javascript
const [activeTab, setActiveTab] = useState('custom-reports');
const [activeView, setActiveView] = useState('list');
const [selectedReport, setSelectedReport] = useState(null);
const [reports, setReports] = useState([]);
const [loading, setLoading] = useState(true);
const [showCreateModal, setShowCreateModal] = useState(false);
```

### 5. AnalyticsErrorBoundary

**Purpose**: Graceful error handling for Analytics Studio

**Features**:
- Catches React errors in Analytics Studio
- Reports to Sentry (if available)
- Displays user-friendly error message
- Provides refresh option

**Implementation**:
```javascript
class AnalyticsErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Analytics Studio Error:', error, errorInfo);
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: { errorInfo: { componentStack: errorInfo.componentStack } }
      });
    }
  }
}
```

## Integration

### App.jsx Configuration

The wrapper is lazy-loaded in `App.jsx`:

```javascript
const AnalyticsStudio = React.lazy(() =>
  import('./components/analytics/AnalyticsStudioWrapper')
);
```

**Routing**:
```javascript
<Route path="analytics-studio" element={<AnalyticsStudio />} />
```

### Version Detection Logic

```javascript
// Check user preference
const useNewVersion = localStorage.getItem('analytics_use_new_version') === 'true';

// Check environment variable (optional)
const forceVersion = import.meta.env.REACT_APP_ANALYTICS_DEFAULT_VERSION;

// Priority: URL param > localStorage > env var > default
const version = new URLSearchParams(window.location.search).get('version')
  || (useNewVersion ? 'new' : 'legacy')
  || forceVersion
  || 'legacy';
```

## Accessibility Features

### ARIA Attributes

- `role="alert"` on beta banner
- `aria-live="polite"` for non-intrusive announcements
- `role="dialog"` and `aria-modal="true"` on comparison modal
- `role="tablist"` and `role="tab"` for tab navigation
- Proper labeling with `aria-label` and `aria-labelledby`

### Keyboard Navigation

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd+Shift+V` | Open version comparison modal |
| `Escape` | Close modal |
| `Tab` | Navigate through interactive elements |
| `Enter/Space` | Activate buttons |

### Screen Reader Support

The `LiveRegion` component provides announcements:

```javascript
import { useAnalyticsAnnouncer } from './shared/LiveRegion';

const { announce } = useAnalyticsAnnouncer();

// Announce version switch
announce('Switched to new Analytics Studio. Enjoy the enhanced features!');
```

## Performance Considerations

### Lazy Loading

Both versions are lazy-loaded to minimize initial bundle size:

```javascript
import AnalyticsStudio from './AnalyticsStudio'; // Legacy (lazy-loaded by React)
import NewAnalyticsStudio from './NewAnalyticsStudio'; // New (lazy-loaded by React)
```

### Code Splitting

The wrapper creates a natural code-split boundary:
- **Common**: Wrapper component (~15KB)
- **Legacy**: Monolithic component (~180KB)
- **New**: Modular components (~120KB total, split into ~20 chunks)

Users only download the version they're using.

### Caching Strategy

The wrapper respects browser caching:
- User preferences stored in localStorage (persistent)
- Banner dismissal stored in localStorage (persistent)
- Version choice survives page reloads
- No server calls required for version switching

## Testing

### Unit Tests

Test the wrapper component:

```javascript
describe('AnalyticsStudioWrapper', () => {
  test('renders legacy version by default', () => {
    render(<AnalyticsStudioWrapper />);
    expect(screen.getByTestId('legacy-analytics')).toBeInTheDocument();
  });

  test('switches to new version when button clicked', async () => {
    render(<AnalyticsStudioWrapper />);

    const switchButton = screen.getByText(/Try New Version/i);
    fireEvent.click(switchButton);

    await waitFor(() => {
      expect(localStorage.getItem('analytics_use_new_version')).toBe('true');
    });
  });

  test('respects localStorage preference', () => {
    localStorage.setItem('analytics_use_new_version', 'true');

    render(<AnalyticsStudioWrapper />);

    expect(screen.getByTestId('new-analytics')).toBeInTheDocument();
  });

  test('opens comparison modal with keyboard shortcut', () => {
    render(<AnalyticsStudioWrapper />);

    fireEvent.keyDown(window, { key: 'V', ctrlKey: true, shiftKey: true });

    expect(screen.getByText(/Analytics Studio Versions/i)).toBeInTheDocument();
  });
});
```

### Integration Tests

Test version switching with API calls:

```javascript
describe('Version Switching Integration', () => {
  test('preserves report data when switching versions', async () => {
    const { rerender } = render(<AnalyticsStudioWrapper />);

    // Load reports in legacy version
    await waitFor(() => {
      expect(screen.getByText('My Report')).toBeInTheDocument();
    });

    // Switch to new version
    fireEvent.click(screen.getByText(/Try New Version/i));

    // Reports still visible
    await waitFor(() => {
      expect(screen.getByText('My Report')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests

Playwright test for full user flow:

```javascript
test('user can switch between versions', async ({ page }) => {
  await page.goto('/analytics-studio');

  // Should show banner
  await expect(page.locator('text=Enhanced Analytics Available')).toBeVisible();

  // Click switch button
  await page.click('button:has-text("Try New Version")');

  // Should show new version
  await expect(page.locator('text=New Analytics Studio (Beta)')).toBeVisible();

  // Open comparison modal with keyboard
  await page.keyboard.press('Control+Shift+V');
  await expect(page.locator('text=Analytics Studio Versions')).toBeVisible();

  // Switch back to legacy
  await page.click('button:has-text("Use Legacy Version")');
  await expect(page.locator('text=Enhanced Analytics Available')).toBeVisible();
});
```

## Migration Checklist

When adding the wrapper to your Analytics Studio:

- [ ] Install wrapper component in `components/analytics/`
- [ ] Create `NewAnalyticsStudio.jsx` with refactored architecture
- [ ] Update `App.jsx` to import wrapper instead of legacy component
- [ ] Add `LiveRegion` component for accessibility
- [ ] Test version switching in development
- [ ] Verify localStorage persistence
- [ ] Test keyboard shortcuts
- [ ] Verify accessibility with screen reader
- [ ] Test on mobile devices
- [ ] Update user documentation
- [ ] Train support team
- [ ] Monitor error logs after deployment
- [ ] Gather user feedback

## Environment Variables

Optional configuration via `.env`:

```bash
# Force a specific version (overrides user preference)
REACT_APP_ANALYTICS_DEFAULT_VERSION=new    # or 'legacy' or 'auto'

# Disable version switching (lock to one version)
REACT_APP_ANALYTICS_ALLOW_VERSION_SWITCH=false

# Enable debug logging
REACT_APP_ANALYTICS_DEBUG=true

# Custom storage key prefix
REACT_APP_ANALYTICS_STORAGE_PREFIX=myapp_
```

## Advanced Configuration

### Custom Branding

Customize the banner gradient:

```javascript
// In BetaBanner component
style={{
  background: 'linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%)',
  // ...
}}
```

### Analytics Tracking

Track version usage:

```javascript
useEffect(() => {
  if (window.analytics) {
    window.analytics.track('Analytics Version Selected', {
      version: useNewVersion ? 'new' : 'legacy',
      timestamp: new Date().toISOString()
    });
  }
}, [useNewVersion]);
```

### Feature Flags

Integrate with feature flag service:

```javascript
import { useFeatureFlag } from './featureFlags';

const forceNewVersion = useFeatureFlag('analytics-new-version-rollout');

if (forceNewVersion) {
  setUseNewVersion(true);
}
```

## Troubleshooting

### Common Issues

**Issue**: Wrapper not rendering

**Solution**: Check React lazy loading and Suspense:

```javascript
<Suspense fallback={<LoadingSpinner />}>
  <AnalyticsStudioWrapper />
</Suspense>
```

**Issue**: LocalStorage not persisting

**Solution**: Check browser privacy settings or use session storage:

```javascript
const storage = window.localStorage || window.sessionStorage;
```

**Issue**: Keyboard shortcut conflicts

**Solution**: Change shortcut key in wrapper:

```javascript
// Change from Ctrl+Shift+V to Ctrl+Shift+A
if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
  // ...
}
```

## Future Enhancements

Planned improvements:

1. **A/B Testing**: Automatically split users for controlled rollout
2. **Usage Analytics**: Track feature usage in each version
3. **Gradual Rollout**: Percentage-based rollout (10%, 25%, 50%, 100%)
4. **Version-Specific Features**: Show features only available in selected version
5. **Migration Wizard**: Guided tour of new features for first-time users
6. **Feedback Integration**: In-app feedback form for version comparison
7. **Performance Metrics**: Real-time performance comparison between versions

## Contributing

When modifying the wrapper:

1. Maintain backward compatibility
2. Test both version paths
3. Update this documentation
4. Add tests for new features
5. Consider accessibility impact
6. Review performance implications

## Support

For questions or issues:

- **Documentation**: See `ANALYTICS_MIGRATION_GUIDE.md`
- **Code Issues**: File a GitHub issue
- **Questions**: Contact the frontend team
- **Urgent**: Escalate to tech lead

---

**Maintainer**: Frontend Team
**Last Updated**: 2026-02-16
**Version**: 1.0.0
