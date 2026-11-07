import { Router } from "express";
import { register, login, getProfile, logout } from "../controllers/auth.controller.js";

const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", getProfile);
router.post("/auth/logout", logout);

export default router;
