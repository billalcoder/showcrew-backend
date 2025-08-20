import { model, Schema } from "mongoose";

const SessionSchema = new Schema({
  sessionId: { type: String, required: true },
  cart: [
    {
      product: { type: Schema.Types.ObjectId, ref: "productModel" }, // ✅ important
      quantity: { type: Number, default: 1 },
    },
  ],
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 20 } // optional: auto-delete after 1 day
});

export const SessionModel = model("SessionModel", SessionSchema);