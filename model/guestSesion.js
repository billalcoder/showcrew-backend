import { model, Schema } from "mongoose";

const guestSessionSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
   cart: [
    {
      product: { type: Schema.Types.ObjectId, ref: "productModel" }, // ✅ important
      quantity: { type: Number, default: 1 },
    },
  ],
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 } // optional: auto-delete after 1 day
});

export const guestSessionModel = model("guestSessionModel", guestSessionSchema);