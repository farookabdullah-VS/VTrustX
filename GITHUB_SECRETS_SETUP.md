# GitHub Secrets Setup Guide

## 🔐 Required Secrets for Android Release Builds

To enable automated Android release builds, you need to add 4 secrets to your GitHub repository.

---

## 📋 Secret Values

Copy these exact values when adding secrets to GitHub:

### 1. ANDROID_KEYSTORE_BASE64

**Value:** (Long base64 string - see below)

```
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
```

**⚠️ IMPORTANT:** Copy the ENTIRE string above (single line, no spaces or line breaks)

---

### 2. ANDROID_KEYSTORE_PASSWORD

**Value:**
```
RayiX2026Secure!
```

---

### 3. ANDROID_KEY_ALIAS

**Value:**
```
rayix-key
```

---

### 4. ANDROID_KEY_PASSWORD

**Value:**
```
RayiX2026Secure!
```

---

## 🚀 Step-by-Step Instructions

### Step 1: Navigate to GitHub Secrets

1. **Open your browser** and go to:
   ```
   https://github.com/farookabdullah-VS/VTrustX
   ```

2. Click on **"Settings"** tab (top right)

3. In the left sidebar, click **"Secrets and variables"** → **"Actions"**

4. You should see: "Repository secrets" page

---

### Step 2: Add Secret #1 - ANDROID_KEYSTORE_BASE64

1. Click the **"New repository secret"** button (green button, top right)

2. In the **"Name"** field, type:
   ```
   ANDROID_KEYSTORE_BASE64
   ```

3. In the **"Secret"** field:
   - Open the file: `client/android/keystore-base64.txt`
   - OR copy the long string from the "Secret Values" section above
   - **IMPORTANT:** Paste the ENTIRE string (should be ~2,700 characters)
   - **Make sure:** No spaces, no line breaks, single continuous line

4. Click **"Add secret"** (green button at bottom)

5. You should see: ✅ "Secret ANDROID_KEYSTORE_BASE64 was created"

---

### Step 3: Add Secret #2 - ANDROID_KEYSTORE_PASSWORD

1. Click **"New repository secret"** again

2. Name: `ANDROID_KEYSTORE_PASSWORD`

3. Secret: `RayiX2026Secure!`

4. Click **"Add secret"**

5. You should see: ✅ "Secret ANDROID_KEYSTORE_PASSWORD was created"

---

### Step 4: Add Secret #3 - ANDROID_KEY_ALIAS

1. Click **"New repository secret"** again

2. Name: `ANDROID_KEY_ALIAS`

3. Secret: `rayix-key`

4. Click **"Add secret"**

5. You should see: ✅ "Secret ANDROID_KEY_ALIAS was created"

---

### Step 5: Add Secret #4 - ANDROID_KEY_PASSWORD

1. Click **"New repository secret"** again

2. Name: `ANDROID_KEY_PASSWORD`

3. Secret: `RayiX2026Secure!`

4. Click **"Add secret"**

5. You should see: ✅ "Secret ANDROID_KEY_PASSWORD was created"

---

## ✅ Verification

After adding all 4 secrets, your "Repository secrets" page should show:

```
ANDROID_KEYSTORE_BASE64      Updated now
ANDROID_KEY_ALIAS            Updated now
ANDROID_KEY_PASSWORD         Updated now
ANDROID_KEYSTORE_PASSWORD    Updated now
```

**Note:** You won't be able to view the secret values after creation (GitHub hides them for security).

---

## 🧪 Test the Setup

### Option 1: Manual Workflow Trigger

1. Go to **"Actions"** tab on GitHub

2. Click **"Build Android Release"** (left sidebar)

3. Click **"Run workflow"** (right side)

4. Enter:
   - **Version name:** `1.0.0`
   - **Version code:** `1`

5. Click **"Run workflow"** (green button)

6. Wait 8-12 minutes for build to complete

7. Check for: ✅ Green checkmark (success)

8. Download artifacts:
   - `RayiX-Android-Release-AAB` (for Play Store)
   - `RayiX-Android-Release-APK` (for direct install)

---

### Option 2: Test via GitHub Release

1. Create a test release:
   ```bash
   git tag -a v1.0.0 -m "Test release"
   git push origin v1.0.0
   ```

2. Go to GitHub → **"Releases"** → **"Draft a new release"**

3. Choose tag: `v1.0.0`

4. Title: `RayiX v1.0.0`

5. Description: `Initial test release`

6. Click **"Publish release"**

