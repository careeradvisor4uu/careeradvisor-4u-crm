const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const User = require('../models/User');
const PushSubscription = require('../models/PushSubscription');
const { sendPush } = require('../utils/pushNotify');

// GET all telecallers
router.get('/telecallers', async (req, res) => {
  try {
    const telecallers = await User.find({ role: 'telecaller' }).select('_id name email');
    res.json(telecallers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unassigned leads sorted by follow-up date
router.get('/unassigned', async (req, res) => {
  try {
    const leads = await Lead.find({ assignedTo: null })
      .sort({ followUpDate: 1, followUpTime: 1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST assign one lead manually
router.post('/assign', async (req, res) => {
  const { leadId, telecallerId } = req.body;
  try {
    await Lead.findByIdAndUpdate(leadId, {
      assignedTo: telecallerId,
      assignedAt: new Date()
    });
    const sub = await PushSubscription.findOne({ userId: telecallerId });
    if (sub) {
      const lead = await Lead.findById(leadId);
      await sendPush(sub.subscription, {
        title: 'New lead assigned to you',
        body: `${lead.name} has been added to your list.`,
        url: '/my-leads'
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST auto-assign by follow-up date
router.post('/auto-assign', async (req, res) => {
  const maxPerCaller = req.body.maxPerCaller || 30;
  try {
    const telecallers = await User.find({ role: 'telecaller' }).select('_id');
    const unassigned = await Lead.find({ assignedTo: null }).sort({ followUpDate: 1 });
    let index = 0;
    let count = 0;
    for (const lead of unassigned) {
      if (index >= telecallers.length) index = 0;
      lead.assignedTo = telecallers[index]._id;
      lead.assignedAt = new Date();
      await lead.save();
      index++;
      count++;
      if (count >= maxPerCaller * telecallers.length) break;
    }
    res.json({ assigned: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;