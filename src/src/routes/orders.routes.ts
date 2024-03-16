import express from "express";
import {
	deleteSingleOrder,
	getAllOrders,
	getMyOrders,
	getSingleOrder,
	newOrderCreate,
	processSingleOrder,
} from "../controllers/orders.controllers.js";
import { isAdmin } from "../middlewares/auth.js";

const app = express();

// CREATE A NEW ORDER
app.post("/new", newOrderCreate);

// GET MY ORDERS
app.get("/my", getMyOrders);

// GET ALL ORDERS
app.get("/all", isAdmin, getAllOrders);

// GET SINGLE ORDER
app.route("/single/:orderId")
	.get(getSingleOrder)
	.put(isAdmin, processSingleOrder)
	.delete(isAdmin, deleteSingleOrder);

export default app;