7. Workflow automatically triggers

8. AAB and APK will be attached to the release automatically

---

## 🔒 Security Best Practices

### ✅ DO:
- Keep secrets secure in GitHub (they're encrypted)
- Rotate secrets if compromised
- Backup keystore file separately (offline + cloud)
- Document secret values in password manager
- Limit repository access to trusted team members

### ❌ DON'T:
- Share secrets publicly or commit to git
- Email secrets in plain text
- Store secrets in code or config files
- Use weak passwords for keystore
- Forget to backup the keystore file

---

## 🐛 Troubleshooting

### Error: "Keystore not found"

**Solution:** Check that `ANDROID_KEYSTORE_BASE64` is correct:
- Should be a long string (~2,700 characters)
- No spaces or line breaks
- Properly base64-encoded

**Test locally:**
```bash
# Decode base64 to verify it's valid
echo "YOUR_BASE64_STRING" | base64 -d > test-keystore.keystore
# Check file size (should be ~2.7 KB)
ls -lh test-keystore.keystore
```

---

### Error: "Wrong password"

**Solution:** Verify secrets match your actual credentials:
- `ANDROID_KEYSTORE_PASSWORD`: Should be `RayiX2026Secure!`
- `ANDROID_KEY_PASSWORD`: Should be `RayiX2026Secure!`
- Check for typos, extra spaces, or wrong case

**Test locally:**
```bash
# Test keystore password
keytool -list -v -keystore client/android/app/rayix-release-key.keystore
# Enter password: RayiX2026Secure!
```

---

### Error: "Secret not found"

**Solution:** Ensure secret names are EXACTLY as specified:
- `ANDROID_KEYSTORE_BASE64` (not `KEYSTORE_BASE64` or `ANDROID_KEYSTORE`)
- `ANDROID_KEYSTORE_PASSWORD` (not `KEYSTORE_PASSWORD`)
- `ANDROID_KEY_ALIAS` (not `KEY_ALIAS`)
- `ANDROID_KEY_PASSWORD` (not `KEY_PASSWORD`)

**Check:** Secret names are case-sensitive!

---

### Build Fails: "Permission denied"

**Solution:** Check workflow file permissions:
```yaml
# Ensure gradlew has execute permission
- name: Grant execute permission for gradlew
  run: chmod +x client/android/gradlew
```

---

## 📊 Expected Results

### Successful Build Output:
```
✅ Android Release Build Successful! 🎉

📱 App Name: RayiX
🔨 Build Type: Release (Signed)
📦 AAB Size: 12M
📦 APK Size: 12M
🔢 Version: 1.0.0

📥 Download Options:
- AAB (for Play Store): RayiX-Android-Release-AAB
- APK (for direct install): RayiX-Android-Release-APK

🚀 Next Steps:
1. Download the AAB from Artifacts
2. Upload to Google Play Console
3. Submit for review
```

---

## 📁 Files Reference

**Keystore Location:**
```
client/android/app/rayix-release-key.keystore
```

**Base64 File (for reference):**
```
client/android/keystore-base64.txt
```

**Credentials Backup:**
```
client/android/SIGNING_CREDENTIALS.txt
```

**GitHub Workflows:**
```
.github/workflows/android-build.yml (Debug)
.github/workflows/android-release.yml (Release)
```

---

## 🎉 Success!

Once all 4 secrets are added:

✅ Automated Android builds enabled
✅ Signed AAB ready for Play Store
✅ Signed APK ready for distribution
✅ GitHub releases automatically build and attach files
✅ CI/CD pipeline fully operational

---

## 📞 Need Help?

If you encounter issues:

1. **Check GitHub Actions logs:**
   - Go to Actions tab
   - Click on failed workflow
   - Expand failed steps
   - Look for error messages

2. **Verify secrets:**
   - Go to Settings → Secrets
   - Ensure all 4 secrets are present
   - Re-add if any are missing

3. **Test locally first:**
   - Build release APK locally: `./gradlew assembleRelease`
   - Verify signing works before trying CI/CD

4. **Review documentation:**
   - `.github/workflows/README.md`
   - `LAUNCH_CHECKLIST.md`
   - `GOOGLE_PLAY_STORE_GUIDE.md`

---

**Last Updated:** February 15, 2026

**Next Steps:**
1. Add secrets to GitHub (follow steps above)
2. Test manual workflow trigger
3. Create first GitHub release (v1.0.0)
4. Download AAB and submit to Play Store!

Good luck with your launch! 🚀
