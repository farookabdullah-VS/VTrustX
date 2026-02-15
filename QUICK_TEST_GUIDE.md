# 🚀 Quick Test Guide (2 Minutes)

## In the GitHub Page That Just Opened:

### ⚡ Super Quick Steps:

1. **Click "Run workflow"** (gray button, right side)

2. **Fill in the form:**
   ```
   Branch: main
   Version name: 1.0.0
   Version code: 1
   ```

3. **Click green "Run workflow"** button

4. **Wait 8-12 minutes** ⏱️

5. **Look for green checkmark** ✅

6. **Download artifacts** 📦
   - RayiX-Android-Release-AAB (for Play Store)
   - RayiX-Android-Release-APK (for testing)

---

## 🎯 Success = Green Checkmark

If you see ✅ next to the workflow:
- **You're ready for production!**
- Download AAB and submit to Play Store

If you see ❌ red X:
- **Check the logs** for error message
- **Common fixes:**
  - Re-add secrets if wrong
  - Verify base64 keystore is complete
  - Check passwords for typos

---

## 📞 Quick Help

**Build fails?** Check:
1. All 4 secrets added? (Settings → Secrets)
2. Base64 keystore complete? (~2,700 chars)
3. Passwords correct? (`RayiX2026Secure!`)

**Need detailed help?** See `TEST_WORKFLOW.md`

---

**Expected time:** 8-12 minutes
**Expected result:** 2 downloadable files (AAB + APK)

🎉 Good luck!
