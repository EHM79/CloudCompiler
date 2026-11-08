import mongoose from "mongoose";

// لو مفيش اتصال، الاستعلام يفشل فورًا بدل ما يستنى 10 ثواني
mongoose.set("bufferCommands", false);

let connectionPromise = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set in the environment variables");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(dbUrl, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 })
      .then((m) => {
        console.log(`[MongoDB] Connected successfully to: ${m.connection.name}`);
        return m.connection;
      })
      .catch((err) => {
        connectionPromise = null;
        console.error(`[MongoDB Error] Connection failed: ${err.message}`);
        throw err;
      });
  }

  return connectionPromise;
}
