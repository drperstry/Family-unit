import mongoose, { ConnectOptions } from 'mongoose';

/**
 * MongoDB Connection Module for Vercel Serverless Environment
 *
 * Best Practices implemented:
 * 1. Connection caching to reuse connections across serverless invocations
 * 2. Proper connection pooling for serverless (lower pool size)
 * 3. Connection timeout handling
 * 4. Graceful error handling with retries
 * 5. Connection state monitoring
 * 6. Support for MongoDB Atlas connection strings
 */

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local\n' +
    'For MongoDB Atlas: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority'
  );
}

/**
 * Global type declaration for caching the mongoose connection
 * This prevents creating multiple connections in serverless environments
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

// Use global cache to persist connection across hot reloads in development
// and across serverless function invocations in production
const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/**
 * MongoDB connection options optimized for Vercel serverless
 */
const connectionOptions: ConnectOptions = {
  // Buffering commands when disconnected can cause issues in serverless
  bufferCommands: false,

  // Reduced pool size for serverless (default is 100, which is too high)
  // Each serverless function instance gets its own pool
  maxPoolSize: 10,
  minPoolSize: 1,

  // Connection timeout settings
  serverSelectionTimeoutMS: 10000, // 10 seconds to find a server
  socketTimeoutMS: 45000, // 45 seconds for operations
  connectTimeoutMS: 10000, // 10 seconds to establish connection

  // Heartbeat settings for connection monitoring
  heartbeatFrequencyMS: 10000,

  // Auto index in development, disable in production for performance
  autoIndex: process.env.NODE_ENV !== 'production',

  // Retry writes for transient network errors (MongoDB Atlas)
  retryWrites: true,

  // Write concern for data safety
  w: 'majority',
};

/**
 * Validates MongoDB URI format
 */
function validateMongoURI(uri: string): boolean {
  const mongoURIPattern = /^mongodb(\+srv)?:\/\/.+/;
  return mongoURIPattern.test(uri);
}

/**
 * Connect to MongoDB with connection caching
 *
 * This function implements the singleton pattern to ensure
 * only one connection is created per serverless instance
 *
 * @returns Promise<typeof mongoose> - The mongoose instance
 * @throws Error if connection fails after retries
 */
export async function connectDB(): Promise<typeof mongoose> {
  // Return cached connection if available and connected
  if (cached.conn) {
    // Verify connection is still alive
    if (mongoose.connection.readyState === 1) {
      return cached.conn;
    }
    // Connection dropped, reset cache
    cached.conn = null;
    cached.promise = null;
  }

  // Validate URI before attempting connection
  if (!validateMongoURI(MONGODB_URI!)) {
    throw new Error(
      'Invalid MONGODB_URI format. Expected: mongodb:// or mongodb+srv://'
    );
  }

  // Create new connection promise if not exists
  if (!cached.promise) {
    const opts = { ...connectionOptions };

    // Log connection attempt (without sensitive data)
    const sanitizedURI = MONGODB_URI!.replace(/:\/\/[^@]+@/, '://<credentials>@');
    console.log(`[MongoDB] Connecting to: ${sanitizedURI}`);

    cached.promise = mongoose
      .connect(MONGODB_URI!, opts)
      .then((mongooseInstance) => {
        console.log('[MongoDB] Connected successfully');
        return mongooseInstance;
      })
      .catch((error) => {
        // Reset promise on failure to allow retry
        cached.promise = null;
        console.error('[MongoDB] Connection error:', error.message);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset cache on error
    cached.promise = null;
    cached.conn = null;
    throw error;
  }

  return cached.conn;
}

/**
 * Disconnect from MongoDB
 * Useful for cleanup in scripts or testing
 */
export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('[MongoDB] Disconnected');
  }
}

/**
 * Check if MongoDB is connected
 *
 * Connection states:
 * 0 = disconnected
 * 1 = connected
 * 2 = connecting
 * 3 = disconnecting
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Get connection state as string
 */
export function getConnectionState(): string {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
}

/**
 * Get database statistics
 * Useful for health checks and monitoring
 */
export async function getDBStats(): Promise<{
  connected: boolean;
  state: string;
  host: string | undefined;
  name: string | undefined;
}> {
  return {
    connected: isConnected(),
    state: getConnectionState(),
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
}

/**
 * Setup connection event handlers
 * Call this once during app initialization
 */
export function setupConnectionHandlers(): void {
  mongoose.connection.on('connected', () => {
    console.log('[MongoDB] Connection established');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('[MongoDB] Disconnected');
    // Reset cache on disconnect
    cached.conn = null;
    cached.promise = null;
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Reconnected');
  });

  // Handle process termination gracefully
  process.on('SIGINT', async () => {
    await disconnectDB();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await disconnectDB();
    process.exit(0);
  });
}

/**
 * Wrapper function to ensure DB connection before operations
 * Use this in API routes to guarantee connection
 *
 * @example
 * export async function GET(request: Request) {
 *   await withDB();
 *   const users = await User.find();
 *   return Response.json(users);
 * }
 */
export async function withDB<T>(
  operation?: () => Promise<T>
): Promise<T | typeof mongoose> {
  await connectDB();

  if (operation) {
    return operation();
  }

  return cached.conn!;
}

export default connectDB;
