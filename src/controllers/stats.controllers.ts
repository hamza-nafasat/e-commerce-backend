import { nodeCash } from "../app.js";
import { TryCatch } from "../middlewares/errorHandler.js";
import Order from "../models/orders.model.js";
import Product from "../models/products.model.js";
import User from "../models/users.model.js";
import CustomError from "../utils/customClass.js";
import {
    updateArraysByMonthDifference,
    calculatePercentage,
    categoriesPercentageFunc,
    responseFunc,
} from "../utils/features.js";

// ===================================================
// http://localhost:8000/api/v1/admin/dashboard/stats
// ===================================================
// GET ADMIN DASHBOARD STATICS

export const dashboardStats = TryCatch(async (req, res, next) => {
    const today = new Date();
    const lastSixMonthDate = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    const thisMonth = {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: today,
    };
    const lastMonth = {
        start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        end: new Date(today.getFullYear(), today.getMonth(), 0),
    };
    let nodeCashKey = "admin-stats";
    let adminStats = {};
    if (nodeCash.has(nodeCashKey)) {
        adminStats = JSON.parse(nodeCash.get(nodeCashKey) as string);
    } else {
        //// all data base queries in promise.all for optimization
        //// -----------------------------------------------------
        const [
            thisMonthProducts,
            lastMonthProducts,
            thisMonthOrders,
            lastMonthOrders,
            thisMonthUsers,
            lastMonthUsers,
            productsCount,
            usersCount,
            ordersCount,
            ordersForRevenue,
            lastSixMonthOrders,
            allProductsCategories,
            UserFemaleCount,
            latestOrders,
        ] = await Promise.all([
            Product.find({
                createdAt: {
                    $gte: thisMonth.start,
                    $lte: thisMonth.end,
                },
            }).select("_id"),
            Product.find({
                createdAt: {
                    $gte: lastMonth.start,
                    $lte: lastMonth.end,
                },
            }).select("_id"),
            Order.find({
                createdAt: {
                    $gte: thisMonth.start,
                    $lte: thisMonth.end,
                },
            }).select("total"),
            Order.find({
                createdAt: {
                    $gte: lastMonth.start,
                    $lte: lastMonth.end,
                },
            }).select("total"),
            User.find({
                createdAt: {
                    $gte: thisMonth.start,
                    $lte: thisMonth.end,
                },
            }).select("_id"),
            User.find({
                createdAt: {
                    $gte: lastMonth.start,
                    $lte: lastMonth.end,
                },
            }).select("_id"),
            Product.countDocuments(),
            User.countDocuments(),
            Order.countDocuments(),
            Order.find().select("total"),
            Order.find({
                createdAt: {
                    $gte: lastSixMonthDate,
                    $lte: today,
                },
            }).select("total createdAt"),
            Product.distinct("category"),
            User.countDocuments({ gender: "female" }),
            Order.find().sort({ createdAt: -1 }).limit(5).select(["discount", "status", "total", "cartItem"]),
        ]);
        //// calculate the percentage between this and last month
        //// ----------------------------------------------------
        const thisToLastMonthPercentage = {
            products: calculatePercentage(thisMonthProducts?.length, lastMonthProducts?.length).toFixed(2),
            users: calculatePercentage(thisMonthUsers?.length, lastMonthUsers?.length).toFixed(2),
            orders: calculatePercentage(thisMonthOrders?.length, lastMonthOrders?.length).toFixed(2),
            revenue: calculatePercentage(
                thisMonthOrders.reduce((acc, order) => acc + (order.total || 0), 0),
                lastMonthOrders.reduce((acc, order) => acc + (order.total || 0), 0)
            ).toFixed(2),
        };
        //// add total counts for these all categories
        //// -----------------------------------------
        const totalCounts = {
            products: productsCount,
            users: usersCount,
            orders: ordersCount,
            revenue: ordersForRevenue.reduce((acc, order) => acc + (order.total || 0), 0),
        };
        //// making the revenue and transaction chart data for last six months
        //// -----------------------------------------------------------------
        let transactionCountData = new Array(6).fill(0);
        let totalRevenueData = new Array(6).fill(0);
        updateArraysByMonthDifference({
            data: lastSixMonthOrders,
            countData: transactionCountData,
            totalData: totalRevenueData,
        });
        //// getting all products categories count in one obj
        //// ------------------------------------------------
        const inventoryProductsCategoryPercentage = await categoriesPercentageFunc({
            allProductsCategories,
            productsCount,
        });
        //// user Chart for female and male ratio
        //// ------------------------------------
        const userChartData = {
            female: UserFemaleCount,
            male: usersCount - UserFemaleCount,
        };
        //// orders data for transactions chart
        //// ----------------------------------
        const latestTransactionsData = latestOrders.map((order, i) => ({
            _id: order._id,
            discount: order.discount,
            price: order.total,
            items: order.cartItem.length,
            status: order.status,
        }));
        //// add all data in adminStats
        //// --------------------------
        adminStats = {
            thisToLastMonthPercentage,
            totalCounts,
            TransactionAndRevenueChartData: { transactionCountData, totalRevenueData },
            inventoryProductsCategoryPercentage,
            userChartData,
            latestTransactionsData,
        };
        if (!adminStats) return next(new CustomError("Admin Stats Not Found", 404));
        nodeCash.set(nodeCashKey, JSON.stringify(adminStats));
    }
    responseFunc(res, ``, 200, adminStats);
});

