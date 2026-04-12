const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Message is required'],
    },
    author: {
      type: String,
      required: [true, 'Author name is required'],
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author ID is required'],
    },
    audience: {
      type: String,
      enum: ['teachers', 'parents', 'students', 'both'],
      default: 'both',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', announcementSchema);
