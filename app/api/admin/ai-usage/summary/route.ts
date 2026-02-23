import { auth } from '@/auth';
import { unauthorized, forbidden, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import AiChatLog from '@/models/ai-chat-log.model';
import { computeUsage } from '@/lib/ai-cost';

/**
 * GET /api/admin/ai-usage/summary
 * Admin-only: aggregate token usage and cost with filters.
 * Query: startDate=YYYY-MM-DD, endDate=YYYY-MM-DD, mode=..., userId=...
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const perms = session.user.permissions ?? [];
  if (!perms.includes('role:read:all')) return forbidden('Admin access required');

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate') ?? '';
  const endDate   = searchParams.get('endDate') ?? '';
  const mode      = searchParams.get('mode') ?? '';
  const userId    = searchParams.get('userId') ?? '';

  try {
    await connectDB();

    const filter: Record<string, unknown> = {};
    if (userId) filter.userId = userId;
    if (mode && ['generate', 'analyze', 'regenerate', 'chat'].includes(mode)) filter.mode = mode;

    if (startDate || endDate) {
      filter.createdAt = {} as Record<string, Date>;
      if (startDate) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (filter.createdAt as Record<string, Date>).$lte = end;
      }
    }

    const logs = await AiChatLog.find(filter)
      .select('inputTokens outputTokens totalTokens costUsd message response')
      .lean();

    let totalInput  = 0;
    let totalOutput = 0;
    let totalCost   = 0;

    for (const log of logs) {
      let inputT  = log.inputTokens;
      let outputT = log.outputTokens;
      let cost    = log.costUsd;

      // Fallback for older logs without stored token/cost
      if (inputT == null || outputT == null || cost == null) {
        const usage = computeUsage(log.message ?? '', log.response ?? '');
        inputT  = usage.inputTokens;
        outputT = usage.outputTokens;
        cost    = usage.costUsd;
      }

      totalInput  += inputT;
      totalOutput += outputT;
      totalCost   += cost;
    }

    return ok('Summary fetched', {
      summary: {
        totalRequests: logs.length,
        totalInputTokens:  totalInput,
        totalOutputTokens: totalOutput,
        totalTokens:       totalInput + totalOutput,
        totalCostUsd:      Math.round(totalCost * 1e6) / 1e6,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
