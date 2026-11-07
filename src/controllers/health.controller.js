/**
 * Health Check Controller
 */

export function getHealth(req, res) {
  const judge0Url = process.env.JUDGE0_API_URL || "";
  const judge0Key = process.env.JUDGE0_API_KEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || "";

  res.json({
    status: "ok",
    service: "CloudCode Compiler AI (Express Modular)",
    version: "1.0.0",
    judge0_configured: Boolean(judge0Url || judge0Key),
    gemini_configured: Boolean(geminiKey),
    timestamp: Date.now(),
  });
}

