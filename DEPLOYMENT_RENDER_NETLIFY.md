# 🚀 Render + Netlify - Complete Deployment Guide

## ⏱️ Total Time: ~30 minutes

---

## 📋 PREREQUISITES

1. **GitHub Account** - Repository pushed
2. **MongoDB Atlas Account** - Cloud database setup
3. **Render Account** - https://render.com (free tier available)
4. **Netlify Account** - https://netlify.com (free tier available)

---

## 🔧 STEP 1: MongoDB Atlas Setup (5 minutes)

### 1.1 Create MongoDB Atlas Cluster
- Go to https://www.mongodb.com/cloud/atlas
- Sign in or create account
- Create a new project: "Attendance System"
- Create a cluster: Deploy → Select "Free Tier"
- Choose region closest to you
- Create database user: `Admin` with strong password
- Whitelist IP: Allow access from anywhere (0.0.0.0/0)

### 1.2 Get Connection String
- Click "Connect"
- Choose "Connect your application"
- Copy connection string:
```
mongodb+srv://Admin:PASSWORD@cluster0.xxxxx.mongodb.net/attendance-system?retryWrites=true&w=majority
```
- **Replace PASSWORD** with your actual password
- Save this for later!

---

## 🚀 STEP 2: Deploy Backend to Render (10 minutes)

### 2.1 Prepare Backend
Create `.env` file in root directory:
```env
# MongoDB
MONGODB_URI=mongodb+srv://Admin:PASSWORD@cluster0.xxxxx.mongodb.net/attendance-system?retryWrites=true&w=majority

# Server
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-netlify-domain.netlify.app

# WebSocket (Optional - for real-time attendance)
WS_URL=wss://your-render-url.onrender.com
```

### 2.2 Create Render Configuration
Create `render.yaml` in root:
```yaml
services:
  - type: web
    name: attendance-system-api
    env: node
    region: oregon
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: MONGODB_URI
        sync: false
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: CORS_ORIGIN
        sync: false
```

### 2.3 Deploy to Render
1. Go to https://render.com → Sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repository
4. Select branch: `main` or `master`
5. Configure:
   - **Name:** `attendance-system-api`
   - **Runtime:** `Node`
   - **Root Directory:** (leave empty)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

6. **Add Environment Variables:**
   ```
   MONGODB_URI: mongodb+srv://Admin:PASSWORD@cluster0.xxxxx.mongodb.net/attendance-system?retryWrites=true&w=majority
   NODE_ENV: production
   PORT: 3001
   CORS_ORIGIN: (leave blank for now)
   ```

7. Click **"Create Web Service"**
8. Wait 5-10 minutes for deployment
9. **Copy your Render URL** (e.g., `https://attendance-system-api.onrender.com`)

### 2.4 Test Backend
Open in browser:
```
https://attendance-system-api.onrender.com/api/health
```

Should see:
```json
{
  "status": "Server is running",
  "time": "2026-04-12T00:00:00.000Z"
}
```

---

## 🎨 STEP 3: Deploy Frontend to Netlify (10 minutes)

### 3.1 Prepare Frontend
Update `.env` in project root:
```env
REACT_APP_API_URL=https://attendance-system-api.onrender.com
REACT_APP_WS_URL=wss://attendance-system-api.onrender.com
```

### 3.2 Create Netlify Configuration
Create `netlify.toml` in root:
```toml
[build]
  command = "npm run build"
  publish = "build"

[build.environment]
  REACT_APP_API_URL = "https://attendance-system-api.onrender.com"
  REACT_APP_WS_URL = "wss://attendance-system-api.onrender.com"
  CI = "false"

[dev]
  command = "npm start"
  port = 3000

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3.3 Commit Changes
```bash
git add .env netlify.toml
git commit -m "Add Render + Netlify deployment config"
git push origin main
```

### 3.4 Deploy to Netlify
1. Go to https://netlify.com → Sign in with GitHub
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose GitHub provider
4. Select repository: `CAPSTONE-Attendance-System`
5. Configure:
   - **Branch to deploy:** `main`
   - **Build command:** `npm run build`
   - **Publish directory:** `build`
   - **Environment variables:**
     ```
     REACT_APP_API_URL: https://attendance-system-api.onrender.com
     REACT_APP_WS_URL: wss://attendance-system-api.onrender.com
     ```

6. Click **"Deploy site"**
7. Wait 3-5 minutes
8. **Get your Netlify URL** (e.g., `https://attendance-system.netlify.app`)

