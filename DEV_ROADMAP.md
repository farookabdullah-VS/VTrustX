# Development Roadmap - Backend & Features

**Date**: February 17, 2026
**Current Status**: Survey Cooldown feature completed ✅

---

## 🎯 Immediate Next Steps (Today)

### 1. **Push Survey Cooldown Commit** ⏱️ 1 min
```bash
git push
```
**Commit ready**: `71a513c` - Survey Cooldown rate limiting system

---

### 2. **Apply Pending Database Migrations** ⏱️ 10 min

#### A. Menu-Item Permissions Migration
```bash
cd server
node apply_menu_migration.js
```

**Creates:**
- `menu_items` table - Menu item definitions
- `role_menu_permissions` table - Role-based menu access

**Impact:** Enables granular menu-level permissions instead of module-level

#### B. Tenant Management System Migration
```bash
cd server
node run_tenant_migration.js
```

**Creates:**
- Enhances `tenants` table with subscription fields
- `subscription_modules` table - 25 predefined modules
- `tenant_subscription_modules` - Module assignments
- `tenant_assigned_users` - User-tenant relationships

**Impact:** Full multi-tenant subscription management system

---

### 3. **Test Migrations** ⏱️ 5 min
```bash
cd server
node check_schema.js
```
Verify all tables and columns created successfully

---

## 📋 Short-Term Actions (This Week)

### 4. **Build Cooldown Frontend UI** ⏱️ 2-3 hours

**A. Form Settings UI** (server/client/src/components/FormBuilder.jsx)

Add cooldown configuration panel:
```jsx
<div className="cooldown-settings">
  <Toggle
    label="Enable Submission Cooldown"
    checked={form.cooldownEnabled}
    onChange={(val) => setForm({...form, cooldownEnabled: val})}
  />

  {form.cooldownEnabled && (
    <>
      <Select label="Cooldown Period"
        value={form.cooldownPeriod}
        options={[
          { value: 60, label: '1 minute' },
          { value: 3600, label: '1 hour' },
          { value: 86400, label: '1 day' },
          { value: 604800, label: '1 week' }
        ]}
      />

      <RadioGroup label="Rate Limit Type"
        value={form.cooldownType}
        options={[
          { value: 'ip', label: 'IP Address Only' },
          { value: 'user', label: 'User Only' },
          { value: 'both', label: 'Both (Recommended)' }
        ]}
      />
    </>
  )}
</div>
```

**B. Survey Form UI** (client/src/components/SurveyForm.jsx)

Add cooldown check before submission:
```jsx
const [cooldownStatus, setCooldownStatus] = useState(null);

useEffect(() => {
  checkCooldown();
}, [formId]);

const checkCooldown = async () => {
  const response = await axios.post(
    `/api/forms/${formId}/cooldown/check`,
    { userId }
  );
  setCooldownStatus(response.data);
};

// Display cooldown message if active
{cooldownStatus?.onCooldown && (
  <Alert type="warning">
    {cooldownStatus.reason}
    <span>Remaining: {formatTime(cooldownStatus.remainingTime)}</span>
  </Alert>
)}
```

**Reference**: `docs/SURVEY_COOLDOWN.md` lines 156-257

---

### 5. **Review and Commit Pending Changes** ⏱️ 1-2 hours

**Modified files to review:**

**Client Changes:**
```bash
git diff client/src/components/RoleMaster.jsx
git diff client/src/components/Sidebar.jsx
git diff client/src/components/UserManagement.jsx
git diff client/src/components/SystemSettings.jsx
git diff client/src/components/ThemeSettings.jsx
```

**Server Changes:**
```bash
git diff server/src/api/routes/roles.js
git diff server/src/api/routes/tenants.js
git diff server/index.js
```

**Commit strategy:**
1. Group related changes together
2. Separate commits for different features
3. Example:
```bash
# Commit tenant management
git add client/src/components/TenantManagement.jsx \
        client/src/components/TenantManagement.css \
        server/src/api/routes/tenants.js \
        server/migrations/1771310000000_tenant-management-system.js
git commit -m "feat: Tenant Management with subscription modules"

# Commit menu permissions
git add server/migrations/1771300000000_menu-item-permissions.js \
        server/src/api/routes/roles.js \
        client/src/components/RoleMaster.jsx
git commit -m "feat: Menu-item level permissions system"

# Commit UI/UX updates
git add client/src/components/Sidebar.jsx \
        client/src/components/ThemeSettings.jsx \
        client/src/components/common/Logo.jsx \
        client/src/components/common/Logo.css
git commit -m "refactor: UI/UX improvements and theme updates"
```

