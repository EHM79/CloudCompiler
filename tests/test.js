import assert from "node:assert";
import http from "node:http";
import mongoose from "mongoose";
import app from "../app.js";
import { ALLOWED_LANGUAGES } from "../src/config/constants.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_key_123456";

const server = http.createServer(app);

server.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`\n======================================================`);
  console.log(` Testing CloudCode Express API on ${baseUrl}...`);
  console.log(`======================================================\n`);

  try {
    // ------------------------------------------------------------------
    // TEST 1: GET /languages & GET /api/languages (Requirement 5)
    // ------------------------------------------------------------------
    console.log("=== TEST 1: GET /languages ===");
    const rootLangRes = await fetch(`${baseUrl}/languages`);
    assert.strictEqual(rootLangRes.status, 200);
    const rootLangs = await rootLangRes.json();
    assert.deepStrictEqual(rootLangs, ALLOWED_LANGUAGES);
    console.log(" Root GET /languages matches ALLOWED_LANGUAGES exactly.");

    const apiLangRes = await fetch(`${baseUrl}/api/languages`);
    assert.strictEqual(apiLangRes.status, 200);
    const apiLangs = await apiLangRes.json();
    assert.strictEqual(apiLangs.cpp.judge0_id, 54);
    assert.strictEqual(apiLangs.python.judge0_id, 71);
    assert.strictEqual(apiLangs.java.judge0_id, 62);
    assert.strictEqual(apiLangs.javascript.judge0_id, 63);
    console.log(" GET /api/languages verified with intact IDs (cpp:54, python:71, java:62, js:63).");

    // ------------------------------------------------------------------
    // TEST 2: GET /api/health
    // ------------------------------------------------------------------
    console.log("\n=== TEST 2: GET /api/health ===");
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200);
    const health = await healthRes.json();
    assert.strictEqual(health.status, "ok");
    console.log(" Health check passed:", health);

    // ------------------------------------------------------------------
    // TEST 3: Auth Validation & Protection (Requirements 1 & 2)
    // ------------------------------------------------------------------
    console.log("\n=== TEST 3: AUTH VALIDATION & ROUTE PROTECTION ===");

    // Unauthenticated access to /api/snippets -> 401
    const unauthSnipRes = await fetch(`${baseUrl}/api/snippets`);
    assert.strictEqual(unauthSnipRes.status, 401);
    console.log(" Unauthenticated GET /api/snippets rejected with 401.");

    // Unauthenticated access to /api/debug -> 401
    const unauthDebugRes = await fetch(`${baseUrl}/api/debug`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "print(1)", language: "python" }),
    });
    assert.strictEqual(unauthDebugRes.status, 401);
    console.log(" Unauthenticated POST /api/debug rejected with 401.");

    // Invalid register payload -> 400
    const badRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "A", email: "not-an-email", password: "123" }),
    });
    assert.strictEqual(badRegRes.status, 400);
    console.log(" Invalid registration payload rejected with 400.");

    // Invalid login payload -> 400
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid", password: "" }),
    });
    assert.strictEqual(badLoginRes.status, 400);
    console.log(" Invalid login payload rejected with 400.");

    // Unauthenticated GET /api/auth/me returns { user: null }
    const unauthMeRes = await fetch(`${baseUrl}/api/auth/me`);
    assert.strictEqual(unauthMeRes.status, 200);
    const unauthMeData = await unauthMeRes.json();
    assert.strictEqual(unauthMeData.user, null);
    console.log(" Unauthenticated GET /api/auth/me returns { user: null }.");

    // ------------------------------------------------------------------
    // TEST 4: Code Execution via Judge0 CE (Requirement 4)
    // ------------------------------------------------------------------
    console.log("\n=== TEST 4: POST /api/run (REAL JUDGE0 EXECUTION) ===");
    const runRes = await fetch(`${baseUrl}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "print('Hello from CloudCode Real Execution!')",
        language: "python",
        stdin: "",
      }),
    });
    assert.strictEqual(runRes.status, 200);
    const runData = await runRes.json();
    assert.strictEqual(runData.status, "Completed");
    assert(runData.stdout.includes("Hello from CloudCode Real Execution!"));
    console.log(" Real Python execution stdout:", runData.stdout.trim());

    // ------------------------------------------------------------------
    // TEST 5: Input limits on /api/run
    // ------------------------------------------------------------------
    console.log("\n=== TEST 5: LIMIT CHECKS ON /api/run ===");
    const hugeCode = "a".repeat(50001);
    const limitRes = await fetch(`${baseUrl}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: hugeCode, language: "python" }),
    });
    assert.strictEqual(limitRes.status, 400);
    console.log(" Code exceeding 50KB rejected with 400.");

    // ------------------------------------------------------------------
    // TEST 6: Static Assets
    // ------------------------------------------------------------------
    console.log("\n=== TEST 6: STATIC ASSETS ===");
    const indexRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(indexRes.status, 200);
    const html = await indexRes.text();
    assert(html.includes("CloudCode"));
    assert(html.includes("auth-modal"));

    const cssRes = await fetch(`${baseUrl}/style.css`);
    assert.strictEqual(cssRes.status, 200);

    const jsRes = await fetch(`${baseUrl}/script.js`);
    assert.strictEqual(jsRes.status, 200);
    console.log(" Frontend assets (index.html, style.css, script.js) loaded successfully.");

    // ------------------------------------------------------------------
    // TEST 7: Database Connection Check
    // ------------------------------------------------------------------
    console.log("\n=== TEST 7: DATABASE & FULL AUTH/SNIPPET FLOW ===");
    const dbState = mongoose.connection.readyState;
    console.log(` MongoDB connection state: ${dbState} (0: disconnected, 1: connected, 2: connecting)`);

    if (dbState === 1) {
      console.log(" Testing live MongoDB User Registration, Login, Snippet CRUD and Ownership Checks...");
      
      const testEmail1 = `user1_${Date.now()}@example.com`;
      const testPassword = "Password123!";

      // Register User 1
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "UserOne",
          email: testEmail1,
          password: testPassword,
        }),
      });
      assert.strictEqual(regRes.status, 201);
      const regData = await regRes.json();
      const cookie1 = regRes.headers.get("set-cookie");
      assert(cookie1, "Set-Cookie header must be present on register");
      console.log(" User 1 registered successfully, JWT cookie received.");

      // GET /api/auth/me for User 1
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: cookie1 },
      });
      const meData = await meRes.json();
      assert.strictEqual(meData.user?.email, testEmail1);
      console.log(" User 1 profile verified via cookie session.");

      // User 1 creates a snippet
      const createSnipRes = await fetch(`${baseUrl}/api/snippets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie1,
        },
        body: JSON.stringify({
          title: "User1 Private Algorithm",
          language: "python",
          code: "def solve(): return 42",
        }),
      });
      assert.strictEqual(createSnipRes.status, 201);
      const snip1 = await createSnipRes.json();
      assert(snip1.id);
      console.log(` User 1 created snippet: "${snip1.title}" (ID: ${snip1.id})`);

      // Register User 2
      const testEmail2 = `user2_${Date.now()}@example.com`;
      const regRes2 = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "UserTwo",
          email: testEmail2,
          password: testPassword,
        }),
      });
      assert.strictEqual(regRes2.status, 201);
      const cookie2 = regRes2.headers.get("set-cookie");
      console.log(" User 2 registered successfully with separate session.");

      // User 2 lists snippets (must NOT see User 1's snippet!)
      const listSnip2 = await fetch(`${baseUrl}/api/snippets`, {
        headers: { Cookie: cookie2 },
      });
      const user2Snippets = await listSnip2.json();
      assert.strictEqual(user2Snippets.length, 0, "User 2 must not see User 1's snippets");
      console.log(" User 2 snippets list is isolated (0 snippets visible).");

      // User 2 attempts to update User 1's snippet (must fail with 404!)
      const hackUpdateRes = await fetch(`${baseUrl}/api/snippets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie2,
        },
        body: JSON.stringify({
          id: snip1.id,
          title: "Hacked by User 2",
        }),
      });
      assert.strictEqual(hackUpdateRes.status, 404, "User 2 cannot update User 1's snippet");
      console.log(" Ownership check verified: User 2 updating User 1 snippet returned 404.");

      // User 2 attempts to delete User 1's snippet (must fail with 404!)
      const hackDeleteRes = await fetch(`${baseUrl}/api/snippets/${snip1.id}`, {
        method: "DELETE",
        headers: { Cookie: cookie2 },
      });
      assert.strictEqual(hackDeleteRes.status, 404, "User 2 cannot delete User 1's snippet");
      console.log(" Ownership check verified: User 2 deleting User 1 snippet returned 404.");

      // User 1 updates their own snippet -> 200
      const updateRes = await fetch(`${baseUrl}/api/snippets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie1,
        },
        body: JSON.stringify({
          id: snip1.id,
          title: "User1 Updated Algorithm",
          code: "def solve(): return 100",
        }),
      });
      assert.strictEqual(updateRes.status, 200);
      const updatedSnip = await updateRes.json();
      assert.strictEqual(updatedSnip.title, "User1 Updated Algorithm");
      console.log(" User 1 successfully updated their own snippet.");

      // User 1 deletes their own snippet -> 200
      const deleteRes = await fetch(`${baseUrl}/api/snippets/${snip1.id}`, {
        method: "DELETE",
        headers: { Cookie: cookie1 },
      });
      assert.strictEqual(deleteRes.status, 200);
      console.log(" User 1 successfully deleted their own snippet.");

      // User 1 logs out
      const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { Cookie: cookie1 },
      });
      assert.strictEqual(logoutRes.status, 200);
      const logoutData = await logoutRes.json();
      assert.strictEqual(logoutData.success, true);
      console.log(" User 1 logged out successfully.");
    } else {
      console.log(" Notice: No live MongoDB instance connected for database CRUD test.");
      console.log("   (Set DATABASE_URL in .env to run full database integration tests).");
    }

    console.log("\n======================================================");
    console.log(" ALL INTEGRATION & VERIFICATION TESTS PASSED!");
    console.log("======================================================\n");
    server.close();
    process.exit(0);
  } catch (err) {
    console.error(" Test failed with error:", err);
    server.close();
    process.exit(1);
  }
});
