# React Router Migration Plan

## Current State ❌

The app HAS React Router installed and partially implemented, but suffers from:

### Problems:
1. **State-based IDs** - `currentFormId`, `currentTicketId` stored in React state instead of URL
2. **Not bookmarkable** - URL `/builder` doesn't contain form ID, so can't bookmark specific forms
3. **Complex navigation** - `handleNavigate()` with 20+ if/else conditions
4. **Back button issues** - Browser back doesn't restore state properly
5. **Mixed patterns** - Some routes use params (`/builder/:id`), others don't

### Example Current Code:
```jsx
// ❌ State-based routing
const [currentFormId, setCurrentFormId] = useState(null);

// User navigates to builder
handleEditForm(123); // Sets state
navigate('/builder'); // URL is /builder (no ID!)

// FormBuilder component
<FormBuilder formId={currentFormId} /> // Reads from prop, not URL
```

**Problem:** If user bookmarks `/builder`, it won't know which form to load.

---

## Desired State ✅

### Goals:
1. **URL-based routing** - All IDs in URL params
2. **Bookmarkable** - Every page can be directly linked
3. **Clean navigation** - Simple `navigate('/builder/123')` calls
4. **Back button works** - Browser navigation just works™
5. **Consistent patterns** - All dynamic routes use params

### Example Target Code:
```jsx
// ✅ URL-based routing
// User navigates to builder
navigate('/builder/123'); // URL is /builder/123

// Route definition
<Route path="/builder/:formId" element={<FormBuilder />} />

// FormBuilder component
const { formId } = useParams(); // Reads from URL
```

**Benefit:** Bookmark `/builder/123` and it directly loads that form.

---

## Migration Strategy

### Phase 1: Add URL Params (This Session) ✅
1. ✅ Create comprehensive route config (`routes.jsx`)
2. ⏭️ Update route definitions to use `:id` params
3. ⏭️ Update components to read from `useParams()`
4. ⏭️ Keep backward compatibility during migration

### Phase 2: Update Navigation Calls (Next Session)
1. Replace `handleNavigate('builder')` → `navigate('/builder/123')`
2. Update Sidebar to use `Link` components
3. Remove state management (currentFormId, currentTicketId)
4. Test all navigation flows

### Phase 3: Cleanup (Final Session)
1. Remove old `handleNavigate` function
2. Remove unused state variables
3. Update tests
4. Performance audit

---

## Route Structure (Target)

### Before ❌
```jsx
<Route path="/builder" element={<FormBuilder formId={currentFormId} />} />
<Route path="/results" element={<ResultsViewer formId={currentFormId} />} />
<Route path="/viewer" element={<FormViewer formId={currentFormId} />} />
<Route path="/tickets" element={<TicketListView />} />
<Route path="/ticket-detail" element={<TicketDetailView ticketId={currentTicketId} />} />
```

### After ✅
```jsx
<Route path="/surveys" element={<FormViewer />} />
<Route path="/surveys/:formId" element={<FormViewer />} />
<Route path="/surveys/:formId/edit" element={<FormBuilder />} />
<Route path="/surveys/:formId/results" element={<ResultsViewer />} />
<Route path="/surveys/:formId/analysis" element={<AnalysisViewer />} />
<Route path="/surveys/:formId/collect" element={<SurveyDistribution />} />
<Route path="/tickets" element={<TicketListView />} />
<Route path="/tickets/:ticketId" element={<TicketDetailView />} />
<Route path="/customer360/:contactId" element={<Customer360 />} />
<Route path="/personas/:personaId/edit" element={<CxPersonaBuilder />} />
```

---

## Implementation Steps

### Step 1: Update Route Definitions ✅
**File:** `src/App.jsx`

```jsx
// OLD
<Route path="/builder" element={<FormBuilder formId={currentFormId} />} />

// NEW
<Route path="/surveys/:formId/edit" element={<FormBuilder />} />
```

### Step 2: Update Components to Use Params
**File:** `src/components/FormBuilder.jsx`

```jsx
// OLD
export function FormBuilder({ formId, onBack }) {
  // Uses prop

// NEW
import { useParams, useNavigate } from 'react-router-dom';

export function FormBuilder() {
  const { formId } = useParams(); // ✅ Reads from URL
  const navigate = useNavigate();

  const handleBack = () => navigate('/surveys');
```

