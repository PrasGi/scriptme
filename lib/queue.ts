/**
 * lib/queue.ts
 *
 * BullMQ queue for background jobs.
 * Requires REDIS_URL in environment.
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export interface AnalyzeJobData {
  scriptId:         string;
  projectId:        string;
  userId:           string;
  scriptContent:    string;
  characterContext?: string;
}

export const ANALYZE_QUEUE_NAME = 'script-analyze';

let _connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!_connection) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    _connection = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return _connection;
}

let _analyzeQueue: Queue<AnalyzeJobData> | null = null;

export function getAnalyzeQueue(): Queue<AnalyzeJobData> {
  if (!_analyzeQueue) {
    _analyzeQueue = new Queue(ANALYZE_QUEUE_NAME, {
      // Cast: project ioredis and bullmq's bundled ioredis types differ
      connection: getConnection() as never,
      defaultJobOptions: {
        attempts:         2,
        backoff:          { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
      },
    }) as Queue<AnalyzeJobData>;
  }
  return _analyzeQueue;
}
