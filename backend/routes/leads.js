const express = require("express");
const router = express.Router();
const Lead = require("../models/Lead");
const authMiddleware = require("../utils/authMiddleware");

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json("Failed to fetch leads: " + err.message);
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, phone, status, followUpDate, time } = req.body;
    if (!name || !phone) return res.status(400).json("Name and phone are required");
    const lead = new Lead({ name, phone, status: status || "New", followUpDate: followUpDate || "", time: time || "" });
    const saved = await lead.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json("Failed to create lead: " + err.message);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, phone, status, followUpDate, time } = req.body;
    const updated = await Lead.findByIdAndUpdate(
      req.params.id,
      { name, phone, status, followUpDate: followUpDate || "", time: time || "" },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json("Lead not found");
    res.json(updated);
  } catch (err) {
    res.status(500).json("Failed to update lead: " + err.message);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Lead.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json("Lead not found");
    res.json({ message: "Lead deleted successfully" });
  } catch (err) {
    res.status(500).json("Failed to delete lead: " + err.message);
  }
});

module.exports = router;