import express from "express";
import {
	dashboardStats,
	getBarCharts,
	getLineCharts,
	getPieCharts,
} from "../controllers/stats.controllers.js";
import { isAdmin } from "../middlewares/auth.js";

const app = express();

app.get("/dashboard/stats", dashboardStats);
app.get("/charts/pie", isAdmin, getPieCharts);
app.get("/charts/bar", isAdmin, getBarCharts);
app.get("/charts/line", isAdmin, getLineCharts);

export default app;
