/**
 * Offline Diagnostic Static Analyzer
 * Detects common programming syntax & runtime bugs without requiring external API keys.
 */

export function smartStaticAnalysis(code, language, error = "") {
  const explanations = [];
  const errLower = error.toLowerCase();
  const lines = code.split("\n");

  if (errLower.includes("syntaxerror") || errLower.includes("expected") || errLower.includes("error:")) {
    if (language === "cpp" || language === "java") {
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (
          trimmed &&
          !trimmed.endsWith(";") &&
          !trimmed.endsWith("{") &&
          !trimmed.endsWith("}") &&
          !trimmed.startsWith("#") &&
          !trimmed.startsWith("//")
        ) {
          explanations.push(`Missing semicolon \`;\` around line ${i + 1}: \`${trimmed}\``);
          break;
        }
      }
    } else if (language === "python") {
      if (errLower.includes("indentationerror")) {
        explanations.push("Indentation mismatch detected. Python requires consistent 4-space indentation for code blocks.");
      } else {
        explanations.push("Syntax error detected. Check for missing colons `:` after `def`, `if`, `for`, or `while` statements.");
      }
    }
  }

  if (errLower.includes("zerodivisionerror") || errLower.includes("division by zero")) {
    explanations.push("Division by zero occurred. Add a check `if (denominator !== 0)` before dividing.");
  }

  if (errLower.includes("nameerror") || errLower.includes("not declared in this scope") || errLower.includes("cannot find symbol")) {
    explanations.push("Undeclared variable or missing include/import statement.");
  }

  if (explanations.length === 0) {
    explanations.push(`Runtime error encountered while executing ${language.toUpperCase()} code.`);
    explanations.push("Check stack trace line numbers to pinpoint the failing expression.");
  }

  const explanationText =
    "### 🔍 Diagnostic Analysis\n\n" +
    explanations.map((e) => `- ${e}`).join("\n") +
    "\n\n> 💡 **Gemini AI Note**: To enable real-time generative AI error explanation with line-by-line fixes, configure `GEMINI_API_KEY` in your environment variables.";

  return {
    status: "success",
    mode: "diagnostic",
    explanation: explanationText,
    suggested_fix: "Review syntax and loop boundary conditions.",
    fixed_code: code,
  };
}

