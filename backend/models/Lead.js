const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true, required: true },
  course: String,
  college: String,
  status: { type: String, default: "New Lead", enum: ["New Lead", "Interested", "Follow-up", "Converted"] },
  followUpDate: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Lead", LeadSchema);
