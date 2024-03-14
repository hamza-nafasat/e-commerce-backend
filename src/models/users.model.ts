import mongoose from "mongoose";
import validator from "validator";
import { UserSchemaTypes } from "../types/schema.types.js";

const userSchema = new mongoose.Schema<UserSchemaTypes>(
	{
		_id: {
			type: String,
			required: [true, "Please add your id"],
		},
		name: {
			type: String,
			required: [true, "Please enter your name"],
		},
		email: {
			type: String,
			unique: true,
			required: [true, "Please enter your email"],
			validate: validator.default.isEmail,
		},
		dob: {
			type: Date,
			required: [true, "Please enter your dob"],
		},
		photo: {
			type: String,
			required: [true, "Please enter your photo"],
		},
		gender: {
			type: String,
			enum: ["male", "female"],
			required: [true, "Please enter your gender"],
		},
		role: {
			type: String,
			enum: ["user", "admin"],
			default: "user",
		},
	},
	{ timestamps: true }
);

// adding user age virtually
// =========================

userSchema.virtual("age").get(function () {
	const today = new Date();
	const dob = this.dob;
	let age = today.getFullYear() - dob.getFullYear();
	// age according month
	if (today.getMonth() < dob.getMonth()) age--;
	// age according date
	if (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate()) age--;
	return age;
});

const User = mongoose.model<UserSchemaTypes>("User", userSchema);
export default User;
