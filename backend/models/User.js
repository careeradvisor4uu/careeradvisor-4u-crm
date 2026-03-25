const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // In production, we would hash this
  role: { type: String, enum: ["admin", "caller"], default: "caller" }
});

module.exports = mongoose.model("User", UserSchema);
