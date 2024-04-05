import express, { Express } from "express";
import { createUser, deleteUser, getAllUsers, getSingleUser } from "../controllers/users.controllers.js";
import { isAdmin } from "../middlewares/auth.js";

const app: Express = express();

// ADMIN ONLY === get all users
app.get("/all", isAdmin, getAllUsers);

// register or signup route
app.post("/new", createUser);

// get one user or delete one user
app.route("/one/:_id").get(getSingleUser).delete(isAdmin, deleteUser);

export default app;
