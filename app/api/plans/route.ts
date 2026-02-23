/**
 * GET /api/plans
 * Public — list active plans for LP and billing.
 */
import { ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Plan from '@/models/plan.model';

export async function GET() {
  try {
    await connectDB();
    const plans = await Plan.find({ isActive: true }).sort({ order: 1 }).lean();
    return ok('Plans fetched', plans);
  } catch (err) {
    return serverError(err);
  }
}
