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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
