import { auth } from '@/auth';
import { unauthorized, badRequest, notFound, created, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Project from '@/models/project.model';
import Script from '@/models/script.model';
import type { ScriptLine, ScriptSourceType } from '@/models/script.model';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/projects/[id]/scripts
 * Create a new script inside a project.
 */
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id: projectId } = await params;

  let body: {
    title?:          string;
    sourceType?:     ScriptSourceType;
    sourceTiktokUrl?: string;
    lines?:          ScriptLine[];
    plainText?:      string;
    characterId?:    string | null;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { title, sourceType = 'manual', sourceTiktokUrl = '', lines = [], plainText = '', characterId = null } = body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return badRequest('title is required');
  }

  try {
    await connectDB();

    // Verify project ownership
    const project = await Project.findOne({
      _id:       projectId,
      userId:    session.user.id,
      deletedAt: null,
    }).lean();
    if (!project) return notFound('Project not found');

    const script = await Script.create({
      projectId,
      userId:    session.user.id,
      title:     title.trim(),
      sourceType,
      sourceTiktokUrl,
      lines,
      plainText,
      characterId: characterId ?? null,
    });

    return created('Script created', script.toObject());
  } catch (err) {
    return serverError(err);
  }
}
