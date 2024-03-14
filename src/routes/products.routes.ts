import express from "express";
import {
	createNewProduct,
	deleteProduct,
	getAdminProducts,
	getAllProducts,
	getCategories,
	getLatestProducts,
	getSingleProduct,
	updateProduct,
} from "../controllers/products.controllers.js";
import singleUpload from "../middlewares/multer.js";
import { isAdmin } from "../middlewares/auth.js";

const app = express();

// get latest products
app.get("/latest", getLatestProducts);

// get all products and search queries
app.get("/all-products", getAllProducts);

// get all categories
app.get("/categories", getCategories);

app.get("/admin-products", isAdmin, getAdminProducts);

// ADMIN ONLY === create new product
app.post("/new", isAdmin, singleUpload, createNewProduct);

// ADMIN ONLY === update or delete one product
app.route("/single/:productId")
	.get(getSingleProduct)
	.delete(isAdmin, deleteProduct)
	.put(isAdmin, singleUpload, updateProduct);

export default app;
