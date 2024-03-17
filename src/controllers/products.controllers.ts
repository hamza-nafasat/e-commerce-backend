import { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { nodeCash } from "../app.js";
import { TryCatch } from "../middlewares/errorHandler.js";
import Product from "../models/products.model.js";
import {
	AllProductsQueryTypes,
	CreateNewProductTypes,
	searchBaseQueryTypes,
} from "../types/apis.types.js";
import { removeFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import CustomError from "../utils/customClass.js";
import { invalidateNodeCash, responseFunc } from "../utils/features.js";
import getDataUri from "../utils/uriParser.js";

// =========================================
// http://localhost:8000/api/v1/products/new = CREATE NEW PRODUCT
// =========================================

export const createNewProduct = TryCatch(
	async (req: Request<{}, {}, CreateNewProductTypes>, res: Response, next: NextFunction) => {
		const { name, price, stock, category } = req.body;
		const photo = req.file;
		if (!photo) return next(new CustomError("Please Enter Photo", 400));
		//// if any field doesn't exist then delete photo and return an err response
		if (!name || !price || !stock || !category) {
			// deletePhoto(photo.path);
			return next(new CustomError("Please Enter All Fields", 400));
		}
		let product = await Product.findOne({ name: name });
		//// if product already exist then delete photo and return an err response
		if (product) return next(new CustomError("Please Enter A Unique Name For New Product", 409));
		//// getting the url from parser and send file to cloudinary
		const fileUrl = getDataUri(photo);
		if (!fileUrl.content) {
			return next(new CustomError("Error While Making a Url of File", 400));
		}
		const myCloud = await uploadOnCloudinary(fileUrl.content!, "products");
		if (!myCloud?.public_id || !myCloud?.secure_url) {
			return next(new CustomError("Error While Uploading File", 500));
		}
		//// if all fields exist and product does'nt exist then create a new product
		product = await Product.create({
			name: name.toLowerCase(),
			price: Number(price),
			stock,
			category: category.toLowerCase(),
			photo: {
				publicId: myCloud.public_id,
				url: myCloud.secure_url,
			},
		});
		//// deleting nodeCash data bcz new product created
		invalidateNodeCash({ isProducts: true, isAdmins: true });
		//// sending response
		return responseFunc(res, "Product Created Successfully", 201);
	}
);

// ============================================
// http://localhost:8000/api/v1/products/latest = LATEST PRODUCTS
// ===========================================

export const getLatestProducts = TryCatch(async (req, res, next) => {
	const nodeCashKey = "latest-products";
	let products;
	//// fetching and cashing data in nodeCash
	if (nodeCash.has(nodeCashKey)) {
		products = JSON.parse(nodeCash.get(nodeCashKey) as string);
	} else {
		products = await Product.find().sort({ createdAt: -1 }).limit(5);
		if (!products) return next(new CustomError("Products Not Found", 404));
		nodeCash.set(nodeCashKey, JSON.stringify(products));
	}
	return responseFunc(res, "", 200, products);
});

// ================================================
// http://localhost:8000/api/v1/products/categories = CATEGORIES
// ================================================

export const getCategories = TryCatch(async (req, res, next) => {
	let categories;
	const nodeCashKey = "categories";
	//// fetching and cashing data in nodeCash
	if (nodeCash.has(nodeCashKey)) {
		categories = JSON.parse(nodeCash.get(nodeCashKey) as string);
	} else {
		categories = await Product.distinct("category");
		if (!categories) return next(new CustomError("Categories Not Found", 404));
		nodeCash.set(nodeCashKey, JSON.stringify(categories));
	}
	return responseFunc(res, "", 200, categories);
});

// ===================================================
// http://localhost:8000/api/v1/products/admin-prodcuts = ADMIN PRODUCTS
// ===================================================

export const getAdminProducts = TryCatch(async (req, res, next) => {
	const nodeCashKey = "admin-products";
	let products;
	//// fetching and cashing data in nodeCash
	if (nodeCash.has(nodeCashKey)) {
		products = JSON.parse(nodeCash.get(nodeCashKey) as string);
	} else {
		products = await Product.find();
		nodeCash.set(nodeCashKey, JSON.stringify(products));
	}
	return responseFunc(res, "", 200, products);
});

// ================================================
// http://localhost:8000/api/v1/products/single/:productId =  GET SINGLE PRODUCT
// ================================================

export const getSingleProduct = TryCatch(async (req, res, next) => {
	const { productId } = req.params;
	const nodeCashKey = `product-${productId}`;
	let product;
	//// fetching and cashing data in nodeCash
	if (nodeCash.has(nodeCashKey)) {
		product = JSON.parse(nodeCash.get(nodeCashKey) as string);
	} else {
		product = await Product.findById(productId);
		if (!product) return next(new CustomError("Product Not Found", 404));
		nodeCash.set(nodeCashKey, JSON.stringify(product));
	}
	return responseFunc(res, "", 200, product);
});

// =========== same route =========== = DELETE SINGLE PRODUCT

export const deleteProduct = TryCatch(async (req, res, next) => {
	const { productId } = req.params;
	if (!isValidObjectId(productId)) return next(new CustomError("Invalid Product Id", 400));
	const product = await Product.findByIdAndDelete({ _id: productId });
	if (!product) return next(new CustomError("Product Not Found", 404));
	//// deleting image from cloudinary
	await removeFromCloudinary(product.photo.publicId);
	//// deleting nodeCash data bcz one product deleted
	invalidateNodeCash({ isProducts: true, isAdmins: true, productId: String(product._id) });
	//// sending response
	return responseFunc(res, "Product Deleted Successfully", 200);
});

// =========== same route =========== = UPDATE SINGLE PRODUCT

export const updateProduct = TryCatch(async (req, res, next) => {
	const { productId } = req.params;
	if (!isValidObjectId(productId)) return next(new CustomError("Invalid Product Id", 404));
	//// destructure data from body and file
	const photo = req.file;
	const { name, stock, price, category } = req.body;
	//// if not provided anything
	if (!name && !price && !stock && !category && !photo) {
		return next(new CustomError("Please Enter Something First", 400));
	}
	//// if product is available in database then go next
	let product = await Product.findById(productId);
	if (!product) return next(new CustomError("Product Not Found", 400));
	if (name) product.name = name;
	if (stock) product.stock = stock;
	if (price) product.price = price;
	if (category) product.category = category;
	if (photo) {
		await removeFromCloudinary(product.photo.publicId);
		//// getting the url from parser and send file to cloudinary
		const fileUrl = getDataUri(photo);
		if (!fileUrl.content) {
			return next(new CustomError("Error While Making a Url of File", 400));
		}
		const myCloud = await uploadOnCloudinary(fileUrl.content!, "products");
		if (!myCloud?.public_id || !myCloud?.secure_url) {
			return next(new CustomError("Error While Uploading File", 500));
		}
		product.photo = { publicId: myCloud.public_id, url: myCloud.url };
	}
	//// now update the product
	await product.save();
	//// deleting nodeCash data bcz one product update
	invalidateNodeCash({ isProducts: true, isAdmins: true, productId: String(product._id) });
	//// sending response
	return responseFunc(res, "Product Updated Successfully", 200);
});

//==================================================
// http://localhost:8000/api/v1/products/all-products =  ALL PRODUCTS FOR SEARCH AND FILTERS
// ===================================================

export const getAllProducts = TryCatch(
	async (req: Request<{}, {}, {}, AllProductsQueryTypes>, res, next) => {
		const { category, price, search, sort } = req.query;
		////  creating a logic of pages dataLimit on one page and skip data on page change
		const page = Number(req.query.page) || 1;
		const onePageLimit = Number(process.env.PRODUCT_PER_PAGE) || 8;
		const skipProducts = onePageLimit * (page - 1);
		//// creating searchQuery according given fields
		const searchBaseQuery: searchBaseQueryTypes = {};
		if (search) {
			searchBaseQuery.name = {
				$regex: new RegExp(String(search), "i"),
			};
		}
		if (price) {
			searchBaseQuery.price = {
				$lte: Number(price),
			};
		}
		if (category) {
			searchBaseQuery.category = String(category);
		}
		//// get filteredData and total count of data according search query in parallel promises
		const [filteredProducts, totalSearchProducts] = await Promise.all([
			Product.find(searchBaseQuery)
				.skip(skipProducts)
				.limit(onePageLimit)
				.select("name price")
				.lean()
				.sort(
					sort && {
						price: sort === "ascending" ? 1 : -1,
					}
				),
			Product.countDocuments(searchBaseQuery),
		]);
		//// creating total page count according total product with searchBaseQuery
		const totalPages = Math.ceil(totalSearchProducts / onePageLimit);
		//// sending response with data
		return responseFunc(res, "", 200, {
			totalFilteredProducts: filteredProducts.length,
			totalSearchProducts,
			totalPages,
			filteredProducts,
		});
	}
);
