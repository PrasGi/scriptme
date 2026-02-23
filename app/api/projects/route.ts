import { auth } from '@/auth';
import { unauthorized, badRequest, created, forbidden, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Project from '@/models/project.model';
import { checkActionLimit, incrementActionUsage } from '@/lib/subscription';
import type { ProjectPlatform } from '@/models/project.model';

/**
 * GET /api/projects
 * List all active projects for the authenticated user, with script count per project.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  try {
    await connectDB();
    const userId = session.user.id;
    const projects = await Project.aggregate([
      { $match: { userId: new (await import('mongoose')).Types.ObjectId(userId), deletedAt: null } },
      {
        $lookup: {
          from:         'scripts',
          let:          { pid: '$_id' },
          pipeline:    [
            { $match: { $expr: { $eq: ['$projectId', '$$pid'] }, deletedAt: null } },
            { $count: 'count' },
          ],
          as:           'scriptCountArr',
        },
      },
      {
        $addFields: {
          scriptCount: { $ifNull: [{ $arrayElemAt: ['$scriptCountArr.count', 0] }, 0] },
        },
      },
      { $project: { scriptCountArr: 0 } },
      { $sort: { updatedAt: -1 } },
    ]);

    return ok('Projects fetched', projects);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/projects
 * Create a new project.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  let body: { title?: string; description?: string; platform?: ProjectPlatform; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { title, description = '', platform = 'other', tags = [] } = body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return badRequest('title is required');
  }

  const projectLimitCheck = await checkActionLimit(session.user.id, 'project_create');
  if (!projectLimitCheck.allowed) {
    return forbidden('Monthly limit for create project reached. Upgrade or wait until next month.');
  }

  try {
    await connectDB();
    const project = await Project.create({
      userId:      session.user.id,
      title:       title.trim(),
      description: description.trim(),
      platform,
      tags:        tags.map((t) => t.trim()).filter(Boolean),
    });

    await incrementActionUsage(session.user.id, 'project_create');
    return created('Project created', project.toObject());
  } catch (err) {
    return serverError(err);
  }
}
