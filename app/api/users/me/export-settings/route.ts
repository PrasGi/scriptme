import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, unauthorized, badRequest, serverError } from '@/lib/response';
import ExportSettings, { type ExportFormality } from '@/models/export-settings.model';

const FORMALITY_VALUES: ExportFormality[] = ['minimal', 'standard', 'formal'];

/** GET /api/users/me/export-settings — get current user's export settings */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  try {
    await connectDB();
    const doc = await ExportSettings.findOne({ userId: session.user.id }).lean();
    const data = doc
      ? {
          logoUrl:           doc.logoUrl ?? null,
          headerPlaceholder: doc.headerPlaceholder ?? null,
          footerPlaceholder: doc.footerPlaceholder ?? null,
          formality:         doc.formality ?? 'standard',
          companyName:       doc.companyName ?? null,
          tagline:           doc.tagline ?? null,
        }
      : {
          logoUrl:           null as string | null,
          headerPlaceholder: null as string | null,
          footerPlaceholder: null as string | null,
          formality:         'standard' as ExportFormality,
          companyName:       null as string | null,
          tagline:           null as string | null,
        };

    return ok('Export settings fetched', data);
  } catch (err) {
    logger.error('Failed to fetch export settings', { eventType: 'app.error', error: err });
    return serverError(err);
  }
}

/** PUT /api/users/me/export-settings — update current user's export settings */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  let body: {
    logoUrl?: string | null;
    headerPlaceholder?: string | null;
    footerPlaceholder?: string | null;
    formality?: string;
    companyName?: string | null;
    tagline?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const formality = body.formality != null ? String(body.formality).toLowerCase() : undefined;
  if (formality != null && !FORMALITY_VALUES.includes(formality as ExportFormality)) {
    return badRequest('formality must be minimal, standard, or formal');
  }

  try {
    await connectDB();
    const update: Record<string, unknown> = {
      logoUrl:           body.logoUrl ?? null,
      headerPlaceholder: body.headerPlaceholder ?? null,
      footerPlaceholder: body.footerPlaceholder ?? null,
      companyName:       body.companyName ?? null,
      tagline:           body.tagline ?? null,
    };
    if (formality != null) update.formality = formality;

    const doc = await ExportSettings.findOneAndUpdate(
      { userId: session.user.id },
      { $set: update },
      { returnDocument: 'after', upsert: true, runValidators: true }
    ).lean();

    return ok('Export settings saved', {
      logoUrl:           doc.logoUrl ?? null,
      headerPlaceholder: doc.headerPlaceholder ?? null,
      footerPlaceholder: doc.footerPlaceholder ?? null,
      formality:         doc.formality ?? 'standard',
      companyName:       doc.companyName ?? null,
      tagline:           doc.tagline ?? null,
    });
  } catch (err) {
    logger.error('Failed to save export settings', { eventType: 'app.error', error: err });
    return serverError(err);
  }
}
