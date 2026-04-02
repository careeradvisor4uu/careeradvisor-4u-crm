const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/seed-admin', async (req, res) => {
  try {
    const hash = await bcrypt.hash('Admin123', 10);
    await User.deleteMany({ email: 'siva22110109@gmail.com' });
    await User.create({
      name: 'Siva',
      email: 'siva22110109@gmail.com',
      password: hash,
      role: 'admin'
    });
    res.json({ message: 'Admin created!' });
  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = router;
