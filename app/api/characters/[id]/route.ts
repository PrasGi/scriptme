import { auth } from '@/auth';
import { unauthorized, badRequest, notFound, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Character from '@/models/character.model';
import type { CharacterPlatform } from '@/models/character.model';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/characters/[id]
 * Get a single character.
 */
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  try {
    await connectDB();
    const character = await Character.findOne({
      _id:       id,
      userId:    session.user.id,
      deletedAt: null,
    }).lean();

    if (!character) return notFound('Character not found');
    return ok('Character fetched', character);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * PATCH /api/characters/[id]
 * Update a character.
 */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  let body: {
    name?:        string;
    description?: string;
    platform?:    CharacterPlatform;
    accentColor?: string;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  try {
    await connectDB();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.platform !== undefined) updates.platform = body.platform;
    if (body.accentColor !== undefined) updates.accentColor = body.accentColor;

    const character = await Character.findOneAndUpdate(
      { _id: id, userId: session.user.id, deletedAt: null },
      { $set: updates },
      { returnDocument: 'after' }
    ).lean();

    if (!character) return notFound('Character not found');
    return ok('Character updated', character);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * DELETE /api/characters/[id]
 * Soft-delete a character.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;

  try {
    await connectDB();
    const character = await Character.findOneAndUpdate(
      { _id: id, userId: session.user.id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { returnDocument: 'after' }
    ).lean();

    if (!character) return notFound('Character not found');
    return ok('Character deleted');
  } catch (err) {
    return serverError(err);
  }
}
