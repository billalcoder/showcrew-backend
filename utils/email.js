import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: "billalshekhani23@gmail.com",
    pass: "xduy ohpc agke bazr", // Gmail App Password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// 📦 ORDER MAIL FUNCTION
export async function sendOrderMail(order, userEmail, adminEmail) {
  const itemsHtml = order.items
    .map(
      (item) => `
      <li style="margin-bottom:5px;">
        <b>${item.product?.name || "Product"}</b> × ${item.quantity} — ₹${item.priceAtPurchase}
      </li>`
    )
    .join("");

  const mailOptions = {
    from: "ShoeCrew <billalshekhani23@gmail.com>",
    to: [userEmail, adminEmail],
    subject: `📦 ShoeCrew - Order #${order._id} Confirmed!`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background:#f9f9f9;">
        <h2 style="color:#2c3e50;">📦 Order Confirmation</h2>
        
        <p>Hi <b>${order.user?.fullname || "Customer"}</b>,</p>
        <p>Thank you for shopping with <b>ShoeCrew</b>! Your order has been successfully placed.</p>
        
        <h3>🧾 Order Summary</h3>
        <ul style="padding-left:18px; color:#2c3e50;">${itemsHtml}</ul>
        
        <p><strong>Total:</strong> ₹${order.totalAmount}</p>
        <p><strong>Payment:</strong> ${order.paymentMethod} (${order.paymentStatus})</p>
        <p><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>

        <hr/>
        <p style="color:#27ae60; font-weight:bold;">✅ Your order has been placed successfully! We will notify you once it is shipped.</p>
        
        <p style="font-size:13px; color: gray;">If you have any questions, reply to this email.</p>
        <small style="color: gray;">© ${new Date().getFullYear()} ShoeCrew Team</small>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Order email sent to:", userEmail, adminEmail);
  } catch (error) {
    console.error("❌ Failed to send order email:", error);
  }
}

// 🔑 OTP MAIL FUNCTION
export async function sendOtpMail(userEmail, otp) {
  const mailOptions = {
    from: "ShoeCrew <billalshekhani23@gmail.com>",
    to: userEmail,
    subject: "🔑 ShoeCrew Login - Your OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background:#fdfdfd;">
        <h2 style="color:#2c3e50;">🔑 One-Time Password (OTP)</h2>
        
        <p>Hi,</p>
        <p>Your OTP for <b>ShoeCrew</b> login is:</p>
        
        <h1 style="color:#27ae60; text-align:center; letter-spacing: 3px;">${otp}</h1>
        
        <p style="color:#2c3e50;">This OTP will expire in <b>5 minutes</b>. Do not share it with anyone.</p>
        
        <hr/>
        <small style="color: gray;">© ${new Date().getFullYear()} ShoeCrew Team</small>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ OTP email sent to:", userEmail);
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error);
  }
}
