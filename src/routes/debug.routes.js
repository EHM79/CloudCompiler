import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { debugCode } from "../controllers/debug.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Max 10 debug requests per minute per IP
const debugLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI debugging requests. Please wait a minute before trying again." },
});

router.post("/debug", requireAuth, debugLimiter, debugCode);

export default router;
