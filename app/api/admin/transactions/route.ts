/**
 * GET /api/admin/transactions
 * Admin — list transactions with filters.
 */
import { auth } from '@/auth';
import { unauthorized, forbidden, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Transaction from '@/models/transaction.model';
import { Types } from 'mongoose';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const perms = (session.user as { permissions?: string[] }).permissions ?? [];
  if (!perms.includes('role:read:all')) return forbidden('Admin required');

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const status = searchParams.get('status') ?? '';
  const userId = searchParams.get('userId') ?? '';

  try {
    await connectDB();
    const filter: Record<string, unknown> = {};
    if (status && ['pending', 'completed', 'failed', 'cancelled'].includes(status)) filter.status = status;
    if (userId) filter.userId = new Types.ObjectId(userId);

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email')
        .populate('planId', 'name slug')
        .populate('voucherId', 'code type value')
        .lean(),
      Transaction.countDocuments(filter),
    ]);
    return ok('Transactions fetched', {
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return serverError(err);
  }
}
