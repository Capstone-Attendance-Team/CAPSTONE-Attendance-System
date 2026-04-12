# 🚀 Quick Start Guide - MongoDB + Express + React

## 📋 Prerequisites

- Node.js and npm installed
- MongoDB installed locally OR MongoDB Atlas account
- Your project dependencies installed

---

## ⚡ Quick Setup (5 minutes)

### 1️⃣ Install MongoDB (if not already installed)

**Windows:**
```bash
# Download from: https://www.mongodb.com/try/download/community
# Run installer and follow prompts
# MongoDB will start as a service automatically
```

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongod
```

---

### 2️⃣ Verify MongoDB is Running

```bash
mongosh
```
Should show: `test>`

Type `exit` to quit.

---

### 3️⃣ Run the Seeder (Populate Database)

```bash
node backend/seeders/seed.js
```

✅ You should see:
```
✅ MongoDB connected successfully
✨ DATABASE SEEDING COMPLETED SUCCESSFULLY! ✨

📊 Summary:
   📚 Students: 5
   👥 Users: 4
   📋 Attendance: 50
   💬 Messages: 3
   📢 Announcements: 3
   🔔 Notifications: 3
```

---

### 4️⃣ Start the Backend Server

```bash
node backend/server.js
```

✅ You should see:
```
🚀 Server running on http://localhost:5000
```

---

### 5️⃣ Start the Frontend (in a new terminal)

```bash
npm start
```

✅ React app opens at `http://localhost:3000`

---

## 🌐 API Endpoints (Examples)

### Get All Students
```bash
curl http://localhost:5000/api/students
```

### Get All Attendance
```bash
curl http://localhost:5000/api/attendance
```

### Create Student
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Doe",
    "studentId": "244966",
    "section": "101",
    "status": "Active"
  }'
```

### Create Attendance
```bash
curl -X POST http://localhost:5000/api/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "244961",
    "name": "Jenesis Joaquin",
    "section": "101",
    "subject": "math",
    "status": "present",
    "date": "2025-10-18"
  }'
```

---

## 📁 Project Structure

```
📦 CAPSTONE-Attendance-System
├── 📂 backend/
│   ├── 📂 config/
│   │   └── database.js          ← MongoDB connection
│   ├── 📂 models/
│   │   ├── Student.js
│   │   ├── Attendance.js
│   │   ├── User.js
│   │   ├── Message.js
│   │   ├── Notification.js
│   │   ├── Announcement.js
│   │   └── index.js
│   ├── 📂 seeders/
│   │   └── seed.js              ← Run this to populate DB
│   └── server.js                ← Main Express server
├── 📂 src/
│   ├── App.js
│   ├── pages/
│   ├── components/
│   └── ... (your React code)
├── .env                         ← MongoDB connection string
├── MONGODB_SETUP.md             ← Full documentation
└── package.json
```

---

## 🔧 Environment Variables (.env)

```env
# MongoDB (Local)
MONGODB_URI=mongodb://localhost:27017/attendance-system

# OR MongoDB Atlas (Cloud)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/attendance-system

# Server
PORT=5000
NODE_ENV=development

# Frontend
REACT_APP_API_URL=http://localhost:5000
```

---

## 📊 Sample Data Created by Seeder

### 👤 Default Users
| Username | Password | Type | Email |
|----------|----------|------|-------|
| admin | admin123 | admin | admin@admin.com |
| teacher1 | teacher123 | teacher | teacher1@school.com |
| teacher2 | teacher123 | teacher | teacher2@school.com |
| parent1 | parent123 | parent | parent1@email.com |

### 📚 Sample Students
- Jenesis Joaquin (ID: 244961, Section: 101)
- Maria Garcia (ID: 244962, Section: 101)
- John Smith (ID: 244963, Section: 102)
- Sarah Johnson (ID: 244964, Section: 101)
- Michael Chen (ID: 244965, Section: 102)

---

## 🆘 Troubleshooting

### MongoDB Connection Error
```
Cannot connect to mongodb://localhost:27017
```
**Fix:** Start MongoDB service
- Windows: Check Services (Ctrl+Shift+Esc)
- Mac: `brew services start mongodb-community`
- Linux: `sudo systemctl start mongod`

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Fix:** Kill process or use different port:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

### Seeder Won't Run
```
node: command not found
```
**Fix:** Install Node.js from https://nodejs.org/

---

## 🔄 Update Data

To update student attendance:

```javascript
// In your React component
const markAttendance = async (studentId, status) => {
  const response = await fetch('http://localhost:5000/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId,
      status,
      date: new Date().toISOString().split('T')[0],
      // ... other fields
    })
  });
  return response.json();
};
```

---

## 💾 Reset Database

To clear and repopulate:

```bash
node backend/seeders/seed.js
```

This will:
✅ Drop all collections
✅ Recreate with proper schemas
✅ Populate with fresh sample data

---

## 📚 Next: All-in-One Server Commands

Create a terminal alias for easy startup:

**Mac/Linux:**
```bash
# Add to ~/.bashrc or ~/.zshrc
alias start-attendance="mongod & node backend/server.js & npm start"
```

**Windows PowerShell:**
```powershell
# Add to PowerShell profile
Function Start-Attendance {
    mongod
    node backend/server.js
    npm start
}
```

---

## ✨ You're All Set!

- ✅ MongoDB set up
- ✅ Database seeded
- ✅ Backend running
- ✅ Frontend ready

Start building! 🚀

Questions? Check **MONGODB_SETUP.md** for full documentation.