// =============================================
// http://localhost:8000/api/v1/admin/charts/pie
// =============================================
// GET ALL PIE CHARTS

export const getPieCharts = TryCatch(async (req, res, next) => {
    let nodeCashKey = "admin-pie-charts";
    let adminPieChartsData = {};
    if (nodeCash.has(nodeCashKey)) {
        adminPieChartsData = JSON.parse(nodeCash.get(nodeCashKey) as string);
    } else {
        const [
            processingOrders,
            shippedOrders,
            deliveredOrders,
            productsCount,
            allProductsCategories,
            productOutOfStock,
            allOrders,
            allUsersData,
            adminUserCounts,
        ] = await Promise.all([
            Order.countDocuments({ status: "processing" }),
            Order.countDocuments({ status: "shipped" }),
            Order.countDocuments({ status: "delivered" }),
            Product.countDocuments(),
            Product.distinct("category"),
            Product.countDocuments({ stock: { $lte: 0 } }),
            Order.find().select(["tax", "shippingCharges", "discount", "total", "subTotal"]),
            User.find().select("dob"),
            User.countDocuments({ role: "admin" }),
        ]);
        //// making the data for male and female chart from users
        //// -----------------------------------------------------
        const orderFulfillment = {
            processing: processingOrders,
            shipped: shippedOrders,
            delivered: deliveredOrders,
        };
        //// making the data for product categories percentage for chart
        //// -----------------------------------------------------------
        const productsCategoriesRatio = await categoriesPercentageFunc({
            allProductsCategories,
            productsCount,
        });
        //// making data for stock availability chart
        //// ----------------------------------------
        const stockAvailability = {
            outOfStock: productOutOfStock,
            inStock: productsCount - productOutOfStock,
        };
        //// data for revenue distribution Chart
        //// -----------------------------------
        const allRevenue = allOrders.reduce((total, order) => total + (order.total || 0), 0);
        const allDiscount = allOrders.reduce((total, order) => total + (order.discount || 0), 0);
        const marketingCost = Math.round(allRevenue * (30 / 100));
        const totalTax = allOrders.reduce((total, order) => total + (order.tax || 0), 0);
        const totalShippingCharges = allOrders.reduce(
            (total, order) => total + (order.shippingCharges || 0),
            0
        );
        const revenueDistribution = {
            netMargin: allRevenue - allDiscount - totalShippingCharges - totalTax - marketingCost,
            discount: allDiscount,
            productionCost: totalShippingCharges,
            burnt: totalTax,
            totalEarning: allRevenue,
        };
        //// users age group chart data
        //// --------------------------
        const usersAgeRatio = {
            teen: allUsersData.filter((item) => Number(item.age) < 18).length,
            adult: allUsersData.filter((item) => Number(item.age) >= 18 && Number(item.age) < 40).length,
            old: allUsersData.filter((item) => Number(item.age) >= 40).length,
        };
        //// admin customers charts data
        //// ---------------------------
        const adminCustomerRatio = {
            admin: adminUserCounts,
            customers: allUsersData.length - adminUserCounts,
        };
        //// add all data in pieChartData for response
        //// -----------------------------------------
        adminPieChartsData = {
            orderFulfillment,
            productsCategoriesRatio,
            stockAvailability,
            revenueDistribution,
            usersAgeRatio,
            adminCustomerRatio,
        };
        if (!adminPieChartsData) return next(new CustomError("Admin Pie Charts Data Not Found", 404));
        nodeCash.set(nodeCashKey, JSON.stringify(adminPieChartsData));
    }

    responseFunc(res, ``, 200, adminPieChartsData);
});

