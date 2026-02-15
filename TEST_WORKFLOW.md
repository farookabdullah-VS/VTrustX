# Testing Android Release Workflow

## 🧪 Manual Test Instructions

I've opened the GitHub Actions workflow page in your browser.

---

## 📋 Step-by-Step Test Procedure:

### Step 1: Verify Secrets Are Added

Before testing, confirm you've added all 4 secrets:

1. Go to: https://github.com/farookabdullah-VS/VTrustX/settings/secrets/actions
2. Verify you see:
   - ✅ ANDROID_KEYSTORE_BASE64
   - ✅ ANDROID_KEYSTORE_PASSWORD
   - ✅ ANDROID_KEY_ALIAS
   - ✅ ANDROID_KEY_PASSWORD

**If missing any secrets:** Add them first using `GITHUB_SECRETS_SETUP.md`

---

### Step 2: Trigger the Workflow

On the page that just opened:

1. You should see: **"Build Android Release"** workflow page

2. Click the **"Run workflow"** button (right side, gray button)

3. A dropdown will appear with these fields:

   **Branch:**
   - Select: `main`

   **Version name (e.g., 1.0.1):**
   - Enter: `1.0.0`

   **Version code (e.g., 2):**
   - Enter: `1`

4. Click the green **"Run workflow"** button

5. Page will refresh - you should see:
   ```
   "Build Android Release" workflow run queued
   ```

---

### Step 3: Monitor the Build

1. The workflow will appear in the list with a yellow/orange dot (⚫ → 🟡)

2. Click on the workflow run (it will show "Build Android Release #1")

3. You'll see the job: **"Build Android Release"**

4. Click on the job to see live logs

5. Watch the build progress through these steps:
   - ✓ Checkout code
   - ✓ Setup Node.js
   - ✓ Setup Java
   - ✓ Install dependencies (~2 min)
   - ✓ Build web app (~2 min)
   - ✓ Sync Capacitor (~30 sec)
   - ✓ Decode Keystore (~1 sec)
   - ✓ Create gradle.properties (~1 sec)
   - ✓ Build Release AAB (~3-4 min)
   - ✓ Build Release APK (~2-3 min)
   - ✓ Upload artifacts (~30 sec)

**Total time:** 8-12 minutes

---

### Step 4: Expected Success Output

When complete, you should see:

```
✅ Build Summary

### ✅ Android Release Build Successful! 🎉

📱 **App Name:** RayiX
🔨 **Build Type:** Release (Signed)
📦 **AAB Size:** ~12M
📦 **APK Size:** ~12M
🔢 **Version:** 1.0.0

### 📥 Download Options:
- **AAB** (for Play Store): RayiX-Android-Release-AAB
- **APK** (for direct install): RayiX-Android-Release-APK

### 🚀 Next Steps:
1. Download the AAB from Artifacts
2. Upload to Google Play Console
3. Submit for review
```

Green checkmark ✅ next to the workflow run.

---

### Step 5: Download the Build Artifacts

1. Scroll to the top of the workflow run page

2. Find the **"Artifacts"** section (below the summary)

3. You should see 2 artifacts:
   - **RayiX-Android-Release-AAB** (Play Store bundle)
   - **RayiX-Android-Release-APK** (Direct install)

4. Click on each to download as ZIP files

5. Extract the ZIP files:
   - `RayiX-Android-Release-AAB.zip` → `app-release.aab`
   - `RayiX-Android-Release-APK.zip` → `app-release.apk`

---

## ✅ Success Criteria

The test is successful if:

- [x] Workflow starts without errors
- [x] "Decode Keystore" step succeeds (secrets are correct)
- [x] "Build Release AAB" step succeeds
- [x] "Build Release APK" step succeeds
- [x] 2 artifacts are uploaded
- [x] Green checkmark on workflow run
- [x] AAB and APK files download successfully

---

## 🐛 If the Build Fails

### Error: "ANDROID_KEYSTORE_BASE64 not found"

**Cause:** Secret not added or wrong name

**Fix:**
1. Go to Settings → Secrets → Actions
2. Add secret with EXACT name: `ANDROID_KEYSTORE_BASE64`
3. Re-run workflow

---

### Error: "Wrong password for keystore"

**Cause:** Password secret is incorrect

**Fix:**
1. Verify `ANDROID_KEYSTORE_PASSWORD` = `RayiX2026Secure!`
2. Verify `ANDROID_KEY_PASSWORD` = `RayiX2026Secure!`
3. Check for typos, extra spaces, wrong case
4. Re-add secrets if needed
5. Re-run workflow

---

### Error: "Keystore was tampered with, or password was incorrect"

**Cause:** Base64 string is corrupted or incomplete

**Fix:**
1. Re-generate base64:
   ```bash
   base64 -w 0 client/android/app/rayix-release-key.keystore > keystore-base64.txt
   ```
2. Copy ENTIRE contents (should be ~2,700 chars)
3. Re-add `ANDROID_KEYSTORE_BASE64` secret
4. Re-run workflow

---

### Error: "gradlew: Permission denied"

**Cause:** Execute permission not set

**Fix:** This should be handled by workflow, but if it fails:
1. Check workflow has this step:
   ```yaml
   - name: Grant execute permission for gradlew
     run: chmod +x client/android/gradlew
   ```
2. Re-run workflow

---

### Error: Build times out or takes too long

**Cause:** GitHub Actions runner might be slow or dependencies are large

