import { auth } from '@/auth';
import { unauthorized, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Project from '@/models/project.model';
import Script from '@/models/script.model';
import Character from '@/models/character.model';
import mongoose from 'mongoose';

/**
 * GET /api/search?q=...
 * Search projects, scripts, and characters (scoped to own data unless admin).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return ok('Search results', { projects: [], scripts: [], characters: [] });
  }

  const perms = session.user.permissions ?? [];
  const canReadAllProjects = perms.includes('project:read:all');
  const canReadAllCharacters = perms.includes('character:read:all');

  const userId = new mongoose.Types.ObjectId(session.user.id);
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  try {
    await connectDB();

    const [projects, scripts, characters] = await Promise.all([
      // Projects
      Project.find({
        deletedAt: null,
        ...(canReadAllProjects ? {} : { userId }),
        $or: [
          { title: regex },
          { description: regex },
        ],
      })
        .limit(5)
        .select('_id title projectId')
        .lean(),

      // Scripts (title or plainText)
      Script.aggregate([
        { $match: { deletedAt: null } },
        ...(canReadAllProjects ? [] : [{ $match: { userId } }]),
        {
          $lookup: {
            from: 'projects',
            localField: 'projectId',
            foreignField: '_id',
            as: 'proj',
          },
        },
        { $unwind: '$proj' },
        {
          $match: {
            $or: [
              { title: regex },
              { plainText: regex },
            ],
          },
        },
        { $limit: 5 },
        {
          $project: {
            _id: 1,
            title: 1,
            projectId: 1,
          },
        },
      ]),

      // Characters
      Character.find({
        deletedAt: null,
        ...(canReadAllCharacters ? {} : { userId }),
        $or: [
          { name: regex },
          { description: regex },
        ],
      })
        .limit(5)
        .select('_id name')
        .lean(),
    ]);

    return ok('Search results', {
      projects: projects.map((p) => ({
        _id: p._id.toString(),
        title: p.title,
        href: `/projects/${p._id}`,
        type: 'project',
      })),
      scripts: scripts.map((s) => ({
        _id: s._id.toString(),
        title: s.title,
        projectId: s.projectId.toString(),
        href: `/projects/${s.projectId}/scripts/${s._id}`,
        type: 'script',
      })),
      characters: characters.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
        href: `/characters/${c._id}/edit`,
        type: 'character',
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
