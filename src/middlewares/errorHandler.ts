import { NextFunction, Request, Response } from "express";
import CustomError from "../utils/customClass.js";
import { ApiFuncType } from "../types/function.types.js";

// CUSTOM ERROR MIDDLEWARE
// -----------------------
export const customErrorMiddleWare = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
    err.message ||= "Internal Server Error";
    err.statusCode ||= 500;
    return res.status(err.statusCode).json({
        success: false,
        message: err.message,
    });
};

// ASYNC AWAIT WRAPPER USING TRY CATCH
// ------------------------------------------
export const TryCatch = (func: ApiFuncType) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        return await func(req, res, next);
    } catch (error: any) {
        console.log(error);
        if (error instanceof CustomError) return next(error);
        next(new CustomError(error.message, 500));
    }
};

// // ASYNC AWAIT WRAPPER USING PROMISES
// // ----------------------------------
// export const TryCatch = (fn: ApiFuncType) => (req: Request, res: Response, next: NextFunction) =>
// 	Promise.resolve(fn(req, res, next)).catch((err) => {
// 		if (err instanceof CustomError) return next(err);
// 		next(new CustomError("Internal Server Error", 500));
// 	});
