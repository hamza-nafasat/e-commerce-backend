import morgan from "morgan";
import express from "express";
import { config } from "dotenv";
import NodeCache from "node-cache";
import { Request, Response } from "express";
import { calculateMonthDifference, connectDB } from "./utils/features.js";
import usersRoutes from "./routes/users.routes.js";
import orderRoutes from "./routes/orders.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import productsRoutes from "./routes/products.routes.js";
import { customErrorMiddleWare } from "./middlewares/errorHandler.js";
import Stripe from "stripe";
import cors from "cors";
import { configureCloudinary } from "./utils/cloudinary.js";

config({
    path: "./.env",
});

// Constant Variables
const app = express();
const port = process.env.PORT || 4000;
const mongoUrl = process.env.MONGODB_URL || "";
const dbName = process.env.DB_NAME || "";
const stripeKey = process.env.STRIPE_SECRET_KEY || "";

// Node Cashing
export const nodeCash = new NodeCache();

// Stripe Integration
export const myStripe = new Stripe(stripeKey);

// Other Middlewares
app.use(
    cors({
        origin: "*",
        credentials: true,
    })
);
app.use(express.json());
app.use(morgan("dev"));

// Adding Routes
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/products", productsRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", statsRoutes);

app.get("/", (req: Request, res: Response) => {
    res.send(`App is running on <a href={${process.env.FRONTEND_ULR}}>Frontend url</a>`);
});

// Static Folder for Pics
app.use("/uploads", express.static("uploads"));

// Error Handler Middleware
app.use(customErrorMiddleWare);

// CONNECTING MONGODB ASYNCHRONOUSLY
// =================================
(async () => {
    try {
        await configureCloudinary();
        await connectDB(mongoUrl, dbName);
        //// Server id Listing if database successfully connected
        app.listen(port, () => console.log(`app listening on ${port}`));
    } catch (err: any) {
        console.error(`Failed to start server ${err.message}`);
        process.exit(1);
    }
})();
