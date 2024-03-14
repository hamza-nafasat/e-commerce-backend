import { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongoose";

export type ApiFuncType = (
	req: Request,
	res: Response,
	next: NextFunction
) => Promise<void | Response<any, Record<string, any>>>;

export interface ResponseType<T = any> {
	success: boolean;
	message?: string;
	data?: T;
}

export interface InvalidateNodeCash {
	isProducts?: boolean;
	isOrders?: boolean;
	isAdmins?: boolean;
	userId?: string;
	orderId?: string;
	productId?: string | string[];
}
