import { OAuth2Client } from "google-auth-library";
import express from "express";
import bcrypt from "bcryptjs";
import { userModel } from "../model/userModel.js";
import { validateRegister, validateLogin, sanitizeInput, validateSendOtp, sendOtpSchema } from "../utils/validation.js";
import { sendOtpMail } from "../utils/email.js";
import { SessionModel } from "../model/session.js";
import { guestSessionModel } from "../model/guestSesion.js";
import { OtpModel } from "../model/otpModel.js";
import rateLimit from 'express-rate-limit';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 login attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts, please try again after 15 minutes."
});

// SIGNUP
router.post("/signup", loginLimiter, async (req, res) => {
  try {
    const { data, success } = validateRegister(req.body);
    if (!success) {
      return res.status(400).json({ error: "somthing went wrong" })
    }
    const {
      fullname,
      email,
      streetAddress,
      state,
      city,
      number,
      password,
      role,
      adminId// 👈 Make sure you destructure it
    } = sanitizeInput(data);

    // Validate adminId
    if (!adminId) {
      return res.status(400).json({ message: "adminId is required" });
    }

    const adminExists = await userModel.findOne({ _id: adminId, role: "admin" });
    if (!adminExists) {
      return res.status(400).json({ message: "Invalid adminId" });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new userModel({
      adminId, // 👈 Save it here
      fullname,
      email,
      streetAddress,
      state,
      city,
      number,
      password: hashedPassword,
      role
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    res.status(400).json({ message: "Signup failed", error: error.message });
  }
});

// LOGIN
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const gid = req.signedCookies.gid;

    // Validate and sanitize login data
    const { success, data } = validateLogin(req.body);
    if (!success) {
      return res.json({ error: "Please enter the valid data" })
    }
    // console.log(parsedData);
    const { email, password } = sanitizeInput(data);

    // Find user
    const user = await userModel.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    let userCart = [];

    // If guest session exists, transfer cart
    if (gid) {
      const guest = await guestSessionModel.findOne({ sessionId: gid });
      if (guest) {
        userCart = guest.cart || [];
        await guestSessionModel.deleteOne({ sessionId: gid });
        res.clearCookie("gid", { sameSite: "none", secure: true });
      }
    }

    // Create new session for user
    const session = new SessionModel({
      sessionId: user._id.toString(),
      cart: userCart
    });
    await session.save();

    // Set signed cookie for logged-in user
    res.cookie("sid", session._id, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      signed: true,
      maxAge: 1000 * 60 * 60 * 24
    });

    res.clearCookie("gid", { sameSite: "none", secure: true });
    await guestSessionModel.deleteOne({ sessionId: gid });

    res.json({ message: "Login successful", cart: userCart });

  } catch (error) {
    res.status(400).json({ message: "Login failed", error: error.message });
  }
});

// LOGOUT
router.post("/logout", async (req, res) => {
  const session = req.signedCookies.sid
  console.log(session);
  if (session) {
    try {
      await SessionModel.findByIdAndDelete(session)
      res.clearCookie("sid", { sameSite: "none", secure: true });
      return res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.json({ message: "Failed" });
    }
  } else {
    res.json({ message: "NO session found" });
  }
});

// Protected Route
router.get("/profile", async (req, res) => {
  const userId = req.signedCookies.sid;
  if (!userId) return res.status(401).json({ message: "Not logged in" });
  const sessionId = await SessionModel.findById(userId)
  const usersession = sessionId.sessionId
  const user = await userModel.findById(usersession).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json(user);
});

router.post("/google-login", async (req, res) => {
  try {
    const { token } = req.body;
    const gid = req.signedCookies.gid;

    // 1. Verify Google JWT
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { email, name } = ticket.getPayload();

    // 2. Find or create user
    let user = await userModel.findOne({ email });
    if (!user) {
      user = new userModel({
        fullname: DOMPurify.sanitize(name),
        email: email.toLowerCase(),
        password: crypto.randomUUID(),
        role: ["user"],
        adminId: "SET_ADMIN_ID_HERE"
      });
      await user.save();
    }

    // 3. Migrate guest cart if exists
    let userCart = [];
    if (gid) {
      const guest = await guestSessionModel.findOne({ sessionId: gid });
      if (guest) {
        userCart = guest.cart.map(item => ({
          productId: item.productId,
          quantity: Math.max(1, parseInt(item.quantity))
        }));
        await guestSessionModel.deleteOne({ sessionId: gid });
        res.clearCookie("gid");
      }
    }

    // 4. Create session
    const session = new SessionModel({
      sessionId: user._id.toString(),
      cart: userCart
    });
    await session.save();

    // 5. Set signed cookie
    res.cookie("userId", user._id.toString(), {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24
    });

    res.json({ message: "Login successful", cart: userCart });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Login failed", error: error.message });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    // const Email = sanitizeInput(req.body.email);
    const { data, success } = validateSendOtp(req.body)
    const email = data?.email
    if (!email) {
      return res.status(404).json({ error: "invalid email" })
    }
    else {
      const user = await userModel.findOne({ email })
      if (user) {
        return res.json({ error: "try different email" })
      }
    }

    if (!success) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to DB (replace old OTP if exists)
    await OtpModel.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // Send OTP mail
    await sendOtpMail(email, otp);

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
});

// ✅ VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const email = sanitizeInput(req.body.email);
    const otp = sanitizeInput(req.body.otp);

    if (!email || !otp) {
      return res.status(400).json({ message: "Email & OTP are required" });
    }

    // Find OTP from DB
    const record = await OtpModel.findOne({ email });

    if (!record) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ OTP is correct → delete from DB to prevent reuse
    await OtpModel.deleteOne({ email });

    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
});

export default router;
