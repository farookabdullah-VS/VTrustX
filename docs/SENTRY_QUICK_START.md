# 🚀 Sentry Quick Start (5 Minutes)

Fast track to get Sentry running on VTrustX.

---

## Step 1: Get Your DSN (3 minutes)

### **Option A: New to Sentry?**
1. Go to **https://sentry.io/signup**
2. Sign up with GitHub (fastest)
3. Create project "VTrustX-Backend" (Node.js)
4. **Copy the DSN** (looks like `https://...@o123456.ingest.sentry.io/7654321`)
5. Create second project "VTrustX-Frontend" (React)
6. **Copy the second DSN**

### **Option B: Already have Sentry?**
1. Go to **https://sentry.io**
2. Click **"Settings"** → **"Projects"**
3. Click your project → **"Client Keys (DSN)"**
4. Copy the DSN

---

## Step 2: Add to Environment Files (2 minutes)

### **Backend** (`server/.env`):
```bash
SENTRY_DSN=https://YOUR_BACKEND_DSN_HERE
SENTRY_ENVIRONMENT=production
```

### **Frontend** (`client/.env`):
```bash
VITE_SENTRY_DSN=https://YOUR_FRONTEND_DSN_HERE
VITE_ENVIRONMENT=production
```

---

## Step 3: Restart & Test (1 minute)

```bash
# Restart backend
cd server && npm run dev

# Restart frontend (new terminal)
cd client && npm run dev
```

**Test it:**
Trigger any error (wrong login, invalid data) and check https://sentry.io

---

## ✅ Done!

Sentry is now:
- ✅ Tracking all errors
- ✅ Monitoring performance
- ✅ Recording sessions
- ✅ Identifying users

**View Dashboard:** https://sentry.io/issues

---

## 🔥 Pro Tips

### **Reduce Noise**
Set sample rate to 10% in production:
```bash
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### **Get Slack Alerts**
1. Sentry → Settings → Integrations
2. Connect Slack
3. Get errors in your channel

### **See User Sessions**
When error occurs, click "Replays" tab in Sentry to watch what user did.

---

**Need detailed instructions?** See `SENTRY_SETUP_GUIDE.md`
