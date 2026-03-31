const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("./models/User");
const Lead = require("./models/Lead");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/crm";
mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// ===== AUTH =====
app.post("/api/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email, password: req.body.password });
    if (!user) return res.status(401).send("Invalid email or password");
    const token = jwt.sign({ id: user._id, role: user.role }, "SECRET");
    res.json({ token, user });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// ===== ADMIN ROUTE TO CREATE USER =====
app.post("/api/users", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json(user);
  } catch (err) {
    if (err.code === 11000) return res.status(400).send("User already exists");
    res.status(400).send("Error creating user");
  }
});

// ===== AUTO ASSIGN =====
async function assignLead() {
  const callers = await User.find({ role: "caller" });
  if (callers.length === 0) return null;
  const count = await Lead.countDocuments();
  return callers[count % callers.length]._id;
}

// ===== WHATSAPP =====
async function sendWhatsApp(phone, message) {
  try {
    console.log(`[WhatsApp Mock] Message intended for ${phone}: ${message}`);
  } catch (err) {
    console.error("WhatsApp Integration Error:", err.message);
  }
}

// ===== CREATE LEAD =====
app.post("/api/leads", async (req, res) => {
  try {
    const assigned = await assignLead();
    const lead = new Lead({ ...req.body, assignedTo: assigned });
    await lead.save();
    await sendWhatsApp(lead.phone,
      "Hi from Career Advisor 4U 🎓 B.Tech admissions open with FREE laptop. Reply YES for details.");
    res.json(lead);
  } catch (err) {
    if (err.code === 11000) return res.status(400).send("Duplicate lead found with this phone number");
    res.status(400).send("Error creating lead");
  }
});

// ===== GET LEADS =====
app.get("/api/leads", async (req, res) => {
  try {
    const leads = await Lead.find().populate('assignedTo', 'name email');
    res.json(leads);
  } catch (err) {
    res.status(500).send("Error fetching leads");
  }
});

// ===== UPDATE LEAD =====
app.put("/api/leads/:id", async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    io.emit("leadUpdated", lead);
    res.json(lead);
  } catch (err) {
    res.status(400).send("Error updating lead");
  }
});

// ===== FORGOT PASSWORD =====
app.post("/api/forgot-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).send("No user found with that email");
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: "Password Reset - Career Advisor CRM",
      html: `<p>Click the link below to reset your password. Link expires in 1 hour.</p>
             <a href="${resetLink}">${resetLink}</a>`
    });
    res.json({ message: "Reset email sent successfully" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).send("Error sending reset email");
  }
});

// ===== RESET PASSWORD =====
app.post("/api/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() }
    });
    if (!user) return res.status(400).send("Invalid or expired token");
    user.password = req.body.password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).send("Error resetting password");
  }
});

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Advanced CRM Backend Running on port ${PORT}`));
