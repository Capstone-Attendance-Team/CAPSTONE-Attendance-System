const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const connectDB = require('../config/database');

// Sample data
const sampleStudents = [
  {
    fullName: 'Jenesis Joaquin',
    studentId: '244961',
    section: '101',
    photo: 'data:image/jpeg;base64,...', // Replace with actual image
    status: 'Active',
    descriptor: Array(128).fill(0.5), // Mock face descriptor
  },
  {
    fullName: 'Maria Garcia',
    studentId: '244962',
    section: '101',
    photo: 'data:image/jpeg;base64,...',
    status: 'Active',
    descriptor: Array(128).fill(0.6),
  },
  {
    fullName: 'John Smith',
    studentId: '244963',
    section: '102',
    photo: 'data:image/jpeg;base64,...',
    status: 'Active',
    descriptor: Array(128).fill(0.55),
  },
  {
    fullName: 'Sarah Johnson',
    studentId: '244964',
    section: '101',
    photo: 'data:image/jpeg;base64,...',
    status: 'Active',
    descriptor: Array(128).fill(0.48),
  },
  {
    fullName: 'Michael Chen',
    studentId: '244965',
    section: '102',
    photo: 'data:image/jpeg;base64,...',
    status: 'Active',
    descriptor: Array(128).fill(0.65),
  },
];

