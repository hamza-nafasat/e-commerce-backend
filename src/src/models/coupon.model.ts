import { Schema, model } from "mongoose";

const couponSchema = new Schema(
	{
		couponCode: {
			type: String,
			unique: true,
			trim: true,
			minLength: 8,
			required: [true, "Please Enter Coupon Code"],
		},
		amount: {
			type: Number,
			required: [true, "Please Enter Amount"],
		},
	},
	{ timestamps: true }
);

const Coupon = model("Coupon", couponSchema);
export default Coupon;
