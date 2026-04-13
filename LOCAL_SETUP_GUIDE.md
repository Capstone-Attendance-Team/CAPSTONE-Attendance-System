# 🚀 Local Development Setup Guide

Complete guide for setting up the Capstone Attendance System in your local development environment.

---

## 📋 Prerequisites

Before you start, make sure you have the following installed on your machine:

- **Node.js** (v14 or higher) – [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** – [Download here](https://git-scm.com/)
- **MongoDB** – [Download Community Edition](https://www.mongodb.com/try/download/community) OR use MongoDB Atlas (Cloud)

**Verify installations:**
```bash
node --version
npm --version
git --version
```

---

## 🔄 Step 1: Clone & Update Repository

### 1.1 Fetch Latest Changes
```bash
git fetch origin
```

### 1.2 Checkout Develop Branch
```bash
git checkout develop
```

### 1.3 Pull Latest Develop Changes
```bash
git pull origin develop
```

**Expected output:**
```
Already up to date.
# or
Auto-merging files...
# or specific file updates
```

---

## 🛠️ Step 2: Install Dependencies

Install all project dependencies:

```bash
npm install
```

This will:
- Install frontend dependencies (React, Material-UI, etc.)
- Install backend dependencies (Express, Mongoose, Socket.io, etc.)

**Wait for installation to complete.** This may take 2-5 minutes.

---

## 🗄️ Step 3: Database Setup

**You're using MongoDB Atlas (Cloud)** ✅

Since your `.env` already has the MongoDB Atlas connection string, no local database setup is needed:
```
MONGODB_URI=mongodb+srv://Admin:admin123@cluster0.ztigwfi.mongodb.net/attendance-system?retryWrites=true&w=majority
```

The backend will connect directly to the cloud database when you start it.

**Note:** If you prefer to switch to local MongoDB later, install it and update the `MONGODB_URI` in `.env`.

---

## 🔑 Step 4: Environment Configuration

Create `.env` file in the root directory with the following configuration:

```env
NODE_ENV=development
REACT_APP_API_URL=http://localhost:5000

# MongoDB Configuration
MONGODB_URI=mongodb+srv://Admin:admin123@cluster0.ztigwfi.mongodb.net/attendance-system?retryWrites=true&w=majority
```

**Key Configuration Notes:**
- `NODE_ENV=development` – Enables development mode CORS (accepts all localhost origins)
- `REACT_APP_API_URL=http://localhost:5000` – Frontend API endpoint
- `MONGODB_URI` – Database connection string (Atlas cloud DB is already configured)

---

---

## 🚀 Quick Start: Setup & Running

### Step by Step:

**1. Install Dependencies:**
```bash
npm install
```

**2. Configure Environment (.env file):**
Create `.env` in root directory with:
```env
NODE_ENV=development
REACT_APP_API_URL=http://localhost:5000
MONGODB_URI=mongodb+srv://Admin:admin123@cluster0.ztigwfi.mongodb.net/attendance-system?retryWrites=true&w=majority
```

**3. Seed Database (Optional):**
```bash
npm run seed
```

**4. Start Backend (Terminal 1):**
```bash
node backend/server.js
```
Expected: `✅ MongoDB connected successfully` + `🚀 Server running on port 5000`

**5. Start Frontend (Terminal 2):**
```bash
npm start
```
Expected: `Compiled successfully!` + Opens `http://localhost:3000`

**6. Login:**
- Navigate to `http://localhost:3000`
- Use seeded credentials:
  - **Admin:** Email: `admin@spcc.edu` | Password: `admin123`
  - Or any other seeded user credentials

---

## 🗂️ Detailed Setup Steps

**To stop servers:** Press `Ctrl + C`

### Step 5: Seed Database (Optional but Recommended)

Populate the database with sample data:

```bash
npm run seed
```

**What gets seeded:**
- Sample students with face descriptors
- Sample attendance records
- Sample users (teachers, parents, admins)
- Sample messages and notifications

**Seeded Admin Credentials:**
```
Email: admin@spcc.edu
Password: admin123
```

**Expected output:**
```
✅ MongoDB connected successfully
✅ Collections cleared
✅ Students seeded...
✅ Users seeded...
✅ Attendance records seeded...
✅ Database seeding completed!
```

---

## ✅ Verification Checklist

Confirm everything is working:

- [ ] Backend running on `http://localhost:5000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] MongoDB connected (check backend console)
- [ ] Can access login page
- [ ] No CORS errors in browser console
- [ ] WebSocket connection established (check Network tab in DevTools)

---

## ⚠️ Common Issues During Setup

### CORS Policy Errors
If you see CORS errors:
```
Access to fetch at 'http://localhost:5000/api/...' from origin 'http://localhost:XXXX' 
has been blocked by CORS policy
```

**Solution:** Ensure `.env` has `NODE_ENV=development`:
```env
NODE_ENV=development
REACT_APP_API_URL=http://localhost:5000
MONGODB_URI=mongodb+srv://Admin:admin123@cluster0.ztigwfi.mongodb.net/attendance-system?retryWrites=true&w=majority
```

Then **restart both servers** for changes to take effect.

### Port Already in Use
If port 3000 or 5000 is in use:
```bash
# Windows (PowerShell)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### JSX Transform Warning
If you see: "Your app is using an outdated JSX transform"
- This is a warning only, not an error
- It will resolve on next build (no action needed)

---

## 📁 Project Structure

```
CAPSTONE-Attendance-System/
├── backend/
│   ├── config/          # Database configuration
│   ├── models/          # Mongoose schemas
│   ├── seeders/         # Database seeding scripts
│   ├── utils/           # Helper functions
│   ├── server.js        # Express server entry point
│   └── .env             # Environment variables (create this)
├── src/
│   ├── pages/           # React pages
│   ├── components/      # React components
│   ├── api/             # API calls
│   ├── shared/          # Shared utilities
│   └── styles/          # CSS files
├── public/
│   └── models/          # Face recognition ML models
├── package.json         # Dependencies
└── .env                 # Frontend env vars (create this)
```

---

## 🐛 Troubleshooting

### MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:**
- Ensure MongoDB is running: `mongosh`
- Or update `MONGODB_URI` in `.env` to use MongoDB Atlas

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:**
```bash
# Windows: Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:5000 | xargs kill -9
```

### CORS Error in Browser
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:**
- Ensure `CORS_ORIGIN` in backend `.env` matches your frontend URL
- For local dev: `CORS_ORIGIN=http://localhost:3000`

### Node Modules Issue
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Seeding Fails
```bash
# Ensure MongoDB is running and check connection string
npm run seed
```

### Face Models Not Loading
```
❌ Error loading face-api models
```
**Solution:**
- Ensure `/public/models/` contains all required `.weights.json` and `.shard*` files
- Check browser Network tab for 404 errors

---

##  Additional Resources

- **Backend API Documentation:** See `backend/` comments and models
- **Database Schema:** See `.env.example` files
- **Deployment Guide:** See `DEPLOYMENT_RENDER_NETLIFY.md`
- **MongoDB Documentation:** [MongoDB Docs](https://docs.mongodb.com/)
- **Express.js Documentation:** [Express Docs](https://expressjs.com/)
- **React Documentation:** [React Docs](https://react.dev/)

---

## ✨ Quick Start Command Reference

```bash
# One-time setup
git fetch origin
git checkout develop
git pull origin develop
npm install
npm run seed

# Development (in two terminals)
# Terminal 1
npm start

# Terminal 2
npm start

# Database access
mongosh

# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

---

**Happy Coding! 🎉**
