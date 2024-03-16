import { OrderSchemaTypes } from "./schema.types.js";

export interface NewUserReqTypes {
	_id: string;
	name: string;
	email: string;
	dob: Date;
	gender: string;
	photo: string;
}

export interface CreateNewProductTypes {
	name: string;
	price: number;
	stock: number;
	category: string;
}

export interface AllProductsQueryTypes {
	category?: string;
	search?: string;
	sort?: string;
	price?: string;
	page?: string;
}

export interface searchBaseQueryTypes {
	name?: {
		$regex: RegExp;
	};
	price?: {
		$lte: number;
	};
	category?: string;
}

export interface CouponCodeTypes {
	couponCode: string;
	amount: number;
}

export interface newOrderReqTypes extends OrderSchemaTypes {}
