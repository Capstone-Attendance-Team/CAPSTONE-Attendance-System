const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      unique: true,
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
    },
    photo: {
      type: String, // base64 encoded image
      required: false,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    descriptor: {
      type: [Number], // face embedding array
      required: false,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Link to parent user
      default: null,
    },
    parentEmail: {
      type: String, // Store parent email for quick access
      default: null,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    parentPhoneNumber: {
      type: String, // Parent phone number for SMS (format: +1234567890)
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
