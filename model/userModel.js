import { model, Schema } from "mongoose";

const userSchema = new Schema({
    adminId: { type: Schema.Types.ObjectId, ref: "userModel"}, // 🔹 fixed name (camelCase)
    fullname: { type: String, required: true },
    email: {
        type: String,
        required: true, 
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    streetAddress: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    number: { type: Number, required: true },
    password: { type: String, required: true },
    role: {
        type: [String],
        enum: ["admin", "user"],
        default: ['user']
    }
});

export const userModel = model("userModel", userSchema);
