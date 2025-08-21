import "./db/db.js"
import expess from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import rateLimit from 'express-rate-limit';
import UserRoute from "./routes/user.js"
import productsRoute from "./routes/products.js"
import guest from "./routes/guest.js"
import cartRoute from "./routes/cartRoute.js"
import orderRoute from "./routes/orderRoute.js"
import helmet from "helmet";
// import "./routes/orderRoute.js"

const app = expess()

app.set("trust proxy", 1);

app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "https://accounts.google.com"], // allow Google login
                styleSrc: ["'self'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https://your-cdn.com"], // your image/CDN domain
                connectSrc: ["'self'", "https://api.yourbackend.com"],
                frameSrc: ["'self'", "https://accounts.google.com"], // allow Google login iframe
                objectSrc: ["'none'"], // no Flash or plugins
                upgradeInsecureRequests: [],
            },
        },
        referrerPolicy: { policy: "no-referrer" },
        crossOriginEmbedderPolicy: true,
        crossOriginResourcePolicy: { policy: "same-origin" },
        crossOriginOpenerPolicy: { policy: "same-origin" },
        frameguard: { action: "sameorigin" },
        xssFilter: true, // Older browsers XSS protection
        noSniff: true, // Prevent MIME sniffing
        hidePoweredBy: true, // Hide "X-Powered-By: Express"
        hsts: {
            maxAge: 60 * 60 * 24 * 365, // 1 year
            includeSubDomains: true,
            preload: true,
        },
    })
);
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per IP in 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again later."
});

app.use(globalLimiter);

app.use(cors({
    origin: ["https://showcrew.netlify.app", "http://localhost:5173", "http://localhost:5174"],
    credentials: true
}))
app.use(cookieParser(")(*&^%$#@!this is my secret"))
app.use(expess.json())

app.use("/user", UserRoute)
app.use("/products", productsRoute)
app.use("/guest", guest)
app.use("/cart", cartRoute)
app.use("/order" , orderRoute)



app.listen(3000, () => console.log("🚀 Server running on port 3000"));

