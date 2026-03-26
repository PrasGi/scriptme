/**
 * GET /api/dashboard/stats
 * Returns aggregated stats for the current user.
 */
import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Project from '@/models/project.model';
import Script from '@/models/script.model';
import Character from '@/models/character.model';
import User from '@/models/user.model';
import { Types } from 'mongoose';
import { checkTokenLimit, getEffectivePlan } from '@/lib/subscription';

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  try {
    await connectDB();
    const uid = new Types.ObjectId(session.user.id);

    const [
      totalScripts,
      scriptsReady,
      charactersCloned,
      totalProjects,
      recentProjects,
      user,
      tokenData,
    ] = await Promise.all([
      Script.countDocuments({ userId: uid, deletedAt: null }),
      Script.countDocuments({ userId: uid, deletedAt: null, status: 'ready' }),
      Character.countDocuments({ userId: uid, deletedAt: null, sourceType: 'cloned' }),
      Project.countDocuments({ userId: uid, deletedAt: null }),
      Project.find({ userId: uid, deletedAt: null })
        .sort({ updatedAt: -1 })
        .limit(4)
        .lean(),
      User.findById(uid).select('name').lean(),
      (async () => {
        const plan = await getEffectivePlan(session.user.id);
        const result = await checkTokenLimit(session.user.id, plan, 0);
        return { used: result.used, limit: result.limit };
      })(),
    ]);

    const scriptCounts = await Promise.all(
      recentProjects.map((p) =>
        Script.countDocuments({ projectId: (p as { _id: Types.ObjectId })._id, userId: uid, deletedAt: null })
      )
    );

    const projectsWithScriptCount = recentProjects.map((p, i) => {
      const proj = p as { _id: Types.ObjectId; title: string; description?: string; status: string; platform?: string; updatedAt: Date };
      return {
        _id: proj._id.toString(),
        title: proj.title,
        description: proj.description ?? '',
        status: proj.status,
        platform: proj.platform ?? 'other',
        scripts: scriptCounts[i],
        updatedAt: timeAgo(new Date(proj.updatedAt)),
      };
    });

    return ok('Dashboard stats fetched', {
      totalScripts,
      scriptsReady,
      charactersCloned,
      totalProjects,
      tokenUsed: tokenData.used,
      tokenLimit: tokenData.limit,
      userName: (user as { name?: string } | null)?.name ?? 'Creator',
      recentProjects: projectsWithScriptCount,
    });
  } catch (err) {
    return serverError(err);
  }
}
