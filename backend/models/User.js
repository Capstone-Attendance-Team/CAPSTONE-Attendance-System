const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      // ⚠️ In production, use bcrypt to hash passwords
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    fullName: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['admin', 'teacher', 'parent'],
      default: 'teacher',
    },
    approved: {
      type: Boolean,
      default: false,
    },
    assignedSections: {
      type: [String],
      default: [],
    },
    linkedStudents: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Student',
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
