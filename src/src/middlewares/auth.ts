import User from "../models/users.model.js";
import CustomError from "../utils/customClass.js";
import { TryCatch } from "./errorHandler.js";

export const isAdmin = TryCatch(async (req, res, next) => {
	const { id } = req.query;
	if (!id) return next(new CustomError("Please Login First", 401));
	const user = await User.findById(id);
	if (!user) return next(new CustomError("Please Sign up First", 401));
	if (user.role !== "admin") return next(new CustomError("Only Admin Can Access This", 403));
	next();
});
