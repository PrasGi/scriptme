import { auth } from '@/auth';
import { unauthorized, forbidden, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import AiChatLog from '@/models/ai-chat-log.model';
import { computeUsage } from '@/lib/ai-cost';

/**
 * GET /api/admin/ai-usage
 * Admin-only: list all AI chat usage with pagination.
 * Query: page=1, limit=20, userId=..., mode=...
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const perms = session.user.permissions ?? [];
  if (!perms.includes('role:read:all')) return forbidden('Admin access required');

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const userId = searchParams.get('userId') ?? '';
  const mode   = searchParams.get('mode') ?? '';

  try {
    await connectDB();

    const filter: Record<string, unknown> = {};
    if (userId) filter.userId = userId;
    if (mode && ['generate', 'analyze', 'regenerate', 'chat'].includes(mode)) filter.mode = mode;

    const skip = (page - 1) * limit;

    const [rawLogs, total] = await Promise.all([
      AiChatLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email')
        .lean(),
      AiChatLog.countDocuments(filter),
    ]);

    const logs = rawLogs.map((log) => {
      let inputT  = log.inputTokens as number | undefined;
      let outputT = log.outputTokens as number | undefined;
      let cost    = log.costUsd as number | undefined;
      if (inputT == null || outputT == null || cost == null) {
        const usage = computeUsage((log.message as string) ?? '', (log.response as string) ?? '');
        inputT  = usage.inputTokens;
        outputT = usage.outputTokens;
        cost    = usage.costUsd;
      }
      return { ...log, inputTokens: inputT, outputTokens: outputT, totalTokens: inputT + outputT, costUsd: cost };
    });

    return ok('AI usage fetched', {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
