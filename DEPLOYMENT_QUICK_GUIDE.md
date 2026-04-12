# 🚀 Railway + Netlify - Quick Copy & Paste Guide

## ⏱️ Total Time: ~20 minutes

---

## 📋 QUICK STEPS

### Backend to Railway (10 minutes)

1. **Sign Up:** https://railway.app → Sign in with GitHub
2. **New Project** → **Deploy from GitHub**
3. **Select** `CAPSTONE-Attendance-System` repo
4. **Wait** for auto-deployment (Railway detects Node.js)
5. **Add Variables:**
   - Name: `MONGODB_URI`
   - Value: `mongodb+srv://Admin:PASSWORD@cluster0.ztigwfi.mongodb.net/attendance-system?retryWrites=true&w=majority`
6. **Copy** your Railway URL

Example Railway URL:
```
https://capstone-attendance-production.up.railway.app
```

---

### Frontend to Netlify (10 minutes)

1. **Update `.env` locally:**
```env
REACT_APP_API_URL=https://capstone-attendance-production.up.railway.app
```

2. **Commit & Push:**
```bash
git add .env
git commit -m "Update to Railway API URL"
git push origin main
```

3. **Sign Up:** https://netlify.com → Sign in with GitHub

4. **Import Site** → Select `CAPSTONE-Attendance-System`

5. **Build Settings** (should auto-detect):
   - Build Command: `npm run build`
   - Publish Directory: `build`
   - Environment: `REACT_APP_API_URL=https://capstone-attendance-production.up.railway.app`

6. **Deploy** → Wait 1-2 minutes

7. **Get Netlify URL**, example:
```
https://your-app-name.netlify.app
```

---

## 🧪 Test Login

1. Go to: `https://your-app-name.netlify.app`
2. Login: `admin` / `admin123`
3. Should see dashboard ✅

---

## 📍 Your Live URLs

| Service | URL |
|---------|-----|
| Frontend | `https://your-app-name.netlify.app` |
| Backend | `https://capstone-attendance-production.up.railway.app` |
| API Test | `https://capstone-attendance-production.up.railway.app/api/health` |

---

## ❌ Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `Cannot POST /api/user/login` | Backend not deployed. Wait & redeploy. |
| `Login failed: Unexpected token '<'` | Frontend using wrong API URL. Update `.env`, commit, push. |
| `authentication failed` | Wrong MongoDB password. Update in Railway variables. |
| `Connection refused` | Backend down. Check Railway logs. |

---

## ✨ Done!

Your app is live! Share your Netlify URL with others. 🎉

---

**Optional: Custom Domain**

Go to Netlify → Site Settings → Domain Management → Add custom domain
