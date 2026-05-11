// Mongoose connection helper.
// On Vercel each invocation may share a warm container; we cache the connection
// on globalThis so we don't open a new socket on every request.

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Surface this loudly at module load — easier to spot in Vercel logs
  // than getting a cryptic Mongoose error at first query time.
  throw new Error('MONGODB_URI is not defined. Set it in .env.local (local) and Vercel project Environment Variables (production).');
}

let cached = globalThis.__kpvMongoose;
if (!cached) {
  cached = globalThis.__kpvMongoose = { conn: null, promise: null };
}

export default async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000
      })
      .then((m) => m);
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
