import { auth } from '@/auth';
import { unauthorized, badRequest, notFound, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import { decrementActionUsage } from '@/lib/subscription';
import Project from '@/models/project.model';
import Script from '@/models/script.model';
import type { ProjectPlatform, ProjectStatus } from '@/models/project.model';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/projects/[id]
 * Get a project and its scripts.
 */
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  try {
    await connectDB();
    const project = await Project.findOne({
      _id:       id,
      userId:    session.user.id,
      deletedAt: null,
    }).lean();

    if (!project) return notFound('Project not found');

    const scripts = await Script.find({
      projectId: id,
      userId:    session.user.id,
      deletedAt: null,
    }).sort({ updatedAt: -1 }).lean();

    return ok('Project fetched', { ...project, scripts });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * PATCH /api/projects/[id]
 * Update a project's fields.
 */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  let body: {
    title?:       string;
    description?: string;
    platform?:    ProjectPlatform;
    status?:      ProjectStatus;
    tags?:        string[];
  };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  try {
    await connectDB();
    const project = await Project.findOneAndUpdate(
      { _id: id, userId: session.user.id, deletedAt: null },
      {
        $set: {
          ...(body.title       !== undefined && { title:       body.title.trim() }),
          ...(body.description !== undefined && { description: body.description.trim() }),
          ...(body.platform    !== undefined && { platform:    body.platform }),
          ...(body.status      !== undefined && { status:      body.status }),
          ...(body.tags        !== undefined && { tags:        body.tags.map((t) => t.trim()).filter(Boolean) }),
        },
      },
      { new: true }
    ).lean();

    if (!project) return notFound('Project not found');
    return ok('Project updated', project);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * DELETE /api/projects/[id]
 * Soft-delete a project (and its scripts).
 */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  try {
    await connectDB();
    const project = await Project.findOneAndUpdate(
      { _id: id, userId: session.user.id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    ).lean();

    if (!project) return notFound('Project not found');

    const scriptCount = await Script.countDocuments({ projectId: id, deletedAt: null });
    await Script.updateMany(
      { projectId: id, deletedAt: null },
      { $set: { deletedAt: new Date() } }
    );
    if (scriptCount > 0) await decrementActionUsage(session.user.id, 'save', scriptCount);

    return ok('Project deleted');
  } catch (err) {
    return serverError(err);
  }
}
