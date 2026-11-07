/**
 * Code Execution Controller
 * Always delegates to Judge0; never executes code locally.
 */

import { MAX_CODE_LENGTH, MAX_STDIN_LENGTH, ALLOWED_LANGUAGE_KEYS, ALLOWED_LANGUAGES } from "../config/constants.js";
import { executeWithJudge0 } from "../services/judge0.service.js";

export function getLanguages(req, res) {
  res.json(ALLOWED_LANGUAGES);
}

export async function runCode(req, res) {
  const { code, language, stdin } = req.body ?? {};

  if (typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "Code is required" });
  }

  if (!ALLOWED_LANGUAGE_KEYS.has(language)) {
    return res.status(400).json({
      error: `Unsupported language. Supported languages: ${Array.from(ALLOWED_LANGUAGE_KEYS).join(", ")}`,
    });
  }

  if (code.length > MAX_CODE_LENGTH) {
    return res.status(400).json({
      error: `Code length exceeds limit of ${MAX_CODE_LENGTH} characters`,
    });
  }

  if (typeof stdin === "string" && stdin.length > MAX_STDIN_LENGTH) {
    return res.status(400).json({
      error: `Stdin length exceeds limit of ${MAX_STDIN_LENGTH} characters`,
    });
  }

  try {
    const result = await executeWithJudge0(code, language, stdin ?? "");
    result.language = language;
    result.length = code.length;
    res.json(result);
  } catch (err) {
    // Log provider failure reason server-side without logging user code or keys
    console.error(`[Judge0 Failure] Provider execution error: ${err.message}`);

    const isTimeout = err.message === "TIMEOUT";
    res.status(isTimeout ? 504 : 502).json({
      status: isTimeout ? "Time Limit Exceeded" : "Error",
      status_id: 13,
      stdout: "",
      stderr: isTimeout
        ? "Time limit exceeded — please check for infinite loops."
        : "Execution provider unavailable. Please try again.",
      compile_output: "",
      time: "0s",
      memory: "0 MB",
      exit_code: 1,
    });
  }
}
