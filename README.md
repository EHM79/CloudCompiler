# CloudCode

**A cloud-based online compiler with an AI debugging assistant.**
Write, run, and debug code in your browser, then let Gemini explain what went wrong and how to fix it.

**Live demo:** [cloud-compiler-green.vercel.app](https://cloud-compiler-green.vercel.app)

---

## Features

- **Run code instantly** in C++, Python, Java, and JavaScript, executed in isolated sandboxes through [Judge0](https://judge0.com/).
- **AI Explain** — when your code fails, Gemini points to the root cause, explains the fix, and returns corrected code. Without a Gemini key, a built-in static analyzer takes over, so the feature never goes dark.
- **A real code editor** — [CodeMirror 6](https://codemirror.net/) with line numbers and syntax highlighting. If the editor can't be loaded from the CDN, a lightweight built-in editor takes its place.
- **Input and output panels** — provide `stdin`, then inspect `Output`, `Errors`, and `Compile` results along with execution time, memory usage, and exit code.
- **Recent runs** — jump back to any previous result with one click.
- **User accounts** — register and sign in with email and password (bcrypt hashing, JWT in an HTTP-only cookie).
- **My Snippets** — save, search, reopen, and delete your code.
- **Keyboard shortcuts** — `Ctrl + Enter` to run, `Ctrl + S` to save.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript (ES modules), CodeMirror 6 |
| Backend | Node.js 22+, Express 4 |
| Database | MongoDB (MongoDB Atlas) with Mongoose |
| Auth | JSON Web Tokens, bcryptjs, HTTP-only cookies |
| Code execution | Judge0 CE |
| AI | Google Gemini API |
| Hosting | Vercel (serverless) |

## How it works

```text
Browser (public/)
   │  HTML · CSS · JS · CodeMirror 6
   ▼
Express app (app.js)
   ├── /api/auth/*      → register, login, profile, logout   ──► MongoDB
   ├── /api/snippets    → save, list, delete snippets        ──► MongoDB
   ├── /api/run         → execute code                       ──► Judge0
   ├── /api/debug       → explain and fix errors             ──► Gemini
   └── /api/health      → service health check
```

## Project structure

```text
.
├── app.js                  # Express app and entry point
├── public/                 # Frontend (index.html, style.css, script.js)
├── src/
│   ├── config/             # Database connection and constants
│   ├── controllers/        # Request handlers
│   ├── middlewares/        # Auth and error handling
│   ├── models/             # Mongoose models (User, Snippet)
│   ├── routes/             # API route definitions
│   ├── services/           # Judge0, Gemini, and static diagnostics
│   └── utils/              # JWT helpers
├── tests/                  # API tests
└── vercel.json             # Vercel configuration
```

## Getting started

### Prerequisites

- Node.js 22 or newer
- A MongoDB database ([MongoDB Atlas](https://www.mongodb.com/atlas) has a free tier)

### Installation

```bash
git clone https://github.com/EHM79/CloudCompiler.git
cd CloudCompiler
npm install
cp .env.example .env
```

Open `.env` and fill in at least `DATABASE_URL` and `JWT_SECRET` (see [Environment variables](#environment-variables)).

### Run locally

```bash
npm run dev     # starts the server with auto-reload
# or
npm start
```

Then open <http://localhost:5000>.

### Run the tests

```bash
npm test
```

## Environment variables

| Variable | Required | Description |
| --- | :---: | --- |
| `DATABASE_URL` | Yes | MongoDB connection string, e.g. `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/cloudcompiler?retryWrites=true&w=majority` |
| `JWT_SECRET` | In production | A long, random secret used to sign login tokens |
| `JWT_EXPIRES_IN` | | Token lifetime. Defaults to `7d` |
| `GEMINI_API_KEY` | | Enables Gemini-powered explanations. Without it, the built-in analyzer is used. Get a key from [Google AI Studio](https://aistudio.google.com/) |
| `GEMINI_MODEL` | | Overrides the first Gemini model to try. Defaults to a list of current stable models |
| `JUDGE0_API_URL` | | Judge0 endpoint. Defaults to `https://ce.judge0.com` |
| `JUDGE0_API_KEY` | | Only needed if your Judge0 provider requires a key |
| `COOKIE_SECURE` | | Set to `true` on HTTPS deployments such as Vercel |
| `COOKIE_SAMESITE` | | Defaults to `lax` |
| `CLIENT_ORIGIN` | | Only needed if the frontend is served from a different origin |
| `PORT` | | Local server port. Defaults to `5000` |

> **Never commit your `.env` file or put secrets in `public/script.js`.**

## Deploying to Vercel

1. Push the repository to GitHub.
2. In [Vercel](https://vercel.com), choose **Add New → Project** and import the repository. Keep the project root as the Root Directory.
3. Under **Settings → Environment Variables**, add the variables above (at minimum `DATABASE_URL` and `JWT_SECRET`, plus `COOKIE_SECURE=true`).
4. In **MongoDB Atlas → Network Access**, allow connections from `0.0.0.0/0`. Vercel does not use fixed IP addresses.
5. Deploy. Environment variable changes only apply to new deployments, so redeploy after editing them.

After deploying, check `/api/health`, then try registering, running some code, and using AI Explain.

## API reference

| Method | Endpoint | Auth | Description |
| --- | --- | :---: | --- |
| `GET` | `/api/health` | | Service health check |
| `GET` | `/api/languages` | | List supported languages |
| `POST` | `/api/run` | | Execute code (rate limited) |
| `POST` | `/api/debug` | Yes | AI explanation of errors (rate limited) |
| `POST` | `/api/auth/register` | | Create an account |
| `POST` | `/api/auth/login` | | Sign in |
| `GET` | `/api/auth/me` | | Current user profile |
| `POST` | `/api/auth/logout` | | Sign out |
| `GET` | `/api/snippets` | Yes | List your snippets |
| `POST` | `/api/snippets` | Yes | Create or update a snippet |
| `DELETE` | `/api/snippets/:id` | Yes | Delete a snippet |

## Troubleshooting

- **`Database unavailable` or `buffering timed out`** — check that `DATABASE_URL` is set and complete (it must include the full host, ending in `.mongodb.net`), that the database user's password is correct, and that Atlas allows `0.0.0.0/0`.
- **`JWT_SECRET must be configured`** — add `JWT_SECRET` to your environment variables.
- **AI Explain is unavailable** — check the function logs for the underlying Gemini error. The most common causes are an invalid key, an exhausted quota, or a model that Google has retired. Set `GEMINI_MODEL` to a current model to fix the last one.

## Limits

Free tiers of Vercel, MongoDB Atlas, Judge0, and Gemini come with usage limits and no availability guarantees. Each runs on its own quota, so one can fail while the others keep working.

## Contributing

Issues and pull requests are welcome. Please run `npm test` before submitting changes.