// =============================================
// http://localhost:8000/api/v1/admin/charts/bar
// =============================================
// GET ALL BAR CHARTS

export const getBarCharts = TryCatch(async (req, res, next) => {
    let nodeCashKey = "admin-bar-charts";
    let adminBarChartsData;
    const today = new Date();
    const sixMonthAgoDate = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    const oneYearAgoDate = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    if (nodeCash.has(nodeCashKey)) {
        adminBarChartsData = JSON.parse(nodeCash.get(nodeCashKey) as string);
    } else {
        //// all queries in promise.all for optimization
        //// -------------------------------------------
        const lastSixMonthQuery = { createdAt: { $lte: today, $gte: sixMonthAgoDate } };
        const lastOneYearQuery = { createdAt: { $lte: today, $gte: oneYearAgoDate } };
        const [lastSixMonthProducts, lastSixMonthUsers, lastOneYearOrders] = await Promise.all([
            Product.find(lastSixMonthQuery).select("createdAt"),
            User.find(lastSixMonthQuery).select("createdAt"),
            Order.find(lastOneYearQuery).select("createdAt"),
        ]);
        //// last six month products and customers
        //// -------------------------------------
        let sixMonthProductArr = new Array(6).fill(0);
        let sixMonthUsersArr = new Array(6).fill(0);
        updateArraysByMonthDifference({ data: lastSixMonthProducts, countData: sixMonthProductArr });
        updateArraysByMonthDifference({ data: lastSixMonthUsers, countData: sixMonthUsersArr });
        const sixMonthProductsAndCustomers = {
            products: sixMonthProductArr,
            Customers: sixMonthUsersArr,
        };
        //// last One Year Orders
        //// --------------------
        let lastYearOrdersArr = new Array(12).fill(0);
        updateArraysByMonthDifference({ data: lastOneYearOrders, countData: lastYearOrdersArr });
        //// adding both carts data in adminBarChartsData
        //// --------------------------------------------
        adminBarChartsData = { sixMonthProductsAndCustomers, lastYearOrdersArr };
        if (!adminBarChartsData) return next(new CustomError("Admin Bar Chart Data NOt Found", 500));
        nodeCash.set(nodeCashKey, JSON.stringify(adminBarChartsData));
    }
    responseFunc(res, ``, 200, adminBarChartsData);
});

// ==============================================
// http://localhost:8000/api/v1/admin/charts/line
// ==============================================
// GET ALL BAR CHARTS

export const getLineCharts = TryCatch(async (req, res, next) => {
    const today = new Date();
    const oneYearAgoDate = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    const nodeCashKey = "admin-line-charts";
    let adminLineChartsData = {};
    if (nodeCash.has(nodeCashKey)) {
        adminLineChartsData = JSON.parse(nodeCash.get(nodeCashKey) as string);
    } else {
        //// all queries in promise.all for optimization
        //// -------------------------------------------
        const lastOneYearQuery = { createdAt: { $lte: today, $gte: oneYearAgoDate } };
        const [oneYearUsers, oneYearProducts, oneYearOrders] = await Promise.all([
            User.find(lastOneYearQuery).select("createdAt"),
            Product.find(lastOneYearQuery).select("createdAt"),
            Order.find(lastOneYearQuery).select(["discount", "total", "createdAt"]),
        ]);
        //// one year users, products, discounts, and revenue
        //// ------------------------------------------------
        console.log(oneYearOrders);
        let oneYearUserArr = new Array(12).fill(0);
        let oneYearProductsArr = new Array(12).fill(0);
        let oneYearRevenueArr = new Array(12).fill(0);
        let oneYearDiscountsArr = new Array(12).fill(0);
        updateArraysByMonthDifference({ data: oneYearUsers, countData: oneYearUserArr });
        updateArraysByMonthDifference({ data: oneYearProducts, countData: oneYearProductsArr });
        updateArraysByMonthDifference({ data: oneYearOrders, totalData: oneYearRevenueArr });
        updateArraysByMonthDifference({ data: oneYearOrders, totalDiscount: oneYearDiscountsArr });
        adminLineChartsData = {
            oneYearUserArr,
            oneYearProductsArr,
            oneYearRevenueArr,
            oneYearDiscountsArr,
        };
        if (!adminLineChartsData) return next(new CustomError("Admin Line Chart Data Not Found", 500));
        nodeCash.set(nodeCashKey, JSON.stringify(adminLineChartsData));
    }
    responseFunc(res, ``, 200, adminLineChartsData);
});
