import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { runCode, getLanguages } from "../controllers/execution.controller.js";

const router = Router();

// Max 10 run requests per minute per IP
const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Execution rate limit exceeded. Please wait a minute before running code again." },
});

router.get("/languages", getLanguages);
router.post("/run", runLimiter, runCode);

export default router;
