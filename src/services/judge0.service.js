/**
 * Judge0 Remote Code Execution Service
 * Uses base64_encoded=true for all submissions (required by CE instance).
 */

import { ALLOWED_LANGUAGES } from "../config/constants.js";

const MAX_OUTPUT_BYTES = 20 * 1024; // 20 KB truncation per output field

function b64encode(str) {
  return Buffer.from(str ?? "", "utf-8").toString("base64");
}

function b64decode(val) {
  if (!val) return "";
  try {
    return Buffer.from(val, "base64").toString("utf-8");
  } catch {
    return val;
  }
}

function truncate(str) {
  if (!str) return "";
  if (str.length <= MAX_OUTPUT_BYTES) return str;
  return str.slice(0, MAX_OUTPUT_BYTES) + "\n… [output truncated — exceeded 20 KB]";
}

export async function executeWithJudge0(code, language, stdin = "") {
  const apiUrl = (process.env.JUDGE0_API_URL || "https://ce.judge0.com").replace(/\/$/, "");
  const apiKey = (process.env.JUDGE0_API_KEY || "").trim();

  const langInfo = ALLOWED_LANGUAGES[language];
  if (!langInfo) throw new Error(`Unsupported language: ${language}`);

  // Use CE-specific language ID when available
  const languageId = langInfo.judge0_ce_id || langInfo.judge0_id;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Add auth header only if a key is provided
  if (apiKey) {
    headers["X-Auth-Token"] = apiKey;
  }

  const payload = {
    source_code: b64encode(code),
    language_id: languageId,
    stdin: b64encode(stdin),
    cpu_time_limit: 5,
    memory_limit: 128000,
    base64_encoded: true,
  };

  // Submit with wait=true for immediate result on fast programs
  const submitUrl = `${apiUrl}/submissions?base64_encoded=true&wait=true`;

  let submitRes;
  try {
    submitRes = await fetch(submitUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new Error("TIMEOUT");
    }
    throw err;
  }

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => "");
    throw new Error(`Judge0 HTTP ${submitRes.status}: ${errText.slice(0, 200)}`);
  }

  let data = await submitRes.json();

  // Poll if still queued or processing (status id 1 or 2)
  if (data?.status?.id === 1 || data?.status?.id === 2) {
    const token = data.token;
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        const pollRes = await fetch(`${apiUrl}/submissions/${token}?base64_encoded=true`, {
          headers,
          signal: AbortSignal.timeout(6000),
        });
        if (pollRes.ok) {
          const polled = await pollRes.json();
          if (polled?.status?.id !== 1 && polled?.status?.id !== 2) {
            data = polled;
            break;
          }
        }
      } catch {
        // Keep polling
      }
    }
  }

  const statusId = data?.status?.id ?? 3;
  const statusDesc = data?.status?.description || "Completed";

  // Map Judge0 status to our normalized status string
  let normalizedStatus;
  if (statusId === 3) {
    normalizedStatus = "Completed";
  } else if (statusId === 5) {
    normalizedStatus = "Time Limit Exceeded";
  } else if (statusId === 6) {
    normalizedStatus = "Compilation Error";
  } else if (statusId >= 7 && statusId <= 12) {
    normalizedStatus = "Runtime Error";
  } else if (statusId === 13) {
    normalizedStatus = "Internal Error";
  } else if (statusId === 14) {
    normalizedStatus = "Exec Format Error";
  } else {
    normalizedStatus = statusDesc;
  }

  return {
    status: normalizedStatus,
    status_id: statusId,
    stdout: truncate(b64decode(data.stdout)),
    stderr: truncate(b64decode(data.stderr)),
    compile_output: truncate(b64decode(data.compile_output)),
    time: data.time ? `${data.time}s` : "0.00s",
    memory: data.memory ? `${(data.memory / 1024).toFixed(1)} MB` : "0 MB",
    exit_code: data.exit_code ?? 0,
  };
}
