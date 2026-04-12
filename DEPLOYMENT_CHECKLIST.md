# 🚀 RENDER + NETLIFY DEPLOYMENT CHECKLIST

Complete this checklist in order. Estimated time: **30 minutes**

---

## ✅ PRE-DEPLOYMENT CHECKLIST

- [ ] You have a GitHub account
- [ ] Your code is pushed to GitHub (main/master branch)
- [ ] MongoDB Atlas account created
- [ ] Render account created (https://render.com)
- [ ] Netlify account created (https://netlify.com)
- [ ] You have the `.env` template file

---

## 🗂️ STEP 1: MONGODB ATLAS SETUP (5 min)

### Create Cluster
- [ ] Go to https://www.mongodb.com/cloud/atlas
- [ ] Sign in or create account
- [ ] Click "Clusters" → Create a new cluster
- [ ] Select **Free Tier** 
- [ ] Choose region closest to you (e.g., Oregon)
- [ ] Click **"Create Cluster"**

### Create Database User
- [ ] Go to **"Security"** → **"Database Access"**
- [ ] Click **"Add New Database User"**
- [ ] Username: `Admin`
- [ ] Auto-generate password or create strong one
- [ ] **Copy password** and save it somewhere safe!
- [ ] Click **"Add User"**

### Whitelist IP
- [ ] Go to **"Security"** → **"Network Access"**
- [ ] Click **"Add IP Address"**
- [ ] Enter: `0.0.0.0/0` (allows from anywhere)
- [ ] Click **"Confirm"**

### Get Connection String
- [ ] Go back to **"Clusters"**
- [ ] Click **"Connect"**
- [ ] Select **"Connect your application"**
- [ ] Choose **"Node.js"** driver
- [ ] Copy the connection string
- [ ] **IMPORTANT:** Replace `<password>` with your actual MongoDB password
- [ ] Replace `myFirstDatabase` with `attendance-system`

**Your MongoDB URI should look like:**
```
mongodb+srv://Admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/attendance-system?retryWrites=true&w=majority
```

- [ ] **Save this URI - you'll need it in next steps!**

---

## 🔧 STEP 2: PREPARE BACKEND FOR DEPLOYMENT (3 min)

### Update Backend .env
- [ ] Create `.env` file in root directory (backend folder)
- [ ] Copy from `backend/.env.example`
- [ ] Paste your MongoDB URI
- [ ] Set `CORS_ORIGIN=` (leave blank for now)
- [ ] Set `NODE_ENV=production`

### Commit Changes
- [ ] Open terminal in project folder
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Add deploy config"`
- [ ] Run: `git push origin main` (or master)

---

## 🚀 STEP 3: DEPLOY BACKEND TO RENDER (10 min)

### Create Render Service
- [ ] Go to https://render.com → Sign in with GitHub
- [ ] Click **"New +"** → **"Web Service"**
- [ ] Click **"Connect repository"**
- [ ] Find and select: `CAPSTONE-Attendance-System`
- [ ] Authorize connection

### Configure Service
- [ ] **Name:** `attendance-system-api`
- [ ] **Region:** Oregon (or closest to you)
- [ ] **Branch:** main (or master)
- [ ] **Root Directory:** (leave empty)
- [ ] **Runtime:** Node
- [ ] **Build Command:** `npm install`
- [ ] **Start Command:** `npm start`
- [ ] **Plan:** Free (standard)

### Add Environment Variables
- [ ] Click **"Advanced"** → **"Add Environment Variable"**
- [ ] Key: `MONGODB_URI`
- [ ] Value: `mongodb+srv://Admin:PASSWORD@cluster0.xxxxx.mongodb.net/attendance-system?retryWrites=true&w=majority`
- [ ] Repeat for:
  - Key: `NODE_ENV` → Value: `production`
  - Key: `PORT` → Value: `3001`
  - Key: `CORS_ORIGIN` → Value: (leave empty for now)

- [ ] Click **"Create Web Service"**
- [ ] Wait 5-10 minutes for deployment
- [ ] Check logs - should see "Server running"

### Get Your Backend URL
- [ ] Once deployed, copy the URL from Render dashboard
- [ ] Should look like: `https://attendance-system-api.onrender.com`
- [ ] **Save this URL!**

### Test Backend
- [ ] Open browser → `https://attendance-system-api.onrender.com/api/health`
- [ ] Should see JSON response with status ✅

---

## 🎨 STEP 4: PREPARE FRONTEND FOR DEPLOYMENT (3 min)

### Update Frontend .env
- [ ] Create/update `.env` file in **ROOT** directory
- [ ] Update `REACT_APP_API_URL=` with your Render URL
  ```
  REACT_APP_API_URL=https://attendance-system-api.onrender.com
  REACT_APP_WS_URL=wss://attendance-system-api.onrender.com
  ```

### Commit Changes
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Update API URL for Render"`
- [ ] Run: `git push origin main`

---

## 🎨 STEP 5: DEPLOY FRONTEND TO NETLIFY (8 min)

### Connect Repository
- [ ] Go to https://netlify.com → Sign in with GitHub
- [ ] Click **"Add new site"** → **"Import an existing project"**
- [ ] Click GitHub provider
- [ ] Find and select: `CAPSTONE-Attendance-System`
- [ ] Authorize if prompted

### Configure Build
- [ ] **Branch:** main (or master)
- [ ] **Build command:** `npm run build`
- [ ] **Publish directory:** `build`
- [ ] Click **"Advanced"** → **"New variable"**
  - Key: `REACT_APP_API_URL`
  - Value: `https://attendance-system-api.onrender.com`
  - Repeat for: `REACT_APP_WS_URL` → `wss://attendance-system-api.onrender.com`
  - Repeat for: `CI` → `false`

- [ ] Click **"Deploy site"**
- [ ] Wait 3-5 minutes
- [ ] Check logs - should see "Site is live"

### Get Your Frontend URL
- [ ] Copy your Netlify URL from dashboard
- [ ] Should look like: `https://attendance-system.netlify.app`
- [ ] **This is your public app URL!**

---

## 🔐 STEP 6: UPDATE BACKEND CORS (2 min)

### Add Frontend URL to Backend
- [ ] Go back to **Render Dashboard**
- [ ] Select your backend service
- [ ] Go to **"Environment"**
- [ ] Find `CORS_ORIGIN` variable
- [ ] Update value to your Netlify URL: `https://attendance-system.netlify.app`
- [ ] Click **"Save"**
- [ ] Click **"Manual Deploy"** → **"Deploy latest commit"**
- [ ] Wait 2-3 minutes for redeploy

---

## 🧪 STEP 7: TEST YOUR LIVE APP (2 min)

### Test Frontend
- [ ] Open your Netlify URL in browser
  ```
  https://attendance-system.netlify.app
  ```
- [ ] You should see the **Login page** ✅
- [ ] Login with:
  - Username: `admin`
  - Password: `admin123`
- [ ] You should see the **Admin Dashboard** ✅

### Test API Endpoints
Open in new browser tab (or use curl):
```
https://attendance-system-api.onrender.com/api/health
https://attendance-system-api.onrender.com/api/students
```

Should return JSON data ✅

### Test Database
- [ ] In admin dashboard, check if students are listed ✅
- [ ] Try recording attendance via Face Recognition ✅
- [ ] Try viewing attendance records ✅

---

## 🎉 DEPLOYMENT COMPLETE!

Your attendance system is now **LIVE** and accessible online!

| Component | URL |
|-----------|-----|
| **Your App** | https://attendance-system.netlify.app |
| **Backend API** | https://attendance-system-api.onrender.com |
| **Database** | MongoDB Atlas (private) |

---

## 📝 IMPORTANT NOTES

### Free Tier Limitations
- **Render:** Backend auto-sleeps after 15 min inactivity (spins up in 50ms)
- **Netlify:** No limitations on free tier

### Common Issues & Fixes

**Login doesn't work?**
- Check browser console (F12) for error
- Ensure `REACT_APP_API_URL` is correct
- Verify Render backend is running (check logs)

**"Cannot reach API" error?**
- Wait 5 minutes for Render to fully deploy
- Check `CORS_ORIGIN` is set correctly on backend
- Verify MongoDB connection string is correct

**Shows blank page?**
- Clear browser cache (Ctrl+Shift+Del)
- Check Netlify deploy logs for build errors
- Verify `npm run build` works locally

---

## 🔄 DEPLOYING UPDATES

After this initial setup, future updates are **automatic**:

1. Make code changes locally
2. Commit: `git add . && git commit -m "Your message"`
3. Push: `git push origin main`
4. **Both frontend and backend auto-redeploy!** ✅

---

## 📞 SUPPORT

**Render Issues?** Check `/settings/source` → view logs
**Netlify Issues?** Check `Deploys` → select deployment → view build log
**MongoDB Issues?** Check Atlas dashboard → Collections

---

## 🎯 NEXT STEPS

1. Share your app URL: `https://attendance-system.netlify.app`
2. Test with real users
3. Monitor logs for errors
4. Consider upgrading Render for always-on backend (~$12/month)
5. Set up custom domain (optional)

**Congratulations on deploying your attendance system! 🚀**
