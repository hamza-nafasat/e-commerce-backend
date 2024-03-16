import { Request } from "express";
import { TryCatch } from "../middlewares/errorHandler.js";
import Coupon from "../models/coupon.model.js";
import CustomError from "../utils/customClass.js";
import { responseFunc } from "../utils/features.js";
import { CouponCodeTypes } from "../types/apis.types.js";
import { isValidObjectId } from "mongoose";
import { myStripe } from "../app.js";

// ================================================
// http://localhost:8000/api/v1/payments/coupon/new
// ================================================
// GET SINGLE PRODUCT

export const createNewCoupon = TryCatch(async (req: Request<{}, {}, CouponCodeTypes>, res, next) => {
	const { couponCode, amount } = req.body;
	if (!couponCode || !amount) {
		return next(new CustomError("Please Enter Coupon Code And Amount First", 400));
	}
	const newCoupon = await Coupon.create({ couponCode, amount });
	if (!newCoupon) return next(new CustomError("Error While Creating Coupon Code", 500));
	responseFunc(res, `Coupon ${newCoupon.couponCode} Generated for ${newCoupon.amount}-Rs`, 201);
});
// ================================================
// http://localhost:8000/api/v1/payments/coupon/all
// ================================================
// GET ALL COUPON

export const getAllCoupons = TryCatch(async (req, res, next) => {
	const coupons = await Coupon.find();
	if (!coupons) return next(new CustomError("Not Any Coupon Found", 404));
	responseFunc(res, ``, 200, coupons);
});

// =========================================================
// http://localhost:8000/api/v1/payments/coupons/:couponCode
// =========================================================
// GET SINGLE COUPON

export const getSingleCoupon = TryCatch(async (req, res, next) => {
	const { couponCode } = req.params;
	if (!couponCode) return next(new CustomError("Invalid Coupon Code", 400));
	const discount = await Coupon.findOne({ couponCode });
	if (!discount) return next(new CustomError("Invalid Coupon Code", 400));
	responseFunc(res, ``, 200, discount.amount);
});

// DELETE  SINGLE COUPON
export const deleteSingleCoupon = TryCatch(async (req, res, next) => {
	const { couponCode } = req.params;
	let deletedCoupon;
	if (!couponCode) return next(new CustomError("Invalid Coupon Code", 400));
	if (isValidObjectId(couponCode)) {
		deletedCoupon = await Coupon.findByIdAndDelete(couponCode);
		if (!deletedCoupon) return next(new CustomError("Invalid Coupon Code or Id", 400));
	} else {
		deletedCoupon = await Coupon.findOneAndDelete({ couponCode });
		if (!deletedCoupon) return next(new CustomError("Invalid Coupon Code or Id", 400));
	}
	responseFunc(res, `Coupon Deleted Successfully`, 201);
});

// ============================================
// http://localhost:8000/api/v1/payments/create
// ============================================
// CREATE NEW PAYMENT

export const createPaymentIntent = TryCatch(async (req, res, next) => {
	const { amount } = req.body;
	if (!amount) return next(new CustomError("Please Enter Amount", 400));
	const newPaymentIntent = await myStripe.paymentIntents.create({
		amount: Number(amount) * 100,
		currency: "pkr",
	});
	console.log(newPaymentIntent);
	responseFunc(res, ``, 200, { clientSecret: newPaymentIntent.client_secret });
});
