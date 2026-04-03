const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["New", "Contacted", "Interested", "Not Interested", "Closed", "Converted"],
      default: "New",
    },
    followUpDate: { type: String, default: "" },
    time: { type: String, default: "" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);
