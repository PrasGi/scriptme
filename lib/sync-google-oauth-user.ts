/**
 * Shared find-or-create / link logic for Google sign-in (mirrors auth.ts OAuth signIn callback).
 */
import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import User from '@/models/user.model';
import Role from '@/models/role.model';

export type SyncedGoogleUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  roleId: string;
  roleName: string;
};

export async function syncGoogleUserFromGoogleAccount(params: {
  googleId: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<SyncedGoogleUser> {
  await connectDB();

  const defaultRole = await Role.findOne({ isDefault: true }).lean();
  if (!defaultRole) {
    throw new Error('NO_DEFAULT_ROLE');
  }

  const email = params.email.trim().toLowerCase();
  const field = 'googleId' as const;

  let dbUser = await User.findOne({ email }).lean();

  if (!dbUser) {
    dbUser = await User.create({
      name:          params.name ?? email.split('@')[0],
      email,
      image:         params.image ?? undefined,
      [field]:       params.googleId,
      roleId:        defaultRole._id,
      emailVerified: new Date(),
    });
  } else if (!(dbUser as unknown as Record<string, unknown>)[field]) {
    await User.findByIdAndUpdate(dbUser._id, {
      $set: {
        [field]: params.googleId,
        image: params.image ?? (dbUser as { image?: string }).image,
      },
    });
    dbUser = (await User.findById(dbUser._id).lean()) ?? dbUser;
  }

  if (!(dbUser as { isActive?: boolean }).isActive) {
    throw new Error('USER_INACTIVE');
  }
  if ((dbUser as { deletedAt?: Date | null }).deletedAt) {
    throw new Error('USER_DELETED');
  }

  const roleId = (dbUser as { roleId?: Types.ObjectId }).roleId ?? defaultRole._id;
  const role = await Role.findById(roleId).lean();
  if (!role) {
    throw new Error('USER_ROLE_MISSING');
  }

  return {
    id:       (dbUser as { _id: Types.ObjectId })._id.toString(),
    name:     (dbUser as { name: string }).name,
    email:    (dbUser as { email: string }).email,
    image:    (dbUser as { image?: string }).image ?? null,
    roleId:   role._id.toString(),
    roleName: role.name,
  };
}
