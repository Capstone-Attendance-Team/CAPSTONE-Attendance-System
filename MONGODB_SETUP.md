# 🗄️ MongoDB Schema Setup Guide

This guide explains how to set up your MongoDB database with Mongoose schemas and seed it with sample data.

## 📋 Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── models/
│   ├── Student.js
│   ├── Attendance.js
│   ├── User.js
│   ├── Message.js
│   ├── Notification.js
│   ├── Announcement.js
│   └── index.js             # Models export
└── seeders/
    └── seed.js              # Database seeder with sample data
```

---

## 🚀 Setup Instructions

### Step 1: Install MongoDB

#### **Option A: Local MongoDB (Recommended for Development)**

1. Download from: https://www.mongodb.com/try/download/community
2. Install and start MongoDB service
   - **Windows**: MongoDB runs as a service (search "Services" → Find MongoDB)
   - **Mac**: `brew services start mongodb-community`
   - **Linux**: `sudo systemctl start mongod`

3. Verify installation:
   ```bash
   mongosh
   ```
   You should see: `test>`

#### **Option B: MongoDB Atlas (Cloud Database)**

1. Go to: https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/attendance-system`
5. Update `.env` file with your connection string

---

### Step 2: Install Dependencies

If you haven't already, install required packages:

```bash
npm install mongoose bcryptjs
```

**Explanation:**
- `mongoose`: ODM (Object Data Modeling) for MongoDB
- `bcryptjs`: For password hashing (optional but recommended)

---

### Step 3: Update `.env` File

Your `.env` file should already have MongoDB configuration:

```env
MONGODB_URI=mongodb://localhost:27017/attendance-system
PORT=5000
NODE_ENV=development
```

**For MongoDB Atlas**, use:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/attendance-system?retryWrites=true&w=majority
```

---

### Step 4: Run the Seeder

To populate the database with sample data:

```bash
node backend/seeders/seed.js
```

**Expected Output:**
```
✅ MongoDB connected successfully
🔄 Starting database seeding...

🗑️ Clearing existing data...
✅ Cleared all collections

📚 Seeding students...
✅ Created 5 students

👥 Seeding users...
✅ Created 4 users

✅ Linked student to parent

📋 Seeding attendance records...
✅ Created 50 attendance records

📢 Seeding announcements...
✅ Created 3 announcements

💬 Seeding messages...
✅ Created 3 messages

🔔 Seeding notifications...
✅ Created 3 notifications

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ DATABASE SEEDING COMPLETED SUCCESSFULLY! ✨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary:
   📚 Students: 5
   👥 Users: 4
   📋 Attendance: 50
   💬 Messages: 3
   📢 Announcements: 3
   🔔 Notifications: 3
```

---

## 📚 Database Schema Overview

### 1. **Students Collection**
```javascript
{
  _id: ObjectId,
  fullName: "Jenesis Joaquin",
  studentId: "244961",
  section: "101",
  photo: "data:image/jpeg;base64,...",
  status: "Active",           // "Active" | "Inactive"
  descriptor: [0.5, 0.6, ...], // 128-element face embedding
  createdAt: Date,
  updatedAt: Date
}
```

### 2. **Attendance Collection**
```javascript
{
  _id: ObjectId,
  studentId: "244961",
  name: "Jenesis Joaquin",
  section: "101",
  subject: "math",
  status: "present",          // "present" | "absent" | "late"
  date: "2025-10-17",
  viaFacialRecognition: true,
  createdAt: Date,
  updatedAt: Date
}
```

### 3. **Users Collection**
```javascript
{
  _id: ObjectId,
  username: "admin",
  password: "hashed_password",
  email: "admin@admin.com",
  type: "admin",              // "admin" | "teacher" | "parent"
  approved: true,
  assignedSections: ["101", "102"],
  linkedStudents: [ObjectId, ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

### 4. **Messages Collection**
```javascript
{
  _id: ObjectId,
  sender: ObjectId,           // User reference
  recipient: ObjectId,        // User reference
  type: "message",            // "message" | "notification" | "announcement"
  subject: "Excuse Letter Approved",
  content: "Your excuse letter was approved",
  status: "unread",           // "unread" | "read"
  createdAt: Date,
  updatedAt: Date
}
```

### 5. **Notifications Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // User reference
  type: "announcement",       // "announcement" | "message" | "system"
  message: "New announcement: test11",
  announcementId: ObjectId,   // Announcement reference
  read: false,
  createdAt: Date,
  updatedAt: Date
}
```

### 6. **Announcements Collection**
```javascript
{
  _id: ObjectId,
  message: "test",
  author: "Admin",
  authorId: ObjectId,         // User reference
  audience: "both",           // "teachers" | "parents" | "students" | "both"
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 How to Use in Your Backend

### In an Express Route:

```javascript
const express = require('express');
const { Student, Attendance, User } = require('./backend/models');
const connectDB = require('./backend/config/database');

const app = express();

// Connect to database
connectDB();

// Example: Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example: Create attendance
app.post('/api/attendance', async (req, res) => {
  try {
    const attendance = new Attendance(req.body);
    await attendance.save();
    res.json(attendance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## 🔄 Resetting the Database

To clear and reseed the database:

```bash
node backend/seeders/seed.js
```

This will:
1. Drop all collections
2. Create new collections with proper schema validation
3. Insert sample data

---

## ⚠️ Important Notes

### Password Security
Currently, passwords are stored as plain text (⚠️ NOT RECOMMENDED for production).

To hash passwords, update `User.js`:

```javascript
const bcrypt = require('bcryptjs');

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
```

### Face Descriptors
The `descriptor` field stores 128-element arrays from face-api.js recognition. The seeder uses mock data. Replace with actual descriptors from your face recognition system.

---

## 🆘 Troubleshooting

### MongoDB Connection Error
```
MongooseError: Cannot connect to mongodb://localhost:27017/attendance-system
```
**Fix:**
- Ensure MongoDB service is running
- Check if port 27017 is available
- Verify `MONGODB_URI` in `.env`

### Seeder Error: "Collection already exists"
```
MongoError: E11000 duplicate key error
```
**Fix:** The seeder automatically clears data first. Ensure you're running:
```bash
node backend/seeders/seed.js
```

### ObjectId Reference Error
```
ValidationError: linkedStudents: Cast to ObjectId failed
```
**Fix:** Ensure you're passing valid MongoDB ObjectIds when creating references.

---

## 📖 Next Steps

1. ✅ Set up MongoDB
2. ✅ Run the seeder
3. Create Express routes to handle CRUD operations
4. Connect frontend API calls to backend endpoints
5. Implement password hashing with bcryptjs
6. Add authentication/JWT tokens

---

## 📌 Quick Reference Commands

```bash
# Connect to local MongoDB
mongosh

# View databases
show databases

# Use a database
use attendance-system

# View collections
show collections

# View documents in a collection
db.students.find()

# Run seeder
node backend/seeders/seed.js
```

---

**Happy coding! 🚀**
