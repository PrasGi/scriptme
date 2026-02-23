/**
 * lib/workers/analyze-worker.ts
 *
 * BullMQ worker for script analysis.
 * Run with: npm run worker:analyze
 */

import '../../scripts/load-env';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { connectDB } from '@/lib/db';
import Script from '@/models/script.model';
import AiChatLog from '@/models/ai-chat-log.model';
import { computeUsage } from '@/lib/ai-cost';
import { runAgent, createAiSession } from '@/lib/ai-agent';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import type { AnalyzeJobData } from '@/lib/queue';
import { ANALYZE_QUEUE_NAME } from '@/lib/queue';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

async function processAnalyzeJob(job: { data: AnalyzeJobData }) {
  const { scriptId, projectId, userId, scriptContent, characterContext } = job.data;

  await connectDB();

  const script = await Script.findOne({
    _id: scriptId,
    projectId,
    userId,
    deletedAt: null,
  });

  if (!script) {
    throw new Error('Script not found');
  }

  const sessionId = randomUUID();
  createAiSession(userId, sessionId);

  let fullResponse = '';

  const gen = runAgent({
    userId,
    sessionId,
    mode:              'analyze',
    message:           scriptContent,
    characterContext,
  });

  for await (const chunk of gen) {
    fullResponse += chunk;
  }

  try {
    const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const analyzeResult = JSON.parse(jsonMatch[0]);
      await Script.findByIdAndUpdate(scriptId, {
        $set: { analyzeResult, status: 'ready' },
      });
    } else {
      await Script.findByIdAndUpdate(scriptId, { $set: { status: 'draft' } });
    }
  } catch {
    await Script.findByIdAndUpdate(scriptId, { $set: { status: 'draft' } });
  }

  try {
    const usage = computeUsage(scriptContent, fullResponse);
    await AiChatLog.create({
      userId,
      sessionId,
      mode:      'analyze',
      message:   scriptContent,
      response:  fullResponse,
      projectId,
      scriptId,
      ...usage,
    });
    logger.info('AI analyze completed (worker)', {
      eventType: 'ai.usage',
      resource:  'ai',
      auth:      { userId },
      data:      { mode: 'analyze', projectId, scriptId },
    });
  } catch (dbErr) {
    logger.error('Failed to save AI chat log', { eventType: 'ai.usage.error', error: dbErr });
  }
}

const worker = new Worker<AnalyzeJobData>(
  ANALYZE_QUEUE_NAME,
  async (job) => {
    await processAnalyzeJob(job);
  },
  {
    // Cast: project ioredis and bullmq's bundled ioredis types differ
    connection: connection as never,
    concurrency: 1,
  }
);

worker.on('completed', (job) => {
  console.log(`[analyze-worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[analyze-worker] Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  console.error('[analyze-worker] Worker error:', err);
});

console.log('[analyze-worker] Worker started. Waiting for jobs...');
