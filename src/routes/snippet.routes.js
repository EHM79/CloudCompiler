import { Router } from "express";
import { listSnippets, createOrUpdateSnippet, deleteSnippet } from "../controllers/snippet.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Snippet routes require authentication
router.use("/snippets", requireAuth);

router.get("/snippets", listSnippets);
router.post("/snippets", createOrUpdateSnippet);
router.delete("/snippets/:id", deleteSnippet);

export default router;
