import { auth } from '@/auth';
import { unauthorized, badRequest, created, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Character from '@/models/character.model';
import type { CharacterPlatform } from '@/models/character.model';

/**
 * GET /api/characters
 * List all active characters for the authenticated user.
 * Query: sourceType=cloned|custom (optional)
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { searchParams } = new URL(req.url);
  const sourceType = searchParams.get('sourceType');

  try {
    await connectDB();
    const filter: Record<string, unknown> = {
      userId:    session.user.id,
      deletedAt: null,
    };
    if (sourceType === 'cloned' || sourceType === 'custom') {
      filter.sourceType = sourceType;
    }

    const characters = await Character.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    return ok('Characters fetched', characters);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/characters
 * Create a custom character.
 * Body: { name, description, platform?, accentColor? }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

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

  const { name, description = '', platform = 'custom', accentColor = '#06B6D4' } = body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return badRequest('name is required');
  }

  try {
    await connectDB();
    const character = await Character.create({
      userId:      session.user.id,
      name:        name.trim(),
      description: description.trim(),
      platform,
      sourceType:  'custom',
      accentColor: typeof accentColor === 'string' ? accentColor : '#06B6D4',
    });

    return created('Character created', character.toObject());
  } catch (err) {
    return serverError(err);
  }
}
