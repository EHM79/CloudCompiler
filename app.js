/**
 * CloudCode / CloudCompiler AI — Main Application Entry Point
 * Architecture: Clean Modular Express Backend
 */

import express from "express";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import apiRouter from "./src/routes/index.js";
import { errorHandler } from "./src/middlewares/error.middleware.js";
import { connectDB } from "./src/config/db.js";
import { ALLOWED_LANGUAGES } from "./src/config/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Core Middlewares
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// 2. CORS handling for optional external CLIENT_ORIGIN
const clientOrigin = process.env.CLIENT_ORIGIN;
if (clientOrigin) {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", clientOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });
}

// 3. Root level language endpoint for direct verification (GET /languages)
app.get("/languages", (req, res) => {
  res.json(ALLOWED_LANGUAGES);
});

// 3b. تأكد من اتصال الداتابيز قبل التسجيل/الدخول/الـ snippets وأظهر السبب الحقيقي لو فشل
app.use(["/api/auth/register", "/api/auth/login", "/api/snippets"], async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("[DB]", err.message);
    res.status(503).json({ error: `Database unavailable: ${err.message}` });
  }
});
// 4. API Routes Mount Point
app.use("/api", apiRouter);

// 5. Static Frontend Serving (Local Development & Standalone)
app.use(express.static(path.join(__dirname, "public")));

// 6. SPA Fallback Route
app.get("*", (req, res) => {
  const indexPath = path.join(__dirname, "public", "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("CloudCode UI not found");
  }
});

// 7. Global Error Handler
app.use(errorHandler);

// 8. Server Listener & Database Connection
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  const PORT = process.env.PORT || 5000;

  // Initialize DB connection
  connectDB().catch((err) => {
    console.error("[Startup Warning] Could not connect to MongoDB initially:", err.message);
  });

  app.listen(PORT, () => {
    console.log(` CloudCode Express Server running at http://localhost:${PORT}`);
  });
}

export default app;
