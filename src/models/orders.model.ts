import { Schema, Types, model } from "mongoose";
import { OrderSchemaTypes } from "../types/schema.types.js";

const singleCartItem = {
    name: String,
    photo: {
        publicId: String,
        url: String,
    },
    price: Number,
    Quantity: Number,
    productId: {
        type: Types.ObjectId,
        ref: "Product",
    },
};

const orderSchema = new Schema<OrderSchemaTypes>(
    {
        shippingInfo: {
            address: {
                type: String,
                required: true,
            },
            city: {
                type: String,
                required: true,
            },
            state: {
                type: String,
                required: true,
            },
            country: {
                type: String,
                required: true,
            },
            pinCode: {
                type: Number,
                required: true,
            },
        },
        cartItem: [singleCartItem],
        userId: {
            type: String,
            ref: "User",
            required: true,
        },
        subTotal: {
            type: Number,
            required: true,
        },
        tax: {
            type: Number,
            required: true,
        },
        discount: {
            type: Number,
            required: true,
        },
        total: {
            type: Number,
            required: true,
        },
        shippingCharges: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["processing", "delivered", "shipped"],
            default: "processing",
        },
    },
    { timestamps: true }
);

const Order = model<OrderSchemaTypes>("Order", orderSchema);
export default Order;
