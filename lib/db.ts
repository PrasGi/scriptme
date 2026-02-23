import mongoose from 'mongoose';
import { logger } from '@/lib/logger';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Reuse cached connection in dev (hot-reload friendly)
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => {
        logger.info('Database connected', { eventType: 'db.connected', metadata: { uri: MONGODB_URI.replace(/:([^@]+)@/, ':***@') } });
        return m;
      })
      .catch((err) => {
        logger.error('Database connection failed', { eventType: 'db.error', error: err });
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
