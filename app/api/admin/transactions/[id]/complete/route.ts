/**
 * POST /api/admin/transactions/[id]/complete
 * Admin — set transaction completed, grant subscription, increment voucher usage.
 */
import { auth } from '@/auth';
import { unauthorized, forbidden, ok, notFound, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Transaction from '@/models/transaction.model';
import Voucher from '@/models/voucher.model';
import { grantSubscription } from '@/lib/subscription';
import { Types } from 'mongoose';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const perms = (session.user as { permissions?: string[] }).permissions ?? [];
  if (!perms.includes('role:read:all')) return forbidden('Admin required');

  const { id } = await params;

  try {
    await connectDB();
    const tx = await Transaction.findById(id).populate('planId').lean();
    if (!tx) return notFound('Transaction not found');
    if (tx.status !== 'pending') {
      return unauthorized('Transaction is not pending');
    }

    const userId = (tx.userId as unknown as { _id: Types.ObjectId })._id ?? tx.userId;
    const planId = (tx.planId as unknown as { _id: Types.ObjectId })._id ?? tx.planId;
    const months = tx.months;
    const durationDays = months * 30; // grantSubscription expects days

    await grantSubscription(userId, planId, durationDays, 'purchase', id);

    await Transaction.findByIdAndUpdate(id, {
      status: 'completed',
      completedAt: new Date(),
      completedBy: new Types.ObjectId(session.user.id),
    });

    if (tx.voucherId) {
      await Voucher.findByIdAndUpdate(tx.voucherId, { $inc: { usageCount: 1 } });
    }

    return ok('Transaction completed, subscription granted');
  } catch (err) {
    return serverError(err);
  }
}
