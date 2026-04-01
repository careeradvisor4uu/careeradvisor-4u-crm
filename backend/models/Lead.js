const mongoose = require('mongoose');

<<<<<<< HEAD
const leadSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  phone:       { type: String, trim: true },
  marks:       { type: Number, min: 0, max: 1000 },
  university:  { type: String, trim: true },
  followUpDate:{ type: String },
  time:        { type: String },
  status:      { type: String, default: '' },
  assignedTo:  { type: String, default: '' }, // telecaller name
=======
const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  status: { type: String, default: "" },
  followUp: { type: String, default: "" },
  followUpTime: { type: String, default: "" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
>>>>>>> 35a267393e3975c5459497aac4ca8fb96aa0c1c6
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