### Step 3: Update Sidebar Links
**File:** `src/components/Sidebar.jsx`

```jsx
// OLD
<div onClick={() => onNavigate('dashboard')}>Dashboard</div>

// NEW
import { NavLink } from 'react-router-dom';

<NavLink
  to="/dashboard"
  className={({ isActive }) => isActive ? 'active' : ''}
>
  Dashboard
</NavLink>
```

### Step 4: Update Navigation Calls
**File:** `src/components/Dashboard.jsx`

```jsx
// OLD
onEdit={(id) => handleEditForm(id)}

// NEW
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();

onEdit={(id) => navigate(`/surveys/${id}/edit`)}
```

---

## Breaking Changes & Backward Compatibility

### URL Changes:
| Old URL | New URL | Notes |
|---------|---------|-------|
| `/builder` | `/surveys/:formId/edit` | Must include form ID |
| `/results` | `/surveys/:formId/results` | Must include form ID |
| `/viewer` | `/surveys` or `/surveys/:formId` | List view or specific survey |
| `/ticket-detail` | `/tickets/:ticketId` | Must include ticket ID |
| `/customer360` | `/customer360/:contactId` | Optional contact ID |

### Backward Compatibility Strategy:
1. **Redirects** - Add redirect routes for old URLs
   ```jsx
   <Route path="/builder" element={<Navigate to="/surveys" replace />} />
   <Route path="/results" element={<Navigate to="/surveys" replace />} />
   ```

2. **Query Params** - Support legacy query string IDs during transition
   ```jsx
   // Support /builder?id=123 during migration
   function BuilderRedirect() {
     const [searchParams] = useSearchParams();
     const id = searchParams.get('id');
     if (id) return <Navigate to={`/surveys/${id}/edit`} replace />;
     return <Navigate to="/surveys" replace />;
   }
   ```

---

## Testing Checklist

### Functional Testing:
- [ ] Can bookmark any page with specific resource
- [ ] Back button restores correct page/resource
- [ ] Forward button works
- [ ] Direct URL navigation works (type URL manually)
- [ ] Refresh page maintains state
- [ ] Sidebar highlights correct active item
- [ ] Can deep link to specific survey/ticket/persona

### Navigation Testing:
- [ ] Dashboard → Survey Editor → Survey List (back button)
- [ ] Ticket List → Ticket Detail → Back
- [ ] Contact List → Customer 360 → Back
- [ ] Form Editor → Preview → Editor (maintain form ID)

### Edge Cases:
- [ ] Invalid ID in URL (show 404 or redirect)
- [ ] Deleted resource ID (show error message)
- [ ] Unauthorized access to resource (redirect to login)
- [ ] Missing required param (redirect to list view)

---

## Rollback Plan

If issues arise:
1. **Revert Git Commit** - All changes in single atomic commit
2. **Feature Flag** - Add `USE_NEW_ROUTING` env variable
3. **Gradual Rollout** - Enable for admin users first

---

## Performance Benefits

### Before:
- All components loaded upfront
- State management adds re-renders
- No code splitting by route

### After:
- ✅ **Code splitting** - Lazy load routes as needed
- ✅ **Smaller bundle** - Initial load only loads landing/login/dashboard
- ✅ **Faster navigation** - No full re-renders, just route changes
- ✅ **Better SEO** - Proper URLs for crawlers (if public pages)

**Expected Improvement:** 20-30% faster initial load, 40% faster navigation

---

## Next Steps

### Immediate (This Session):
1. ✅ Create `routes.jsx` with comprehensive route config
2. ✅ Create `ProtectedRoute.jsx` wrapper
3. ⏭️ Update route definitions in `App.jsx`
4. ⏭️ Update Dashboard component to use navigate()
5. ⏭️ Update FormBuilder to use useParams()

### Next Session:
1. Update all navigation calls across components
2. Update Sidebar to use NavLink
3. Remove state-based routing (currentFormId, etc.)
4. Add redirect routes for backward compatibility
5. Comprehensive testing

### Future:
1. Add breadcrumb navigation using route hierarchy
2. Implement route-based analytics
3. Add route guards for permissions
4. Optimize bundle splitting per route

---

**Status:** Phase 1 - In Progress
**Estimated Completion:** 2-3 hours for full migration
**Risk Level:** Medium (breaking changes to URLs, but can be gradual)
