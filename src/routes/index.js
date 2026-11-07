/**
 * Central API Router Aggregator
 */

import { Router } from "express";
import healthRoutes from "./health.routes.js";
import executionRoutes from "./execution.routes.js";
import debugRoutes from "./debug.routes.js";
import snippetRoutes from "./snippet.routes.js";
import authRoutes from "./auth.routes.js";

const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use(executionRoutes);
apiRouter.use(debugRoutes);
apiRouter.use(snippetRoutes);
apiRouter.use(authRoutes);

export default apiRouter;

