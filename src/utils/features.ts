import { Response } from "express";
import fs from "fs";
import mongoose from "mongoose";
import { nodeCash } from "../app.js";
import Product from "../models/products.model.js";
import { InvalidateNodeCash, ResponseType } from "../types/function.types.js";
import { OrderSchemaTypes, ProductSchemaTypes } from "../types/schema.types.js";

// =====================
// delete photo function
// =====================
export const deletePhoto = (path: string) => {
    fs.unlink(path, (err) => {
        if (err) console.log("Error deleting image", err.message);
        console.log("Image deleted Successfully");
    });
};
// ================================
// connectDB for connecting mongodb
// ================================
export const connectDB = async (uri: string, dbName: string) => {
    try {
        const response = await mongoose.connect(uri, { dbName });
        const { name, host, port } = response.connection;
        console.log(`DB ${name} is connected on mongodb://${host}:${port}`);
    } catch (error: any) {
        console.error(`MongoDB connection failed ${error.message}`);
        process.exit(1);
    }
};
// ===========================================
// send custom response function for every api
// ===========================================
export const responseFunc = <T>(res: Response, message?: string, statusCode?: number, data?: T) => {
    const response: ResponseType<T> = { success: true };
    if (message) response.message = message;
    if (data) response.data = data;
    res.status(statusCode || 200).json(response);
};
// ======================================================================
// reduceStock function which reduce stock when anybody order for product
// ======================================================================
export const reduceStock = async (orderItem: OrderSchemaTypes["cartItem"]) => {
    for (let i = 0; i < orderItem.length; i++) {
        const product = await Product.findById(orderItem[i].productId);
        if (!product) throw new Error("Product Not Found");
        product.stock -= orderItem[i].quantity;
        await product.save();
    }
};
// ========================================================
// invalidateNodeCash function which del data from nodeCash
// ========================================================

export const invalidateNodeCash = ({
    isProducts = false,
    isOrders = false,
    isAdmins = false,
    userId = "",
    orderId = "",
    productId = "",
}: InvalidateNodeCash) => {
    const cacheKeys = [];
    if (isProducts) {
        cacheKeys.push("latest-products", "categories", "admin-products", "high-price");
        if (productId) {
            if (typeof productId === "string") {
                cacheKeys.push(`product-${productId}`);
            } else if (Array.isArray(productId)) {
                cacheKeys.push(...productId.map((id) => `product-${id}`));
            }
        }
    }
    if (isOrders) {
        cacheKeys.push("all-orders");
        if (userId) {
            cacheKeys.push(`my-orders-${userId}`);
        }
        if (orderId) cacheKeys.push(`order-${orderId}`);
    }
    if (isAdmins) {
        cacheKeys.push("admin-stats", "admin-bar-charts", "admin-line-charts", "admin-pie-charts");
    }
    if (cacheKeys.length > 0) {
        nodeCash.del(cacheKeys);
    }
};
// ===========================================================
// Calculate percentage according last month and current month
// ===========================================================

export const calculatePercentage = (current: number, last: number) => {
    let percentage;
    if (last === 0) {
        percentage = current * 100;
    } else {
        percentage = (current / last) * 100;
    }
    return Number(percentage.toFixed(2));
};
// ====================================================
// adding data count in arr according every month count
// ====================================================
export const updateArraysByMonthDifference = ({
    data,
    countData,
    totalData,
    totalDiscount,
}: {
    data: any[];
    countData?: number[];
    totalData?: number[];
    totalDiscount?: number[];
}) => {
    const today = new Date();
    data.forEach((item) => {
        const creationDate = item.createdAt;
        if (!creationDate) return;
        const monthDiff = calculateMonthDifference(today, creationDate);
        if (
            (totalData && totalData?.length == 6) ||
            (countData && countData?.length == 6) ||
            (totalDiscount && totalDiscount?.length == 6)
        ) {
            if (monthDiff < 6) {
                if (countData) countData[5 - monthDiff] += 1;
                if (totalData) totalData[5 - monthDiff] += item.total || 0;
                if (totalDiscount) totalDiscount[5 - monthDiff] += item.discount || 0;
            }
        } else if (
            (totalData && totalData?.length == 12) ||
            (countData && countData?.length == 12) ||
            (totalDiscount && totalDiscount?.length == 12)
        ) {
            if (monthDiff < 12) {
                if (countData) countData[11 - monthDiff] += 1;
                if (totalData) totalData[11 - monthDiff] += item.total || 0;
                if (totalDiscount) totalDiscount[11 - monthDiff] += item.discount || 0;
            }
        }
    });
};

// =================================================================
// Function to calculate month difference using Date object methods
// =================================================================

export function calculateMonthDifference(today: Date, creationDate: Date) {
    let monthDiff = today.getMonth() - creationDate.getMonth();
    let yearDiff = today.getFullYear() - creationDate.getFullYear();
    if (monthDiff < 0) {
        monthDiff += 12;
        yearDiff--;
    }
    return monthDiff + yearDiff * 12;
}
// ==================================================================================
// Function to getting Product Categories and find the percentage for every category
// ==================================================================================

export const categoriesPercentageFunc = async ({
    allProductsCategories,
    productsCount,
}: {
    allProductsCategories: string[];
    productsCount: number;
}) => {
    let productsCategoryPercentage: Record<string, number> = {};
    const allCategoriesCountPromiseArr = allProductsCategories.map((category) => {
        return Product.countDocuments({ category });
    });
    const allProductsCategoryCounts = await Promise.all(allCategoriesCountPromiseArr);
    allProductsCategories.forEach((category, i) => {
        productsCategoryPercentage[category] = Math.round(
            (allProductsCategoryCounts[i] / productsCount) * 100
        );
    });
    return productsCategoryPercentage;
};
