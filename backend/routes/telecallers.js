const express = require('express');
const router = express.Router();
const Telecaller = require('../models/Telecaller');

router.get('/', async (req, res) => {
  try {
    const telecallers = await Telecaller.find().sort({ createdAt: -1 });
    res.json({ success: true, data: telecallers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const telecaller = await Telecaller.create(req.body);
    res.status(201).json({ success: true, data: telecaller });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Telecaller.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Telecaller deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
