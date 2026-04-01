const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  phone:       { type: String, trim: true },
  marks:       { type: Number, min: 0, max: 1000 },
  university:  { type: String, trim: true },
  followUpDate:{ type: String },
  time:        { type: String },
  status:      { type: String, default: '' },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAt:  { type: Date, default: null },
  callbackAt:  { type: Date, default: null },
  notes:       { type: String },
  lastCalledAt:{ type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);