import express from "express";
import { SessionModel } from "../model/session.js";
import { OrderModel } from "../model/orderModel.js";
import { userModel } from "../model/userModel.js";
import { isAdmin } from "./products.js";
import { sendOrderMail } from "../utils/email.js";
const router = express.Router();

router.post("/place", async (req, res) => {
    try {
        const sid = req.signedCookies.sid;
        if (!sid) return res.status(404).json({ error: "Please login" });

        // destructure body
        const { totalAmount, paymentMethod, paymentStatus } = req.body;

        // get session
        const usersession = await SessionModel.findOne({ sessionId: sid }).populate("cart.product");
        if (!usersession) return res.status(404).json({ error: "User session not found" });

        // prepare items array
        const items = usersession.cart.map((item) => ({
            product: item.product._id,
            quantity: item.quantity,
            priceAtPurchase: totalAmount, // snapshot current price
        }));

        console.log(items);

        // get user (real user id, not sid string)
        const user = await userModel.findOne({ _id: usersession.sessionId }).select("-password");

        // get user from session

        // prepare shippingAddress from user
        const shippingAddress = {
            fullName: user.fullname,
            email: user.email,
            streetAddress: user.streetAddress,
            state: user.state,
            city: user.city,
            number: user.number,
        };
        // create order
        const order = await OrderModel.create({
            user: user?._id,
            items,
            totalAmount,
            paymentMethod,
            paymentStatus,
            shippingAddress,
            orderStatus: "PLACED",
        });

        await sendOrderMail(
            order,
            user.email,            // customer
            "admin@shoecrew.com"       // admin
        );
        usersession.cart = []
          await usersession.save(); 
        res.status(200).json({ message: "Order placed successfully", order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});
// Get logged-in user's orders
router.get("/my-order", async (req, res) => {
    try {
        const sid = req.signedCookies.sid;
        if (!sid) return res.status(401).json({ error: "Please login" });

        const usersession = await SessionModel.findOne({ sessionId: sid });
        if (!usersession) return res.status(404).json({ error: "Session not found" });

        const orders = await OrderModel.find({ user: usersession.sessionId })
            .populate("items.product", "name price")
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Get all orders (Admin only)
router.get("/all", isAdmin, async (req, res) => {
  try {
    const orders = await OrderModel.find({ paymentStatus: "PENDING" })
      .populate("user", "fullname email")
      .populate("items.product", "title price images")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /order/deliver/:id
router.put("/deliver/:id", isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // update order
        const updatedOrder = await OrderModel.findByIdAndUpdate(
            id,
            { paymentStatus: "PAID", orderStatus: "DELIVERED" },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.json({ message: "Order delivered successfully", order: updatedOrder });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});




export default router;
