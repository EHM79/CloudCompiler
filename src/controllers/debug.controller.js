/**
 * AI Debugging Controller
 */

import { ALLOWED_LANGUAGE_KEYS } from "../config/constants.js";
import { explainErrorWithGemini } from "../services/gemini.service.js";

const MAX_CODE_LENGTH = 50 * 1024; // 50 KB
const MAX_TEXT_LENGTH = 20 * 1024; // 20 KB

export async function debugCode(req, res) {
  const { code, language = "cpp", error = "", output = "", stdin = "" } = req.body ?? {};

  if (typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "Code is required for AI debugging" });
  }

  if (!ALLOWED_LANGUAGE_KEYS.has(language)) {
    return res.status(400).json({
      error: `Unsupported language. Supported languages: ${Array.from(ALLOWED_LANGUAGE_KEYS).join(", ")}`,
    });
  }

  if (code.length > MAX_CODE_LENGTH) {
    return res.status(400).json({
      error: `Code exceeds the maximum allowed limit of ${MAX_CODE_LENGTH / 1024} KB`,
    });
  }

  if (typeof error === "string" && error.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({
      error: `Error text exceeds the maximum allowed limit of ${MAX_TEXT_LENGTH / 1024} KB`,
    });
  }

  if (typeof output === "string" && output.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({
      error: `Output text exceeds the maximum allowed limit of ${MAX_TEXT_LENGTH / 1024} KB`,
    });
  }

  try {
    const result = await explainErrorWithGemini({
      code,
      language,
      error,
      output,
      stdin,
    });

    res.json(result);
  } catch (err) {
    // Log provider failure reason server-side without logging user code or keys
    console.error(`[Gemini Provider Error]: ${err.message}`);
    res.status(502).json({
      error: "AI debugging service is currently unavailable. Please try again later.",
    });
  }
}
