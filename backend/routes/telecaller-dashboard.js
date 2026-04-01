const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Notification = require('../models/Notification');

// GET leads assigned to a telecaller
router.get('/my-leads/:userId', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { assignedTo: req.params.userId };
    if (status) filter.status = status;
    const leads = await Lead.find(filter).sort({ followUpDate: 1, followUpTime: 1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST log a call and set callback or follow-up
router.post('/log-call', async (req, res) => {
  const { leadId, userId, outcome, followUpDate, followUpTime, callbackAt, notes } = req.body;
  const statusMap = {
    interested: 'Interested',
    not_interested: 'Not Interested',
    callback: 'callback',
    not_reachable: 'Contacted',
    voicemail: 'Contacted',
  };
  try {
    await Lead.findByIdAndUpdate(leadId, {
      status: statusMap[outcome] || outcome,
      followUpDate: followUpDate || null,
      followUpTime: followUpTime || null,
      callbackAt: outcome === 'callback' ? new Date(callbackAt) : null,
      notes,
      lastCalledAt: new Date(),
    });

    // If callback, save a scheduled notification
    if (outcome === 'callback' && callbackAt) {
      await Notification.findOneAndUpdate(
        { userId, leadId, type: 'callback' },
        {
          userId,
          leadId,
          type: 'callback',
          title: 'Callback reminder',
          body: `Time to call back lead`,
          scheduledAt: new Date(callbackAt),
          sent: false,
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET today's follow-ups for a telecaller
router.get('/todays-followups/:userId', async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const leads = await Lead.find({
      assignedTo: req.params.userId,
      followUpDate: { $gte: start, $lte: end }
    }).sort({ followUpTime: 1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;