const sampleUsers = [
  {
    username: 'admin',
    password: 'admin123', // ⚠️ In production, use bcrypt
    email: 'admin@admin.com',
    fullName: 'Administrator',
    type: 'admin',
    approved: true,
    assignedSections: ['101', '102'],
    linkedStudents: [],
  },
  {
    username: 'teacher1',
    password: 'teacher123',
    email: 'teacher1@school.com',
    fullName: 'Teacher One',
    type: 'teacher',
    approved: true,
    assignedSections: ['101'],
    linkedStudents: [],
  },
  {
    username: 'teacher2',
    password: 'teacher123',
    email: 'teacher2@school.com',
    fullName: 'Teacher Two',
    type: 'teacher',
    approved: true,
    assignedSections: ['102'],
    linkedStudents: [],
  },
  {
    username: 'parent1',
    password: 'parent123',
    email: 'parent1@email.com',
    fullName: 'Parent One',
    type: 'parent',
    approved: true,
    assignedSections: [],
    linkedStudents: [],
  },
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('🔄 Starting database seeding...\n');

    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await Promise.all([
      Student.deleteMany({}),
      Attendance.deleteMany({}),
      User.deleteMany({}),
      Message.deleteMany({}),
      Notification.deleteMany({}),
      Announcement.deleteMany({}),
    ]);
    console.log('✅ Cleared all collections\n');

    // Seed Students
    console.log('📚 Seeding students...');
    const createdStudents = await Student.insertMany(sampleStudents);
    console.log(`✅ Created ${createdStudents.length} students\n`);

    // Seed Users
    console.log('👥 Seeding users...');
    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${createdUsers.length} users\n`);

    // Update users with linked students
    const parentUser = createdUsers.find((u) => u.type === 'parent');
    if (parentUser && createdStudents.length > 0) {
      parentUser.linkedStudents = [createdStudents[0]._id];
      await parentUser.save();
      console.log('✅ Linked student to parent\n');
    }

    // Seed Attendance
    console.log('📋 Seeding attendance records...');
    const today = new Date();
    const attendanceRecords = [];
    
    // Get teacher users for recordedBy field
    const teachers = createdUsers.filter(u => u.type === 'teacher');

    // Function to generate realistic arrival time and status
    const generateArrivalTime = () => {
      const rand = Math.random();
      let hours, minutes, status;
      
      if (rand < 0.6) {
        // 60% Present: between 07:00 - 07:30
        hours = 7;
        minutes = Math.floor(Math.random() * 31);
        status = 'present';
      } else if (rand < 0.85) {
        // 25% Late: between 07:31 - 08:30
        hours = 7;
        minutes = Math.floor(Math.random() * 60) + 31;
        if (minutes >= 60) {
          hours = 8;
          minutes -= 60;
        }
        status = 'late';
      } else {
        // 15% Absent: 08:31 or later
        hours = Math.floor(Math.random() * 4) + 9; // 09:00 - 12:59
        minutes = Math.floor(Math.random() * 60);
        status = 'absent';
      }
      
      const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      return { arrivalTime: timeString, status };
    };

    for (let i = 0; i < createdStudents.length; i++) {
      const student = createdStudents[i];
      for (let j = 0; j < 10; j++) {
        const date = new Date(today);
        date.setDate(date.getDate() - j);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Randomly assign a teacher for this attendance record
        const randomTeacher = teachers[Math.floor(Math.random() * teachers.length)];
        
        // Generate realistic arrival time and status
        const { arrivalTime, status } = generateArrivalTime();

        attendanceRecords.push({
          studentId: student.studentId,
          name: student.fullName,
          section: student.section,
          subject: 'math',
          status: status,
          date: dateString,
          arrivalTime: arrivalTime,
          viaFacialRecognition: Math.random() > 0.3,
          recordedBy: randomTeacher ? randomTeacher._id : null,
          recordedByName: randomTeacher ? randomTeacher.username : 'Unknown',
        });
      }
    }

    const createdAttendance = await Attendance.insertMany(attendanceRecords);
    console.log(`✅ Created ${createdAttendance.length} attendance records\n`);

    // Seed Announcements
    console.log('📢 Seeding announcements...');
    const announcements = await Announcement.insertMany([
      {
        message: 'New announcement: Classes will start at 8:00 AM tomorrow',
        author: 'Admin',
        authorId: createdUsers[0]._id,
        audience: 'both',
      },
      {
        message: 'Reminder: Submit your homework by Friday',
        author: 'Teacher 1',
        authorId: createdUsers[1]._id,
        audience: 'students',
      },
      {
        message: 'Parent-teacher conference scheduled for next week',
        author: 'Admin',
        authorId: createdUsers[0]._id,
        audience: 'parents',
      },
    ]);
    console.log(`✅ Created ${announcements.length} announcements\n`);

    // Seed Messages
    console.log('💬 Seeding messages...');
    const messages = await Message.insertMany([
      {
        sender: createdUsers[0]._id,
        recipient: createdUsers[1]._id,
        type: 'message',
        subject: 'Meeting Tomorrow',
        content: 'Let\'s meet tomorrow at 2 PM to discuss the attendance records.',
        status: 'unread',
      },
      {
        sender: createdUsers[1]._id,
        recipient: createdUsers[3]._id,
        type: 'message',
        subject: 'Absence Report',
        content: 'Your child was absent on October 15th. Please contact the school.',
        status: 'unread',
      },
      {
        sender: createdUsers[0]._id,
        recipient: createdUsers[3]._id,
        type: 'message',
        subject: 'Excuse Letter Approved',
        content: 'Your excuse letter was approved. Thank you for your submission.',
        status: 'read',
      },
    ]);
    console.log(`✅ Created ${messages.length} messages\n`);

    // Seed Notifications
    console.log('🔔 Seeding notifications...');
    const notifications = await Notification.insertMany([
      {
        userId: createdUsers[1]._id,
        type: 'announcement',
        message: 'New announcement: Classes will start at 8:00 AM tomorrow',
        announcementId: announcements[0]._id,
        read: false,
      },
      {
        userId: createdUsers[3]._id,
        type: 'message',
        message: 'New message from admin: Excuse Letter Approved',
        announcementId: null,
        read: false,
      },
      {
        userId: createdUsers[1]._id,
        type: 'system',
        message: 'Your attendance report is ready for review',
        announcementId: null,
        read: true,
      },
    ]);
    console.log(`✅ Created ${notifications.length} notifications\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ DATABASE SEEDING COMPLETED SUCCESSFULLY! ✨');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Summary:');
    console.log(`   📚 Students: ${createdStudents.length}`);
    console.log(`   👥 Users: ${createdUsers.length}`);
    console.log(`   📋 Attendance: ${createdAttendance.length}`);
    console.log(`   💬 Messages: ${messages.length}`);
    console.log(`   📢 Announcements: ${announcements.length}`);
    console.log(`   🔔 Notifications: ${notifications.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
