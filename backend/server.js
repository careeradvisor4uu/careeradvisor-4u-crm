const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");

const User = require("./models/User");
const Lead = require("./models/Lead");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Fallback to local MongoDB if YOUR_MONGO_URI isn't provided
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
    // Note: To make this work, replace YOUR_ID and YOUR_TOKEN
    /*
    await axios.post("https://graph.facebook.com/v18.0/YOUR_ID/messages", {
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: message }
    }, {
      headers: {
        Authorization: `Bearer YOUR_TOKEN`,
        "Content-Type": "application/json"
      }
    });
    */
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

// ===== UPDATE LEAD (also sync realtime) =====
app.put("/api/leads/:id", async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    io.emit("leadUpdated", lead);
    res.json(lead);
  } catch (err) {
    res.status(400).send("Error updating lead");
  }
});

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Advanced CRM Backend Running on port ${PORT}`));
