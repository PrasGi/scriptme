import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { connectDB } from '@/lib/db';
import User from '@/models/user.model';
import Role from '@/models/role.model';
import { getUserPermissions } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { Types } from 'mongoose';

const config: NextAuthConfig = {
  trustHost: true, // required when behind reverse proxy (e.g. Nginx at scriptme.cloud)
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith('https://') ?? true,
  // Must match getToken() in middleware (NEXTAUTH_SECRET || AUTH_SECRET)
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    // ─── Credentials (email + password) ─────────────────────────────────────
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            logger.warn('Credentials authorize: missing email or password', { eventType: 'auth.login.failed' });
            return null;
          }

          await connectDB();

          const email = (credentials.email as string).trim().toLowerCase();
          const user = await User.findOne({ email })
            .select('+password')
            .populate('roleId')
            .lean();

          if (!user) {
            logger.warn('Credentials authorize: user not found', { eventType: 'auth.login.failed', metadata: { email } });
            return null;
          }
          if (!user.isActive) {
            logger.warn('Credentials authorize: user inactive', { eventType: 'auth.login.failed', metadata: { email } });
            return null;
          }

          const bcrypt = await import('bcryptjs');
          const valid = await bcrypt.compare(
            credentials.password as string,
            user.password ?? ''
          );
          if (!valid) {
            logger.warn('Credentials authorize: invalid password', { eventType: 'auth.login.failed', metadata: { email } });
            return null;
          }

          const populated = user.roleId as unknown as { _id: Types.ObjectId; name: string };
          const roleId    = populated?._id?.toString() ?? '';
          const roleName  = populated?.name ?? 'creator';

          return {
            id:       user._id.toString(),
            name:     user.name,
            email:    user.email,
            image:    user.image ?? null,
            roleId,
            roleName,
          };
        } catch (err) {
          logger.error('Credentials authorize failed', {
            eventType: 'auth.login.failed',
            error: err,
          });
          return null;
        }
      },
    }),

    // ─── Google OAuth ────────────────────────────────────────────────────────
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),

    // ─── GitHub OAuth ────────────────────────────────────────────────────────
    GitHub({
      clientId:     process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
  ],

  session: { strategy: 'jwt' },

  pages: {
    signIn:  '/login',
    signOut: '/login',
    error:   '/login',
  },

  callbacks: {
    // ─── OAuth sign-in: find-or-create user in MongoDB ──────────────────────
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') return true;

      try {
        await connectDB();

        const defaultRole = await Role.findOne({ isDefault: true }).lean();
        if (!defaultRole) {
          logger.error('OAuth signIn: no default role in DB (run seed?)', { eventType: 'auth.oauth.failed', provider: account?.provider });
          return false;
        }

        const field = account?.provider === 'google' ? 'googleId' : 'githubId';

        let dbUser = await User.findOne({ email: user.email! }).lean();

        if (!dbUser) {
          dbUser = await User.create({
            name:          user.name ?? user.email!.split('@')[0],
            email:         user.email!,
            image:         user.image ?? undefined,
            [field]:       user.id,
            roleId:        defaultRole._id,
            emailVerified: new Date(),
          });
        } else if (!dbUser[field as keyof typeof dbUser]) {
          await User.findByIdAndUpdate(dbUser._id, {
            $set: { [field]: user.id, image: user.image ?? dbUser.image },
          });
        }

        // Resolve role from DB (existing users may have non-default role)
        const roleId = (dbUser as { roleId?: Types.ObjectId }).roleId ?? defaultRole._id;
        const role = await Role.findById(roleId).lean();
        if (!role) {
          logger.error('OAuth signIn: user role not found', { eventType: 'auth.oauth.failed', roleId: String(roleId) });
          return false;
        }

        // Inject custom fields so jwt callback can read them
        user.id       = (dbUser as { _id: Types.ObjectId })._id.toString();
        user.roleId   = role._id.toString();
        user.roleName = role.name;
        return true;
      } catch (err) {
        logger.error('OAuth signIn callback error', { eventType: 'auth.oauth.failed', error: err, provider: account?.provider });
        return false;
      }
    },

    // ─── JWT: embed user metadata + permissions ──────────────────────────────
    async jwt({ token, user }) {
      if (user) {
        // First login — populate identity fields from the authorize/signIn result
        token.id       = user.id!;
        token.roleId   = (user as { roleId?: string }).roleId ?? '';
        token.roleName = (user as { roleName?: string }).roleName ?? 'creator';
      }

      // Refresh permissions only when we have valid id and roleId (avoid ObjectId('') throw)
      const userId = token.id as string | undefined;
      const roleId = token.roleId as string | undefined;
      if (userId && roleId) {
        try {
          const perms = await getUserPermissions(userId, roleId);
          token.permissions = perms.map((p) => `${p.resource}:${p.action}:${p.scope}`);
        } catch (err) {
          console.error('[auth] Failed to load permissions into JWT:', err);
          logger.error('Failed to load permissions into JWT', {
            eventType: 'auth.session.error',
            auth: { userId },
            error: err,
          });
          token.permissions = (token.permissions as string[]) ?? [];
        }
      } else {
        token.permissions = (token.permissions as string[]) ?? [];
      }

      return token;
    },

    // ─── Session: expose safe fields to client ───────────────────────────────
    async session({ session, token }) {
      session.user.id          = token.id as string;
      session.user.roleId      = token.roleId as string;
      session.user.roleName    = token.roleName as string;
      session.user.permissions = token.permissions as string[];
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
