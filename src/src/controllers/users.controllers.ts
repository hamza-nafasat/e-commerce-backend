import { NextFunction, Response, Request } from "express";
import User from "../models/users.model.js";
import CustomError from "../utils/customClass.js";
import { TryCatch } from "../middlewares/errorHandler.js";
import { invalidateNodeCash, responseFunc } from "../utils/features.js";
import { NewUserReqTypes } from "../types/apis.types.js";

// ======================================
// http://localhost:8000/api/v1/users/new = CREATE OR LOGIN USER
// ======================================

export const createUser = TryCatch(
	async (req: Request<{}, {}, NewUserReqTypes>, res: Response, next: NextFunction) => {
		const { name, email, dob, photo, gender, _id } = req.body;
		// //if user already exist then just logged in the user
		let user = await User.findById(_id);
		if (user) return responseFunc(res, `Welcome ${user.name}`, 200);
		//// if user not exist then first create the user and logged in
		if (!dob || !gender) {
			return next(new CustomError("In Firs Login DOB and Gender are Required", 400));
		}
		if (!name || !email || !dob || !photo || !gender || !_id) {
			return next(new CustomError("As a New User Enter All Fields", 400));
		}
		user = await User.create({ name, email, dob, photo, gender, _id });
		invalidateNodeCash({ isAdmins: true });
		responseFunc(res, "Account Registered Successfully", 201);
	}
);

// ======================================
// http://localhost:8000/api/v1/users/all = GET ALL USERS
// ======================================

export const getAllUsers = TryCatch(async (req, res, next) => {
	const users = await User.find();
	return responseFunc(res, "", 200, users);
});

// ======================================
// http://localhost:8000/api/v1/users/one/_id = GET SINGLE USER
// ======================================

export const getSingleUser = TryCatch(async (req, res, next) => {
	const { _id } = req.params;
	const user = await User.findById(_id);
	if (!user) return next(new CustomError("User Not Found", 404));
	return responseFunc(res, "", 200, user);
});
// =============== SAME ================= = DELETE USER
export const deleteUser = TryCatch(async (req, res, next) => {
	const { _id } = req.params;
	const user = await User.deleteOne({ _id });
	if (user.deletedCount === 0) return next(new CustomError("User Not Found", 404));
	invalidateNodeCash({ isAdmins: true });
	return responseFunc(res, "User Deleted Successfully", 200);
});
