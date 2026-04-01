const mongoose = require('mongoose');
const PushSubSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subscription: Object,
  endpoint:     { type: String, unique: true },
}, { timestamps: true });
module.exports = mongoose.model('PushSubscription', PushSubSchema);