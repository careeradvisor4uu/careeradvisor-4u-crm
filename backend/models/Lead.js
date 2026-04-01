const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  phone:       { type: String, trim: true },
  marks:       { type: Number, min: 0, max: 1000 },
  university:  { type: String, trim: true },
  followUpDate:{ type: String },
  time:        { type: String },
  status:      { type: String, default: '' },
  assignedTo:  { type: String, default: '' }, // telecaller name
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
