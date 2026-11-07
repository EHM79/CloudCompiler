import mongoose from "mongoose";

let connectionPromise = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.warn("[MongoDB Warning] DATABASE_URL is not set. Please set DATABASE_URL in the deployment environment.");
    return null;
  }

  // Reuse one in-flight connection attempt across concurrent serverless requests.
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(dbUrl)
      .then((conn) => {
        console.log(`[MongoDB] Connected successfully to: ${conn.connection.name}`);
        return conn;
      })
      .catch((err) => {
        connectionPromise = null;
        console.error(`[MongoDB Error] Connection failed: ${err.message}`);
        return null;
      });
  }

  return connectionPromise;
}
