const express = require('express');
const router = express.Router();
const PushSubscription = require('../models/PushSubscription');
const Notification = require('../models/Notification');

// Save push subscription from browser
router.post('/subscribe', async (req, res) => {
  const { subscription, userId } = req.body;
  try {
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { userId, subscription, endpoint: subscription.endpoint },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET in-app notifications for a user
router.get('/:userId', async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 }).limit(50)
      .populate('leadId', 'name phone');
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET unread count
router.get('/:userId/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.params.userId, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH mark all as read
router.patch('/:userId/mark-read', async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.params.userId }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;