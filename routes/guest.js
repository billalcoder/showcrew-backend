import express from "express";
import crypto from "crypto";
import { guestSessionModel } from "../model/guestSesion.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    let sessionId = req.signedCookies.gid; // use the correct cookie name

    if (!sessionId) {
      // Create a new guest session
      sessionId = crypto.randomUUID();

      // Save in cookie
      res.cookie("gid", sessionId, {
        httpOnly: true,
        signed: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 day
      });

      // Save in database
      const newGuest = new guestSessionModel({
        sessionId,
        cart: []
      });
      await newGuest.save();

      // ✅ populate cart.product (even though empty right now)
      await newGuest.populate("cart.product");

      return res.status(200).json({
        message: "Guest session created successfully",
        sessionId,
        cart: newGuest.cart
      });
    }

    // If session exists, check in DB and populate cart
    let guest = await guestSessionModel
      .findOne({ sessionId })
      .populate("cart.product"); // ✅ populate here

    if (guest) {
      return res.status(200).json({
        message: "Guest session exists",
        sessionId,
        cart: guest.cart
      });
    } else {
      // If cookie exists but DB record missing, recreate
      const newGuest = new guestSessionModel({ sessionId, cart: [] });
      await newGuest.save();
      await newGuest.populate("cart.product");

      return res.status(200).json({
        message: "Guest session recreated",
        sessionId,
        cart: newGuest.cart
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong",
      error: error.message
    });
  }
});

router.get("/get", (req, res) => {
  const sid = req.signedCookies.sid
  const gid = req.signedCookies.gid

  if (sid) {
    return res.status(200).json({sid})
  } else if (gid) {
    return res.status(200).json({gid})
  } else {
    return res.status(400).json({ error: "no user found" })
  }
})

export default router;
