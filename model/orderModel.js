import { Schema, model } from "mongoose";

const orderSchema = new Schema(
  {
    // If logged-in user
    user: { type: Schema.Types.ObjectId, ref: "userModel", required: false },

    // Products purchased
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "productModel", required: true },
        quantity: { type: Number, required: true, min: 1 },
        priceAtPurchase: { type: Number, required: true }, // snapshot price
      },
    ],

    // Payment Info
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["COD", "CARD", "UPI", "PAYPAL"], default: "COD" },
    paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED"], default: "PENDING" },

    // Shipping Info
    shippingAddress: {
      fullName: String,
      number: String,
      email: String,
      streetAddress: String,
      city: String,
      state: String,
    },

    orderStatus: {
      type: String,
      enum: ["PLACED", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PLACED",
    },
  },
  { timestamps: true }
);

export const OrderModel = model("OrderModel", orderSchema);
