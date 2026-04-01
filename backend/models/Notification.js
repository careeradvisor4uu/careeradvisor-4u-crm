const mongoose = require('mongoose');
const NotificationSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  leadId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  type:        String,
  title:       String,
  body:        String,
  read:        { type: Boolean, default: false },
  scheduledAt: Date,
  sent:        { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model('Notification', NotificationSchema);