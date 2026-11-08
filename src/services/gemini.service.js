/**
 * Google Gemini AI Debugging Service
 */

import { smartStaticAnalysis } from "./diagnostic.service.js";

// Current stable models, tried in order. Google retires old models over time
// (gemini-1.5-flash is gone, gemini-2.5-flash is limited to existing users),
// so you can override the first choice with the GEMINI_MODEL environment variable.
const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];

// Vercel Hobby functions time out at ~10s, so keep each attempt short.
const REQUEST_TIMEOUT_MS = 9000;

function getModelList() {
  const custom = process.env.GEMINI_MODEL?.trim();
  if (!custom) return DEFAULT_MODELS;
  return [custom, ...DEFAULT_MODELS.filter((m) => m !== custom)];
}

export async function explainErrorWithGemini({ code, language = "cpp", error = "", output = "", stdin = "" }) {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  // If no Gemini key is provided, use the offline diagnostic analyzer
  if (!geminiKey || geminiKey === "your_gemini_api_key_here") {
    return smartStaticAnalysis(code, language, error || output);
  }

  const prompt = `You are CloudCode's AI Senior Software Engineer and Debugging Assistant.
A user encountered an error or needs clarification on their ${language} code.

Language: ${language}
Source Code:
\`\`\`${language}
${code}
\`\`\`

Standard Input (stdin):
${stdin || "(None)"}

Compiler / Runtime Output:
${output || "(None)"}

Error Message:
${error || "(None)"}

Please provide a helpful, concise, well-structured response with:
1. **Root Cause**: Explain exactly what went wrong and which line caused it.
2. **How to Fix**: Explain the correction simply and clearly.
3. **Corrected Code**: Provide the complete working corrected code block.
4. Keep the tone friendly, encouraging, and clear.`;

  const geminiPayload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      // Newer models count their internal "thinking" tokens inside this limit,
      // so 2048 could leave no room for the visible answer.
      maxOutputTokens: 8192,
    },
  };

  // Every failed attempt is recorded so the server log shows the REAL reason
  // (the API key is sent in a header, never in the URL, so it can't leak into logs).
  const failures = [];

  for (const model of getModelList()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify(geminiPayload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      failures.push(`${model}: ${err.name === "TimeoutError" ? "timeout" : err.message}`);
      continue;
    }

    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json();
        detail = body?.error?.message || "";
      } catch {
        // ignore body parse errors
      }
      failures.push(`${model}: HTTP ${res.status}${detail ? ` - ${detail}` : ""}`);
      continue;
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((p) => typeof p.text === "string" && !p.thought)
      .map((p) => p.text)
      .join("");

    if (!text) {
      failures.push(`${model}: empty response (finishReason: ${data?.candidates?.[0]?.finishReason ?? "unknown"})`);
      continue;
    }

    return {
      status: "success",
      mode: "gemini",
      explanation: text,
      model,
    };
  }

  throw new Error(`Gemini API error - all models failed: ${failures.join(" | ")}`);
}
