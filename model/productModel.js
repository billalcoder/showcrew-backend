import { model, Schema } from "mongoose";

const productSchema = new Schema({
    ownerid: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    size: { type: [String], default: [] },
    description: { type: String, required: true },
    images: { type: Array },
    category: { type: String, required: true },
    brand: { type: String, required: true }
})

export const productModel = model("productModel", productSchema)