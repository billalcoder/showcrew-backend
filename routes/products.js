import express from "express";
import { productModel } from "../model/productModel.js";
import { userModel } from "../model/userModel.js";

const router = express.Router();
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Middleware: Check if user is admin
export async function isAdmin(req, res, next) {
  try {
    const userId = req.signedCookies.sid;
    console.log(userId);
    if (!userId) return res.status(401).json({ message: "Not logged in" });
    const sessionId = await SessionModel.findById(userId)
    const usersession = sessionId.sessionId
    const user = await userModel.findById(usersession);
    if (!user || !user.role.includes("admin")) {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ message: "Authorization check failed", error: err.message });
  }
}

// Middleware: Get logged-in user
async function getLoggedInUser(req, res, next) {
  try {
    const userId = req.signedCookies.userId;
    if (!userId) return res.status(401).json({ message: "Not logged in" });

    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
}

// GET all products
router.get("/all", async (req, res) => {
  try {
    const products = await productModel.find({});
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products", error: err.message });
  }
});

// Public GET single product — no login check
router.get("/:id", async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product", error: err.message });
  }
});

// ✅ CREATE Product (Admin only)
router.post("/", isAdmin, upload.array("images", 5), async (req, res) => {
  try {
    const { title, price, stock, description, category, brand, size } = req.body;

    const uploadedImageUrls = [];

    // Upload each image to S3
    for (const file of req.files) {
      const fileName = `${Date.now()}-${file.originalname}`;

      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read"
      };

      const command = new PutObjectCommand(uploadParams);
      await s3.send(command);

      const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      uploadedImageUrls.push(fileUrl);
    }

    // Save product to DB with S3 URLs
    const newProduct = new productModel({
      ownerid: req.user._id,
      title,
      price,
      stock,
      description,
      images: uploadedImageUrls,
      category,
      brand,
      size
    });

    await newProduct.save();
    res.status(201).json({
      message: "Product created successfully",
      product: newProduct
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to create product",
      error: err.message
    });
  }
});

// ✅ UPDATE Product (Admin only & Own products only)
router.put("/:id", isAdmin, async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.ownerid.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own products" });
    }

    const updatedProduct = await productModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: "Product updated successfully", product: updatedProduct });
  } catch (err) {
    res.status(500).json({ message: "Failed to update product", error: err.message });
  }
});

// ✅ DELETE Product (Admin only & Own products only)
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.ownerid.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own products" });
    }

    // ✅ Delete images from S3
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        // Example URL: https://bucket-name.s3.region.amazonaws.com/filename.jpg
        const fileName = imageUrl.split("/").pop();

        const deleteParams = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileName
        };

        const command = new DeleteObjectCommand(deleteParams);
        await s3.send(command);
      }
    }

    // ✅ Delete product from DB
    await productModel.findByIdAndDelete(req.params.id);

    res.json({ message: "Product and images deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete product", error: err.message });
  }
});

export default router;
