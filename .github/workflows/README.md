# GitHub Actions Workflows

Automated CI/CD pipelines for RayiX project.

## 📋 Available Workflows

### 1. Android Debug Build (`android-build.yml`)

**Triggers:**
- Push to `main` or `develop` branches (when `client/**` changes)
- Pull requests to `main` branch
- Manual workflow dispatch

**What it does:**
- Builds web app with npm
- Syncs Capacitor
- Builds debug APK
- Uploads APK as artifact (30-day retention)

**Artifact:** `RayiX-Android-Debug.apk`

**Use case:** Testing and QA

---

### 2. Android Release Build (`android-release.yml`)

**Triggers:**
- GitHub release creation
- Manual workflow dispatch (with version inputs)

**What it does:**
- Builds production web app
- Syncs Capacitor
- Decodes signing keystore from secrets
- Builds signed release AAB and APK
- Uploads both as artifacts (90-day retention)
- Attaches files to GitHub release (if triggered by release)

**Artifacts:**
- `RayiX-Android-Release-AAB` (for Play Store)
- `RayiX-Android-Release-APK` (for direct install)

**Use case:** Production releases to Play Store

---

### 3. iOS Build (`ios-build.yml`)

**Triggers:**
- Push to `main` or `develop` branches (when `client/**` changes)
- Pull requests to `main` branch
- Manual workflow dispatch

**What it does:**
- Builds web app with npm
- Syncs Capacitor
- Installs CocoaPods dependencies
- Builds iOS app for simulator (Debug, unsigned)
- Creates IPA artifact
- Uploads IPA (30-day retention)

**Artifact:** `RayiX-iOS-Debug.ipa`

**Use case:** Testing on iOS Simulator

---

## 🔐 Required Secrets

To use the Android Release workflow, add these secrets to your GitHub repository:

### Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** for each of the following:

#### Android Signing Secrets

**`ANDROID_KEYSTORE_BASE64`**
- Your signing keystore encoded in base64
- To generate:
```bash
base64 -w 0 client/android/app/rayix-release-key.keystore > keystore.txt
# Copy contents of keystore.txt
```

**`ANDROID_KEYSTORE_PASSWORD`**
- Value: `RayiX2026Secure!`
- Your keystore password

**`ANDROID_KEY_ALIAS`**
- Value: `rayix-key`
- Your key alias

**`ANDROID_KEY_PASSWORD`**
- Value: `RayiX2026Secure!`
- Your key password

### Security Best Practices

- ✅ Never commit keystore or passwords to git
- ✅ Use GitHub secrets for all sensitive data
- ✅ Rotate secrets if compromised
- ✅ Limit access to repository secrets
- ✅ Use environment-specific secrets for staging/production

---

## 🚀 Usage

### Manual Android Debug Build

1. Go to **Actions** tab
2. Select **"Build Android App"**
3. Click **"Run workflow"**
4. Select branch (main/develop)
5. Click **"Run workflow"**
6. Wait for completion (~5-10 minutes)
7. Download APK from **Artifacts**

### Manual Android Release Build

1. Go to **Actions** tab
2. Select **"Build Android Release"**
3. Click **"Run workflow"**
4. Enter version name (e.g., `1.0.1`)
5. Enter version code (e.g., `2`)
6. Click **"Run workflow"**
7. Wait for completion (~8-12 minutes)
8. Download AAB/APK from **Artifacts**

### Automated Release (Recommended)

1. Create a new release on GitHub:
```bash
git tag -a v1.0.1 -m "Release version 1.0.1"
git push origin v1.0.1
```

2. Go to GitHub → **Releases** → **Draft a new release**
3. Choose tag: `v1.0.1`
4. Enter release title: `RayiX v1.0.1`
5. Add release notes
6. Click **"Publish release"**
7. Workflow automatically triggers
8. AAB and APK attached to release

---

## 📊 Build Status Badges

Add to your README.md:

```markdown
![Android Build](https://github.com/farookabdullah-VS/VTrustX/workflows/Build%20Android%20App/badge.svg)
![iOS Build](https://github.com/farookabdullah-VS/VTrustX/workflows/Build%20iOS%20App/badge.svg)
![Android Release](https://github.com/farookabdullah-VS/VTrustX/workflows/Build%20Android%20Release/badge.svg)
```

---

## 🐛 Troubleshooting

### Build Fails: "Keystore not found"

**Solution:** Add `ANDROID_KEYSTORE_BASE64` secret

```bash
# Generate base64 keystore
base64 -w 0 client/android/app/rayix-release-key.keystore
```

### Build Fails: "Wrong keystore password"

**Solution:** Verify secrets match your actual credentials:
- `ANDROID_KEYSTORE_PASSWORD`: Should be your keystore password
- `ANDROID_KEY_PASSWORD`: Should be your key password

### Build Fails: "Gradle build failed"

**Solution:** Check:
- `build.gradle` syntax is valid
- All dependencies are compatible
- Java version is correct (17)

### iOS Build Fails: "No profiles matching"

**Solution:** iOS simulator builds don't require code signing. If still failing:
- Check Xcode version compatibility
- Verify CocoaPods installation
- Review build logs for specific errors

---

## 📈 Performance

**Typical build times:**
- Android Debug: ~5 minutes
- Android Release: ~8 minutes
- iOS Debug: ~10 minutes

**Cache optimization:**
- npm packages cached
- Gradle dependencies cached
- CocoaPods cached

---

## 🔄 Workflow Updates

To modify workflows:

1. Edit `.yml` files in `.github/workflows/`
2. Commit and push changes
3. Workflows automatically update
4. Test with manual trigger

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Capacitor Android Build](https://capacitorjs.com/docs/android)
- [Capacitor iOS Build](https://capacitorjs.com/docs/ios)
- [Android Signing](https://developer.android.com/studio/publish/app-signing)

---

## ✅ Checklist for Production

Before using release workflow in production:

- [ ] Add all required secrets to GitHub
- [ ] Test release build manually first
- [ ] Verify AAB signs correctly
- [ ] Test installation on real device
- [ ] Backup keystore securely (offline + cloud)
- [ ] Document secret values in password manager
- [ ] Set up branch protection rules
- [ ] Configure auto-merge for dependabot
- [ ] Enable GitHub Discussions for releases

---

**Last Updated:** February 15, 2026
**Maintained by:** RayiX Development Team

For issues or questions, contact: devops@rayix.ai