### 3.5 Update Backend CORS
Go back to Render dashboard:
1. Select your backend service
2. Go to **"Environment"**
3. Update `CORS_ORIGIN`:
   ```
   https://attendance-system.netlify.app
   ```
4. Redeploy by clicking **"Manual Deploy"** → **"Deploy latest commit"**

---

## 🧪 STEP 4: Test Your Deployment (5 minutes)

### 4.1 Test Frontend
1. Open: `https://attendance-system.netlify.app`
2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`
3. Should see Admin Dashboard ✅

### 4.2 Test API
```bash
curl https://attendance-system-api.onrender.com/api/health
curl https://attendance-system-api.onrender.com/api/students
```

### 4.3 Test Database
Login → Go to Admin Dashboard → Check if you see seeded students ✅

---

## 📍 Your Live URLs

| Component | URL |
|-----------|-----|
| **Frontend** | `https://attendance-system.netlify.app` |
| **Backend API** | `https://attendance-system-api.onrender.com` |
| **API Health** | `https://attendance-system-api.onrender.com/api/health` |
| **MongoDB** | Atlas Dashboard (private) |

---

## ❌ Troubleshooting

### Error: `Cannot POST /api/user/login`
**Cause:** Backend not deployed or failing
**Fix:**
- Check Render logs: Dashboard → Select service → "Logs"
- Ensure all env vars are set correctly
- Redeploy: Click "Manual Deploy"

### Error: `Login failed: Unexpected token '<'`
**Cause:** Frontend using wrong API URL
**Fix:**
- Update `.env` with correct Render URL
- Commit and push to GitHub
- Netlify auto-redeploys on push

### Error: `CORS policy: No 'Access-Control-Allow-Origin'`
**Cause:** Backend CORS not configured for Netlify domain
**Fix:**
- Go to Render → Environment → Update `CORS_ORIGIN`
- Redeploy backend
- Wait 2-3 minutes

### Error: `MongoDB connection failed`
**Cause:** Wrong MongoDB URI or whitelist IP
**Fix:**
- Check password has no special characters (or URL encode them)
- Verify IP whitelist in Atlas: `Network Access` → Allow `0.0.0.0/0`
- Test URI locally first: `npm run seed`

### Error: `Render App sleeps after 15 minutes of inactivity`
**Solution:** Upgrade to paid tier or set up monitoring ping
- Paid tier: ~$12/month for always-on
- Free tier: Auto-sleeps (spins up in 50ms when accessed)

---

## 🔒 Security Best Practices

1. **Never commit `.env`** to GitHub
2. **Use strong MongoDB password** (no special chars or URL encode)
3. **Set different passwords** for prod vs dev
4. **Enable 2FA** on all accounts
5. **Restrict MongoDB** IP whitelist if possible
6. **Use environment variables** for sensitive data

---

## 🚀 Optional: Custom Domain

### For Netlify
1. Purchase domain (GoDaddy, Namecheap, etc.)
2. Go to Netlify → Site Settings → Domain Management
3. Add custom domain
4. Update DNS records as instructed

### For Render
Same process - go to service settings → Custom Domain

---

## 📈 Monitoring & Logs

### Render Logs
- Service → "Logs" tab
- Shows real-time server activity
- Check here first for errors

### Netlify Logs
- Site → Deploys → Select deployment
- Shows build logs and errors

### MongoDB Logs
- Atlas Dashboard → Deployment → Logs
- Shows query performance

---

## ✨ Done! Your App is Live 🎉

Share your Netlify URL with others. The system is now accessible online!

**Next Steps:**
- Test with real users
- Monitor logs for errors
- Set up automated backups for MongoDB
- Consider adding monitoring (Sentry, LogRocket, etc.)
