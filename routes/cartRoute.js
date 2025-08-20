import express from "express";
import { SessionModel } from "../model/session.js";
import { guestSessionModel } from "../model/guestSesion.js";
import { productModel } from "../model/productModel.js";

const router = express.Router();

/**
 * Add to Cart
 */
router.post("/add", async (req, res) => {
  try {
    const { product, quantity = 1 } = req.body;
    const id = product._id; // product id from body
    const sid = req.signedCookies.sid;
    const gid = req.signedCookies.gid;

    if (!sid && !gid) {
      return res.status(400).json({ message: "No session found" });
    }

    // ✅ check product exists
    const productget = await productModel.findById(id);
    if (!productget) return res.status(404).json({ message: "Product not found" });

    let session;

    // 🟢 USER SESSION
    if (sid) {
      session = await SessionModel.findOne({ sessionId: sid });
      if (!session) return res.status(404).json({ message: "User session not found" });

      const existingItem = session.cart.find(
        (item) => item.product?.toString() === id
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        session.cart.push({ product: id, quantity });
      }

      await session.save();
      await session.populate("cart.product");

      return res.json({ message: "Added to user cart", cart: session.cart });
    }

    // 🟡 GUEST SESSION
    if (gid) {
      session = await guestSessionModel.findOne({ sessionId: gid });
      if (!session) return res.status(404).json({ message: "Guest session not found" });

      const existingItem = session.cart.find(
        (item) => item.product?.toString() === id
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        session.cart.push({ product: id, quantity }); // ✅ fixed key
      }

      await session.save();
      await session.populate("cart.product"); // ✅ populate guest cart products

      return res.json({ message: "Added to guest cart", cart: session.cart });
    }
  } catch (err) {
    res.status(500).json({ message: "Failed to add to cart", error: err.message });
  }
});


/**
 * Get Cart
 */
router.get("/", async (req, res) => {
  try {
    const sid = req.signedCookies.sid;
    const gid = req.signedCookies.gid;

    if (sid) {
      const session = await SessionModel.findOne({ sessionId: sid })
      if (!session) return res.status(404).json({ message: "User session not found" });
      await session.save();
      await session.populate("cart.product"); // populate products
      return res.json({ cart: session.cart });
    }

    if (gid) {
      const session = await guestSessionModel.findOne({ sessionId: gid });
      if (!session) return res.status(404).json({ message: "Guest session not found" });
      await session.save();
      await session.populate("cart.product"); // populate products
      return res.json({ cart: session.cart });
    }

    return res.status(400).json({ message: "No session found" });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch cart", error: err.message });
  }
});

/**
 * Remove from Cart
 */
router.delete("/remove/:productId", async (req, res) => {
  try {
    const sid = req.signedCookies.sid;
    const gid = req.signedCookies.gid;
    const { productId } = req.params;

    if (sid) {
      const session = await SessionModel.findOne({ sessionId: sid });
      if (!session) return res.status(404).json({ message: "User session not found" });

      session.cart = session.cart.filter(
        (item) => item._id.toString() !== productId
      );
      await session.save();
      return res.json({ message: "Removed from user cart", cart: session.cart });
    }

    if (gid) {
      const session = await guestSessionModel.findOne({ sessionId: gid });
      if (!session) return res.status(404).json({ message: "Guest session not found" });

      session.cart = session.cart.filter((item) => item.id !== productId);
      await session.save();
      return res.json({ message: "Removed from guest cart", cart: session.cart });
    }

    return res.status(400).json({ message: "No session found" });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove from cart", error: err.message });
  }
});

export default router;
