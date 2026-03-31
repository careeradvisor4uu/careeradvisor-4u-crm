const nodemailer = require("nodemailer");
const crypto = require("crypto");

// ===== FORGOT PASSWORD =====
app.post("/api/forgot-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).send("No user found with that email");

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
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

// ===== PASTE HERE =====
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// ===== FORGOT PASSWORD =====
app.post("/api/forgot-password", async (req, res) => {
  ... (your forgot password code)
});

// ===== RESET PASSWORD =====
app.post("/api/reset-password/:token", async (req, res) => {
  ... (your reset password code)
});

// THIS MUST BE LAST LINE
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Advanced CRM Backend Running on port ${PORT}`));
