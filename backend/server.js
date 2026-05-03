require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const leadsRoutes = require("./routes/leads");
const usersRoutes = require("./routes/users");
const callerStatsRoutes = require("./routes/callerStats");

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────
app.use("/api", authRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api", callerStatsRoutes);

// ── Health Check ──────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "Career Advisor 4U CRM API is running 🚀" }));

// ── MongoDB + Server Start ────────────────────────────────────
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
