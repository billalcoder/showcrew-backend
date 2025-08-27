// utils/validation.js
import { z } from "zod";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

// Setup DOMPurify for Node.js
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

// ----------- Zod Schemas -----------

// Registration Schema
export const registerSchema = z.object({
  fullname: z.string().min(2, "Full name is too short").max(100),
  email: z.string().email("Invalid email format"),
  streetAddress: z.string().min(3).max(255),
  state: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  number: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits"),
  password: z.string().min(6).max(100),
  role: z.enum(["admin", "user"]).optional(),
  adminId: z.string().min(0)
});

// Login Schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100)
});

export const productSchema = z.object({
  title: z.string().min(2).max(100),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  description: z.string().min(5),
  images: z.array(z.string().url()).optional().default([]),
  category: z.string().min(2),
  brand: z.string().min(2),
  size: z.array(z.string()).optional().default([])
});

export const sendOtpSchema = z.object({
  email: z.email("Invalid email format"),
}); 

export const verifyOtpSchema = z.object({
  email: z.email("Invalid email format"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

// ----------- Sanitization -----------

// Remove XSS risk from strings
export const validateProduct = (data) => {
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(err => err.message).join(", "));
  }
  return parsed.data;
};

export const sanitizeInput = (value) => {
  if (typeof value !== "string") return value;
  return DOMPurify.sanitize(value);
};

// Validate and sanitize for register
export const validateRegister = (data) => {
  const cleanData = {};
  for (let key in data) {
    cleanData[key] = sanitizeInput(data[key]);
  }
  return registerSchema.safeParse(cleanData);
};

// Validate and sanitize for login
export const validateLogin = (data) => {
  const cleanData = {};
  for (let key in data) {
    cleanData[key] = sanitizeInput(data[key]);
  }
  return loginSchema.safeParse(cleanData);
};

export const sanitizeObject = (obj) => {
  const clean = {};
  for (let key in obj) {
    clean[key] = sanitizeInput(obj[key]);
  }
  return clean;
};

export const validateSendOtp = (data) => {
  const cleanData = sanitizeObject(data);
  return sendOtpSchema.safeParse(cleanData);
};

export const validateVerifyOtp = (data) => {
  const cleanData = sanitizeObject(data);
  return verifyOtpSchema.safeParse(cleanData);
};
