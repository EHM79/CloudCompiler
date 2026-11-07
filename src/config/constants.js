/**
 * Application Constants & Configuration
 */

export const MAX_CODE_LENGTH = 50000;   // 50 KB
export const MAX_STDIN_LENGTH = 10000;  // 10 KB

export const ALLOWED_LANGUAGES = {
  cpp: {
    name: "C++ (GCC 14.1.0)",
    judge0_id: 54,      // RapidAPI GCC 9.2.0 (fallback)
    judge0_ce_id: 76,   // CE GCC 14.1.0
  },
  python: {
    name: "Python (3.12.5)",
    judge0_id: 71,      // RapidAPI Python 3.8.1 (fallback)
    judge0_ce_id: 92,   // CE Python 3.12.5
  },
  java: {
    name: "Java (OpenJDK 21)",
    judge0_id: 62,      // RapidAPI OpenJDK 13.0.1 (fallback)
    judge0_ce_id: 91,   // CE OpenJDK 21
  },
  javascript: {
    name: "JavaScript (Node.js 20.17.0)",
    judge0_id: 63,      // RapidAPI Node.js 12.14.0 (fallback)
    judge0_ce_id: 93,   // CE Node.js 20.17.0
  },
};

export const ALLOWED_LANGUAGE_KEYS = new Set(Object.keys(ALLOWED_LANGUAGES));