**Solution:**
- Normal build time: 8-12 minutes
- Maximum timeout: 30 minutes
- Wait patiently
- If timeout, re-run workflow

---

## 🔄 Re-running a Failed Build

If the build fails:

1. Click **"Re-run jobs"** (top right, circular arrow icon)
2. Select **"Re-run failed jobs"** or **"Re-run all jobs"**
3. Workflow will restart from the beginning

**Note:** Fix the issue (secrets, etc.) before re-running!

---

## 📊 Understanding the Workflow Logs

### Key Steps to Watch:

**1. Decode Keystore**
```
Run echo "$KEYSTORE_BASE64" | base64 -d > client/android/app/rayix-release-key.keystore
```
- Should complete instantly
- No output = success
- Error here = base64 secret is wrong

**2. Create gradle.properties**
```
Run echo "RAYIX_RELEASE_STORE_FILE=rayix-release-key.keystore" >> gradle.properties
```
- Should complete instantly
- Creates signing configuration

**3. Build Release AAB**
```
Run ./gradlew bundleRelease
```
- Takes 3-4 minutes
- You'll see Gradle output
- Should end with: `BUILD SUCCESSFUL in Xm Ys`

**4. Build Release APK**
```
Run ./gradlew assembleRelease
```
- Takes 2-3 minutes
- Many tasks will show `UP-TO-DATE` (using cache)
- Should end with: `BUILD SUCCESSFUL in Xm Ys`

**5. Get file sizes**
```
Run AAB_SIZE=$(du -h app/build/outputs/bundle/release/app-release.aab | cut -f1)
```
- Should output: ~12M

**6. Upload Release AAB/APK**
```
Run actions/upload-artifact@v4
```
- Uploads 2 artifacts
- Should show upload progress

---

## 🎯 What to Check in Build Logs

### ✅ Good Signs:
```
✓ Setup Node.js
✓ Setup Java
✓ Install dependencies (npm ci completed)
✓ Build web app (vite build completed)
✓ Decode Keystore (no errors)
✓ BUILD SUCCESSFUL (for both AAB and APK)
✓ Uploading artifact (2 files)
```

### ❌ Bad Signs:
```
✗ Error: Secret ANDROID_KEYSTORE_BASE64 not found
✗ Keystore was tampered with
✗ BUILD FAILED with an exception
✗ error: keystore password was incorrect
✗ Task failed with an error
```

---

## 📦 Verifying Downloaded Artifacts

After downloading and extracting:

### Check AAB File:
```bash
# Navigate to extracted folder
ls -lh app-release.aab

# Should show: ~12M

# Verify it's a valid AAB (ZIP format)
unzip -l app-release.aab | head -20

# Should show: META-INF/, base/, etc.
```

### Check APK File:
```bash
ls -lh app-release.apk

# Should show: ~12M

# Verify it's signed
jarsigner -verify -verbose -certs app-release.apk

# Should show: "jar verified"
```

### Test Installation (APK):
```bash
# Install on connected device or emulator
adb install app-release.apk

# Should install successfully
```

---

## 🚀 Next Steps After Successful Test

Once the test build succeeds:

1. **Download AAB** from artifacts
2. **Upload to Play Console:**
   - Go to Google Play Console
   - Create new release (Internal Testing first)
   - Upload `app-release.aab`
   - Add release notes
   - Submit for review

3. **Automate future releases:**
   - Create Git tag: `git tag -a v1.0.1 -m "Release 1.0.1"`
   - Push tag: `git push origin v1.0.1`
   - Create GitHub Release
   - Workflow automatically builds and attaches AAB/APK

4. **Monitor in production:**
   - Watch crash reports
   - Monitor Play Console reviews
   - Track download metrics

---

## 📈 Performance Metrics

**Expected build times:**
- Checkout: 10-20 seconds
- Setup: 30 seconds
- Install dependencies: 2-3 minutes
- Build web: 2-3 minutes
- Sync Capacitor: 30 seconds
- Build AAB: 3-4 minutes
- Build APK: 2-3 minutes
- Upload: 30 seconds

**Total: 8-12 minutes**

**Disk usage:**
- AAB: ~12 MB
- APK: ~12 MB
- Node modules: ~800 MB (cached)
- Gradle cache: ~400 MB (cached)

---

## 🎉 Success Checklist

After workflow completes successfully:

- [x] Green checkmark on workflow run
- [x] No error messages in logs
- [x] BUILD SUCCESSFUL for both AAB and APK
- [x] 2 artifacts uploaded
- [x] AAB file ~12 MB
- [x] APK file ~12 MB
- [x] AAB downloads and extracts
- [x] APK downloads and extracts
- [x] APK installs on device (optional test)
- [x] App launches without crashes (optional test)

---

## 💾 Saving Test Results

After successful test:

1. **Take screenshot** of successful workflow run
2. **Save artifacts** to a safe location:
   - `builds/release/v1.0.0/app-release.aab`
   - `builds/release/v1.0.0/app-release.apk`
3. **Document** in your launch checklist
4. **Share** with team if applicable

---

## 🎓 Learning Points

From this test, you've verified:

✅ GitHub secrets are correctly configured
✅ Keystore decodes properly
✅ Signing configuration works
✅ Gradle build succeeds
✅ Artifacts upload successfully
✅ CI/CD pipeline is fully operational

**You're now ready for production releases!** 🚀

---

**Test Date:** February 15, 2026
**Expected Duration:** 8-12 minutes
**Success Rate:** Should be 100% if secrets are correct

Good luck with your test! Let me know the results! 🎉
