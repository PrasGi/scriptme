/**
 * GET /api/billing/transactions
 * Returns transaction history for the user.
 */
import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Transaction from '@/models/transaction.model';
import { Types } from 'mongoose';

export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

  try {
    await connectDB();
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      Transaction.find({ userId: new Types.ObjectId(session.user.id) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('planId', 'name slug')
        .lean(),
      Transaction.countDocuments({ userId: new Types.ObjectId(session.user.id) }),
    ]);
    return ok('Transactions fetched', {
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return serverError(err);
  }
}
