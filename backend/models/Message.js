const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
    },
    type: {
      type: String,
      enum: ['message', 'notification', 'announcement'],
      default: 'message',
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    status: {
      type: String,
      enum: ['unread', 'read'],
      default: 'unread',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
