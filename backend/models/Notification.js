const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    type: {
      type: String,
      enum: ['announcement', 'message', 'system'],
      default: 'system',
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
    },
    announcementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Announcement',
      required: false,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
