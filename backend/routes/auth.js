const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");

// POST /api/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json("Email and password required");

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json("Invalid email or password");

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json("Invalid email or password");

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json("Server error: " + err.message);
  }
});

// POST /api/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json("No account found with that email");

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Career Advisor 4U" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset</h2>
        <p>Hi ${user.name},</p>
        <p>Click below to reset your password. Expires in 1 hour.</p>
        <a href="${resetUrl}" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
          Reset Password
        </a>
      `,
    });

    res.json("Reset email sent successfully");
  } catch (err) {
    res.status(500).json("Failed to send reset email: " + err.message);
  }
});

// POST /api/reset-password/:token
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json("Invalid or expired reset link");

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json("Password reset successful");
  } catch (err) {
    res.status(500).json("Server error: " + err.message);
  }
});

module.exports = router;
// One-time admin setup route - DELETE AFTER USE
router.post("/setup", async (req, res) => {
  try {
    const existing = await User.findOne({ email: "admin@crm.com" });
    if (existing) return res.json("Admin already exists");
    const user = new User({
      name: "Admin",
      email: "admin@crm.com",
      password: "admin123",
      role: "admin"
    });
    await user.save();
    res.json("✅ Admin created! Email: admin@crm.com / Password: admin123");
  } catch (err) {
    res.status(500).json(err.message);
  }
});