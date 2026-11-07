/**
 * Google Gemini AI Debugging Service
 */

import { smartStaticAnalysis } from "./diagnostic.service.js";

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
      maxOutputTokens: 2048,
    },
  };

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
  let geminiRes = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiPayload),
    signal: AbortSignal.timeout(15000),
  });

  if (!geminiRes.ok) {
    // Fallback to gemini-1.5-flash
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
    geminiRes = await fetch(fallbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
      signal: AbortSignal.timeout(15000),
    });
  }

  if (!geminiRes.ok) {
    throw new Error(`Gemini API error (HTTP ${geminiRes.status})`);
  }

  const data = await geminiRes.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response candidate from Gemini API");
  }

  return {
    status: "success",
    mode: "gemini",
    explanation: text,
    model: "gemini-flash",
  };
}
