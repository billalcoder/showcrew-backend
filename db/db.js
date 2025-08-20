import mongoose from "mongoose";

try {
    await mongoose.connect(process.env.MOOGOURL)
    console.log("Database connect successfully");
} catch (error) {
    console.log("Unable to connect with database");
}