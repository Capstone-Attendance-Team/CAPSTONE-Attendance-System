const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'absent',
    },
    date: {
      type: String,
      required: [true, 'Date is required'], // YYYY-MM-DD format
    },
    arrivalTime: {
      type: String,
      default: null, // HH:mm:ss format in 24-hour time
    },
    viaFacialRecognition: {
      type: Boolean,
      default: false,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    recordedByName: {
      type: String,
      default: 'Unknown',
    },
    // Email notification tracking
    parentNotified: {
      type: Boolean,
      default: false,
    },
    parentNotificationTime: {
      type: Date,
      default: null,
    },
    parentNotificationStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: null,
    },
    // SMS notification tracking
    smsNotificationSent: {
      type: Boolean,
      default: false,
    },
    smsNotificationTime: {
      type: Date,
      default: null,
    },
    smsNotificationStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: null,
    },
    smsTwilioMessageSid: {
      type: String, // Twilio message tracking ID
      default: null,
    },
  },
  { timestamps: true }
);

// Index for faster queries
attendanceSchema.index({ studentId: 1, date: 1 });
attendanceSchema.index({ section: 1, date: 1 });
attendanceSchema.index({ recordedBy: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
