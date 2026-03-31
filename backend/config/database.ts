import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Global connection cache — required in serverless environments (Netlify
// Functions / Next.js API routes) where the Node process is reused across
// requests but module scope is NOT guaranteed to persist between cold starts.
// ---------------------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null };
}

const cached = global._mongooseCache;

export async function connectDB(): Promise<typeof mongoose> {
  // ── Validate env var at RUNTIME (not module load) so Next.js static
  //    analysis during `next build` doesn't throw and kill the Netlify build.
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not defined.\n' +
      'Add it to Netlify → Site Settings → Environment Variables.\n' +
      'Format: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority'
    );
  }

  // Return existing connection immediately (warm invocation)
  if (cached.conn) {
    return cached.conn;
  }

  // Start a new connection if none is pending
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        // --- serverless-safe options ---
        bufferCommands: false,       // Fail fast instead of buffering operations
        maxPoolSize: 10,             // Keep open up to 10 sockets per Netlify function
        minPoolSize: 1,
        socketTimeoutMS: 45_000,     // Close sockets after 45 s of inactivity
        serverSelectionTimeoutMS: 10_000, // Give Atlas 10 s to respond on cold start
        heartbeatFrequencyMS: 10_000,
        // Stable API so driver behaviour won't change with Atlas upgrades
        serverApi: { version: '1', strict: true, deprecationErrors: true },
      })
      .then((m) => {
        console.log('✅  MongoDB Atlas connected');
        return m;
      })
      .catch((err) => {
        // Reset so the next request can retry
        cached.promise = null;
        console.error('❌  MongoDB connection error:', err.message);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('MongoDB disconnected');
  }
}
