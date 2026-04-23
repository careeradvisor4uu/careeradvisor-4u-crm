const express = require("express");
const router = express.Router();
const CallLog = require("../models/CallLog");

router.post("/log-call", async (req, res) => {
  try {
    const { callerId, callerName, date, duration, answered } = req.body;
    const newCall = new CallLog({
      callerId, callerName,
      date: date || new Date().toISOString().split("T")[0],
      duration, answered,
    });
    await newCall.save();
    res.status(201).json({ message: "Call logged", call: newCall });
  } catch (err) {
    res.status(500).json({ error: "Failed to log call" });
  }
});

router.get("/caller-stats", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const stats = await CallLog.aggregate([
      { $match: { date: today } },
      { $group: {
          _id: "$callerId",
          callerName: { $first: "$callerName" },
          totalCalls: { $sum: 1 },
          answeredCalls: { $sum: { $cond: ["$answered", 1, 0] } },
          totalDuration: { $sum: "$duration" },
      }},
      { $project: {
          callerId: "$_id", callerName: 1,
          totalCalls: 1, answeredCalls: 1, totalDuration: 1,
          answerRate: { $multiply: [{ $divide: ["$answeredCalls", "$totalCalls"] }, 100] },
      }},
      { $sort: { totalCalls: -1 } },
    ]);
    res.json({ date: today, callers: stats });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/caller-stats/:callerId", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const calls = await CallLog.find({ callerId: req.params.callerId, date: today }).sort({ createdAt: -1 });
    const total = calls.length;
    const answered = calls.filter(c => c.answered).length;
    res.json({
      callerId: req.params.callerId,
      callerName: calls[0]?.callerName || "Unknown",
      date: today, totalCalls: total, answeredCalls: answered,
      totalDuration: calls.reduce((s, c) => s + c.duration, 0),
      answerRate: total > 0 ? +((answered / total) * 100).toFixed(1) : 0,
      calls,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

module.exports = router;
