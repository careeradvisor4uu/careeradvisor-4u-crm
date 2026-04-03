const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../utils/authMiddleware");

router.use(authMiddleware);

// Admin-only guard
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json("Admin access required");
  next();
}

// GET /api/users — list all users (admin only)
router.get("/", adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password -resetToken -resetTokenExpiry").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json("Failed to fetch users: " + err.message);
  }
});

// POST /api/users — create user (admin only)
router.post("/", adminOnly, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json("Name, email, and password required");

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json("A user with this email already exists");

    const user = new User({ name, email, password, role: role || "caller" });
    await user.save();

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json("Failed to create user: " + err.message);
  }
});

// DELETE /api/users/:id — delete user (admin only)
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json("You cannot delete your own account");
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json("User not found");
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json("Failed to delete user: " + err.message);
  }
});

module.exports = router;
