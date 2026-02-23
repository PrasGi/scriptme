import { auth } from '@/auth';
import { unauthorized, badRequest, created, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Project from '@/models/project.model';
import type { ProjectPlatform } from '@/models/project.model';

/**
 * GET /api/projects
 * List all active projects for the authenticated user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  try {
    await connectDB();
    const projects = await Project.find({
      userId:    session.user.id,
      deletedAt: null,
    }).sort({ updatedAt: -1 }).lean();

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

  try {
    await connectDB();
    const project = await Project.create({
      userId:      session.user.id,
      title:       title.trim(),
      description: description.trim(),
      platform,
      tags:        tags.map((t) => t.trim()).filter(Boolean),
    });

    return created('Project created', project.toObject());
  } catch (err) {
    return serverError(err);
  }
}
