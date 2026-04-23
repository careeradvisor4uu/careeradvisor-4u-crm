const mongoose = require("mongoose");
const callLogSchema = new mongoose.Schema({
  callerId:   { type: String, required: true },
  callerName: { type: String, required: true },
  date:       { type: String, required: true },
  duration:   { type: Number, default: 0 },
  answered:   { type: Boolean, default: false },
  createdAt:  { type: Date, default: Date.now },
});
module.exports = mongoose.model("CallLog", callLogSchema);