---

### 6. **Add TenantManagement to Router** ⏱️ 15 min

**File**: `client/src/App.jsx`

```jsx
import TenantManagement from './components/TenantManagement';

// Add route
<Route path="/tenant-management" element={<TenantManagement />} />
```

**File**: `client/src/components/Sidebar.jsx`

```jsx
{
  id: 'tenant-management',
  label: 'Tenant Management',
  route: '/tenant-management',
  icon: 'Building2',
  requiresAdmin: true
}
```

---

### 7. **Clean Up Temporary Files** ⏱️ 5 min

```bash
cd server

# Remove helper scripts (after migrations run successfully)
rm apply_cooldown_migration.js
rm check_cooldown_columns.js
rm check_admin.js

# Remove backup files
rm ../client/src/components/RoleMaster.jsx.backup

# Keep test files for future use
# Keep: test_cooldown.js
```

**Update .gitignore:**
```bash
echo "*.backup" >> .gitignore
echo "apply_*.js" >> .gitignore
echo "check_*.js" >> .gitignore
echo "!check_schema.js" >> .gitignore  # Keep this one
```

---

## 🧪 Testing & Quality (This Week)

### 8. **Write Additional Tests** ⏱️ 2-3 hours

**Unit Tests Needed:**
```
server/src/services/__tests__/
├── SurveyCooldownService.test.js ✅ (exists)
├── TenantService.test.js ⏳
├── MenuPermissionService.test.js ⏳
└── SubscriptionService.test.js ⏳
```

**Integration Tests:**
```
server/tests/integration/
├── cooldown-api.test.js ⏳
├── tenant-management.test.js ⏳
└── menu-permissions.test.js ⏳
```

**Test Template:**
```javascript
const request = require('supertest');
const app = require('../../index');

describe('Cooldown API', () => {
  test('POST /api/forms/:id/cooldown/check returns cooldown status', async () => {
    const response = await request(app)
      .post('/api/forms/1/cooldown/check')
      .send({ userId: 'test-user' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('onCooldown');
  });
});
```

---

### 9. **Run Existing Tests** ⏱️ 5 min

```bash
cd server
npm test

# Run specific test
npm test -- test_cooldown.js
```

---

## 📱 Mobile SDK Organization (Next Week)

### 10. **Review SDK Structure** ⏱️ 1 hour

**Current untracked directories:**
- `client/ios-sdk/` - iOS SDK
- `client/android-sdk/` - Android SDK
- `sdk/` - SDK source code

**Recommended structure:**
```
sdk/
├── core/                    - Shared logic
│   ├── types.ts            - TypeScript types
│   ├── validators.ts       - Form validation
│   └── api-client.ts       - API communication
├── ios/                     - iOS Swift Package
│   ├── Package.swift
│   ├── Sources/
│   └── Tests/
├── android/                 - Android Gradle Library
│   ├── build.gradle
│   ├── src/
│   └── androidTest/
├── js/                      - JavaScript/TS client
│   ├── package.json
│   ├── src/
│   └── examples/
├── examples/                - Example apps
│   ├── ios-example/
│   ├── android-example/
│   └── web-example/
└── docs/                    - SDK documentation
    ├── ios-guide.md
    ├── android-guide.md
    └── js-guide.md
```

**Decision needed:**
- Keep in monorepo or separate repos?
- Publish to npm/CocoaPods/Maven?
- Open source or private?

---

### 11. **Document SDK Usage** ⏱️ 2 hours

Create SDK documentation:
- Installation guide
- Quick start examples
- API reference
- Migration guide (if updating)

---

## 📚 Documentation (Next Week)

### 12. **Update Main Documentation** ⏱️ 1-2 hours

**Files to update:**

**A. README.md**
```markdown
## Features
- ✅ Survey creation and management
- ✅ Multi-channel distribution
- ✅ Real-time analytics
- ✅ **NEW:** Survey cooldown rate limiting
- ✅ **NEW:** Tenant subscription management
- ✅ **NEW:** Menu-item level permissions
```

**B. Create feature guides:**
- `docs/TENANT_MANAGEMENT_GUIDE.md` ⏳
- `docs/MENU_PERMISSIONS_GUIDE.md` ⏳
- `docs/SUBSCRIPTION_MODULES.md` ⏳

