import mongoose from "mongoose";
import { ProductSchemaTypes } from "../types/schema.types.js";

const productSchema = new mongoose.Schema<ProductSchemaTypes>(
	{
		name: {
			type: String,
			// unique: true,
			required: [true, "Please entered product name"],
		},
		price: {
			type: Number,
			required: [true, "Please entered product price"],
		},
		stock: {
			type: Number,
			required: [true, "Please entered product stock"],
		},
		photo: {
			type: String,
			required: [true, "Please entered product photo"],
		},
		category: {
			type: String,
			trim: true,
			required: [true, "Please entered product category"],
		},
	},
	{ timestamps: true }
);

const Product = mongoose.model<ProductSchemaTypes>("Product", productSchema);

export default Product;
