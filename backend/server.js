const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');
const { Student, Attendance, User, Message, Notification, Announcement } = require('./models');

const app = express();

// Middleware
// CORS Configuration - Handle both local development and production
const corsOptions = {
  origin: function (origin, callback) {
    // Allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5000',
      'http://localhost:5001',
      'http://localhost:5002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5001',
      process.env.CORS_ORIGIN // Production URL from .env
    ].filter(Boolean);

    // Development mode: allow all localhost
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Production mode: check against allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// Connect to MongoDB
connectDB();

// ==================== ROOT ROUTE ====================

app.get('/', (req, res) => {
  res.json({
    message: '🚀 Attendance System Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      students: 'GET /api/students',
      attendance: 'GET /api/attendance',
      messages: 'GET /api/messages/:userId',
      announcements: 'GET /api/announcements',
      notifications: 'GET /api/notifications/:userId',
      health: 'GET /api/health'
    }
  });
});

// ==================== STUDENT ROUTES ====================

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get student by ID
app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create student
app.post('/api/students', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update student
app.put('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ATTENDANCE ROUTES ====================

// Get all attendance records
app.get('/api/attendance', async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate('recordedBy', 'username email type');
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's attendance (must be before :section/:date route)
app.get('/api/attendance/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const allRecords = req.query.all === 'true';
    
    const attendance = await Attendance.find({
      date: today
    }).populate('recordedBy', 'username email type');
    
    res.json(allRecords ? attendance : attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance by date and section
app.get('/api/attendance/:section/:date', async (req, res) => {
  try {
    const attendance = await Attendance.find({
      section: req.params.section,
      date: req.params.date,
    }).populate('recordedBy', 'username email type');
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create attendance
app.post('/api/attendance', async (req, res) => {
  try {
    const { recordedBy, recordedByName, ...attendanceData } = req.body;
    
    const attendance = new Attendance({
      ...attendanceData,
      recordedBy: recordedBy || null,
      recordedByName: recordedByName || 'Unknown'
    });
    
    await attendance.save();
    
    // Populate the recordedBy field before sending response
    await attendance.populate('recordedBy', 'username email type');
    
    res.status(201).json(attendance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== USER ROUTES ====================

// Login user
app.post('/api/user/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user by username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password (simple comparison - in production use bcrypt)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Return user data (excluding password)
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      type: user.type,
      approved: user.approved,
      assignedSections: user.assignedSections,
      linkedStudents: user.linkedStudents,
    };

    res.json({ success: true, user: userResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().populate('linkedStudents');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user
app.post('/api/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== MESSAGE ROUTES ====================

// Get messages for a user
app.get('/api/messages/:userId', async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.params.userId },
        { recipient: req.params.userId }
      ]
    }).populate('sender recipient');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create message
app.post('/api/messages', async (req, res) => {
  try {
    const message = new Message(req.body);
    await message.save();
    await message.populate('sender recipient');
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark message as read
app.put('/api/messages/:id/read', async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status: 'read' },
      { new: true }
    );
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ANNOUNCEMENT ROUTES ====================

// Get all announcements
app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find().populate('authorId', 'username email');
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create announcement
app.post('/api/announcements', async (req, res) => {
  try {
    const announcement = new Announcement(req.body);
    await announcement.save();
    await announcement.populate('authorId', 'username email');
    res.status(201).json(announcement);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== NOTIFICATION ROUTES ====================

// Get notifications for a user
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId })
      .populate('userId announcementId');
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADDITIONAL STUDENT ROUTES (Frontend compatibility) ====================

// Get all students with /list alias
app.get('/api/students/list', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add student with /add alias
app.post('/api/students/add', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update student with /update alias
app.put('/api/students/update/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete student with /delete alias
app.delete('/api/students/delete/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADDITIONAL USER ROUTES (Frontend compatibility) ====================

// Get users with /list alias - supports filtering by type
app.get('/api/user/list', async (req, res) => {
  try {
    const query = {};
    if (req.query.type) {
      query.type = req.query.type;
    }
    const users = await User.find(query).populate('linkedStudents');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('linkedStudents');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register user
app.post('/api/user/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user
app.delete('/api/user/delete/:userId', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADDITIONAL MESSAGE ROUTES (Frontend compatibility) ====================

// Get inbox messages for a user
app.get('/api/message/inbox/:userId', async (req, res) => {
  try {
    const role = req.query.role || 'user';
    const messages = await Message.find({
      recipient: req.params.userId
    }).populate('sender recipient');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sent messages for a user
app.get('/api/message/sent/:userId', async (req, res) => {
  try {
    const messages = await Message.find({
      sender: req.params.userId
    }).populate('sender recipient');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
app.post('/api/message/send', async (req, res) => {
  try {
    const message = new Message(req.body);
    await message.save();
    await message.populate('sender recipient');
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete message
app.delete('/api/message/:messageId', async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update message status
app.patch('/api/message/:messageId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { status },
      { new: true }
    );
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ATTENDANCE ROUTES (Frontend compatibility) ====================

// Get attendance by sections and date
app.get('/api/attendance/sections', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date query parameter required' });
    }

    const attendance = await Attendance.find({
      date: date
    }).populate('recordedBy', 'username email type');
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SUBJECT/SECTION ROUTES ====================

// Get all subject sections (mock endpoint - can be extended)
app.get('/api/subjectSection/list', async (req, res) => {
  try {
    // Return mock data or extend with actual SubjectSection model
    const sections = [
      { _id: '101', name: '101', section: 'Section A' },
      { _id: '102', name: '102', section: 'Section B' },
      { _id: '103', name: '103', section: 'Section C' }
    ];
    res.json(sections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', time: new Date() });
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong', details: err.message });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log('📝 API Documentation:');
  console.log('   GET    /api/students');
  console.log('   POST   /api/students');
  console.log('   GET    /api/attendance');
  console.log('   POST   /api/attendance');
  console.log('   GET    /api/messages/:userId');
  console.log('   POST   /api/messages');
  console.log('   GET    /api/announcements');
  console.log('   POST   /api/announcements\n');
});