**C. Update API documentation:**
- Add cooldown endpoints to API docs
- Add tenant management endpoints
- Add menu permission endpoints

---

### 13. **Review Existing Documentation** ⏱️ 30 min

**Completed:**
- ✅ `docs/SURVEY_COOLDOWN.md` - Full cooldown documentation
- ✅ `docs/SURVEY_COOLDOWN_SETUP.md` - Setup guide

**Untracked to review:**
- `docs/SOCIAL_MEDIA_INTEGRATION_GUIDE.md` ⏳

```bash
cat docs/SOCIAL_MEDIA_INTEGRATION_GUIDE.md | head -50
# Review and commit if ready
```

---

## 🚀 Feature Roadmap (Next Month)

### 14. **Cooldown Enhancements**

**Priority**: Medium
**Time**: 3-4 hours

- Cooldown analytics dashboard
- Track rejection rates by form
- Cooldown bypass tokens for testing
- Custom cooldown messages per form
- Progressive cooldown (escalating delays)

---

### 15. **Tenant Management Enhancements**

**Priority**: High
**Time**: 1-2 days

- Tenant onboarding wizard
- Usage analytics per tenant
- Billing integration
- Module usage tracking
- Tenant-level reporting
- Bulk user import/export

---

### 16. **Menu Permission Enhancements**

**Priority**: Medium
**Time**: 4-6 hours

- Sub-menu permissions
- Dynamic menu generation based on permissions
- Permission templates (pre-configured roles)
- Bulk permission assignment
- Permission audit log

---

## ✅ Quick Action Checklist

**Today (2-3 hours):**
- [ ] Push cooldown commit
- [ ] Run menu permissions migration
- [ ] Run tenant management migration
- [ ] Verify migrations with check_schema.js
- [ ] Review modified files (git diff)
- [ ] Clean up temporary scripts

**This Week (4-6 hours):**
- [ ] Build cooldown UI (form settings)
- [ ] Build cooldown UI (survey form)
- [ ] Add TenantManagement to router
- [ ] Commit tenant management changes
- [ ] Commit menu permission changes
- [ ] Commit UI/UX updates
- [ ] Write unit tests for new services
- [ ] Run test suite

**Next Week (6-8 hours):**
- [ ] Review SDK structure
- [ ] Organize SDK files
- [ ] Create SDK documentation
- [ ] Update main README.md
- [ ] Write feature guides
- [ ] Review social media integration docs

**Next Month:**
- [ ] Cooldown analytics dashboard
- [ ] Tenant usage analytics
- [ ] Menu permission templates
- [ ] SDK publishing (if ready)

---

## 📊 Progress Tracking

### Completed Features ✅
- Survey cooldown rate limiting
- Database migrations (cooldown, menu, tenant)
- Core services implementation
- API endpoints
- Comprehensive documentation

### In Progress 🚧
- Frontend UI for cooldown
- Tenant management UI integration
- Menu permissions integration
- Code cleanup and organization

### Planned 📋
- Cooldown analytics
- Tenant analytics
- SDK organization
- Enhanced permissions
- Documentation updates

---

## 🎯 Priority Matrix

**High Priority (This Week):**
1. Push cooldown commit ⭐⭐⭐
2. Run database migrations ⭐⭐⭐
3. Build cooldown UI ⭐⭐⭐
4. Commit pending changes ⭐⭐

**Medium Priority (Next Week):**
1. SDK organization ⭐⭐
2. Write tests ⭐⭐
3. Update documentation ⭐⭐

**Low Priority (Next Month):**
1. Analytics dashboards ⭐
2. Enhanced features ⭐
3. Performance optimization ⭐

---

## 📞 Need Help?

**For Cooldown:**
- Documentation: `docs/SURVEY_COOLDOWN.md`
- Setup Guide: `docs/SURVEY_COOLDOWN_SETUP.md`
- Test: `server/test_cooldown.js`

**For Migrations:**
- Files: `server/migrations/*.js`
- Apply scripts: `server/apply_*.js`
- Check: `server/check_schema.js`

**For Testing:**
```bash
cd server
node test_cooldown.js           # Test cooldown
node check_schema.js            # Check database
npm test                        # Run all tests
```

---

**Last Updated**: February 17, 2026
**Next Review**: After completing this week's tasks

🚀 **Let's keep building!**
