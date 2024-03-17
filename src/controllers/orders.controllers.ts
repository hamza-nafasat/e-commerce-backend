import { Request } from "express";
import { isValidObjectId } from "mongoose";
import { nodeCash } from "../app.js";
import { TryCatch } from "../middlewares/errorHandler.js";
import Order from "../models/orders.model.js";
import { newOrderReqTypes } from "../types/apis.types.js";
import CustomError from "../utils/customClass.js";
import { invalidateNodeCash, reduceStock, responseFunc } from "../utils/features.js";

// =========================================
// http://localhost:8000/api/v1/orders/new =  CREATE NEW ORDER
// =========================================

export const newOrderCreate = TryCatch(async (req: Request<{}, {}, newOrderReqTypes>, res, next) => {
	const {
		orderItem,
		shippingInfo,
		shippingCharges,
		discount = 0,
		subTotal,
		tax = 0,
		total,
		userId,
	} = req.body;
	//// ensuring that all required fields are given
	if (!orderItem || !shippingCharges || !shippingInfo || !subTotal || !total || !userId) {
		return next(new CustomError("Please Provide All Fields", 400));
	}
	//// creating a order
	const order = await Order.create({
		orderItem,
		shippingInfo,
		shippingCharges,
		discount,
		subTotal,
		tax,
		total,
		userId,
	});
	//// reducing stock from products bcz some items ordered
	await reduceStock(orderItem);
	//// invalidate cash items bcz of order
	invalidateNodeCash({
		isProducts: true,
		isOrders: true,
		isAdmins: true,
		productId: order.orderItem.map((item) => String(item.productId)),
	});
	responseFunc(res, "Your Order Placed Successfully", 201);
});

// =========================================
// http://localhost:8000/api/v1/orders/my =  GET MY ORDERS
// =========================================

export const getMyOrders = TryCatch(async (req, res, next) => {
	const { id } = req.query;
	let nodeCashKey = `my-orders-${id}`;
	let myOrders = [];
	if (nodeCash.has(nodeCashKey)) {
		myOrders = JSON.parse(nodeCash.get(nodeCashKey) as string);
	} else {
		myOrders = await Order.find({ user: id });
		if (!myOrders) return next(new CustomError("Invalid key or Orders Not Found", 404));
		nodeCash.set(nodeCashKey, JSON.stringify(myOrders));
	}
	responseFunc(res, "", 200, { length: myOrders.length, myOrders });
});

// =========================================
// http://localhost:8000/api/v1/orders/all =  GET All ORDERS
// =========================================

export const getAllOrders = TryCatch(async (req, res, next) => {
	let nodeCashKey = "all-orders";
	let allOrders = [];
	if (nodeCash.has(nodeCashKey)) {
		allOrders = JSON.parse(nodeCash.get(nodeCashKey) as string);
	} else {
		allOrders = await Order.find().populate("userId", "name");
		if (!allOrders) return next(new CustomError("Orders Not Found", 404));
		nodeCash.set(nodeCashKey, JSON.stringify(allOrders));
	}
	responseFunc(res, "", 200, { length: allOrders.length, allOrders });
});

// ================================================
// http://localhost:8000/api/v1/orders/single/:orderId =  GET Single ORDER
// ================================================

export const getSingleOrder = TryCatch(async (req, res, next) => {
	const { orderId } = req.params;
	if (!isValidObjectId(orderId)) {
		return next(new CustomError("Invalid Order Id", 400));
	}
	let nodeCashKey = `order-${orderId}`;
	let order;
	if (nodeCash.has(nodeCashKey)) {
		order = JSON.parse(nodeCash.get(nodeCashKey) as string);
	} else {
		order = await Order.findById(orderId).populate("userId", "name");
		if (!order) return next(new CustomError("Order Not Found", 404));
		nodeCash.set(nodeCashKey, JSON.stringify(order));
	}
	responseFunc(res, "", 200, order);
});

export const processSingleOrder = TryCatch(async (req, res, next) => {
	const { orderId } = req.params;
	if (!isValidObjectId(orderId)) {
		return next(new CustomError("Invalid Order Id", 400));
	}

	let order = await Order.findById(orderId).select("status userId");
	if (!order) return next(new CustomError("Order Not Found", 404));
	//// if orders found the process them according their firs status
	if (order.status === "processing") {
		order.status = "shipped";
	} else if (order.status === "shipped") {
		order.status = "delivered";
	} else {
		return next(new CustomError("Order Already Delivered", 400));
	}

	await order.save();
	//// invalidate nodeCash after updating a order
	invalidateNodeCash({
		isProducts: false,
		isOrders: true,
		isAdmins: true,
		userId: order.userId,
		orderId: order._id.toString(),
	});
	responseFunc(res, "", 200, order);
});

export const deleteSingleOrder = TryCatch(async (req, res, next) => {
	const { orderId } = req.params;
	if (!isValidObjectId(orderId)) {
		return next(new CustomError("Invalid Order Id", 400));
	}
	let order = await Order.findByIdAndDelete(orderId);
	if (!order) return next(new CustomError("Order Already Deleted", 404));
	//// invalidate nodeCash after deleting a order
	invalidateNodeCash({
		isProducts: false,
		isOrders: true,
		isAdmins: true,
		userId: order.userId,
		orderId: order._id.toString(),
	});
	responseFunc(res, "Order Deleted Successfully", 200);
});
