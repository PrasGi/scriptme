/**
 * POST /api/mobile/login
 * JSON body: { email, password }
 * On success: sets the same Auth.js session cookie as web login (JWT strategy).
 * Used by the Flutter app (cookie jar); same backend auth as /login credentials.
 */
import { NextRequest, NextResponse } from 'next/server';
import { encode } from '@auth/core/jwt';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import User from '@/models/user.model';
import { getUserPermissions } from '@/lib/permissions';

const AUTH_SALT = 'authjs.session-token';

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  if (!email || !password) {
    return NextResponse.json({ success: false, message: 'email and password required' }, { status: 400 });
  }

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ success: false, message: 'Server misconfigured' }, { status: 500 });
  }

  try {
    await connectDB();
    const user = await User.findOne({ email }).select('+password').populate('roleId').lean();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password ?? '');
    if (!valid) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }

    const populated = user.roleId as unknown as { _id: Types.ObjectId; name: string };
    const roleId = populated?._id?.toString() ?? '';
    const roleName = populated?.name ?? 'creator';

    const perms = await getUserPermissions(user._id.toString(), roleId);
    const permissions = perms.map((p) => `${p.resource}:${p.action}:${p.scope}`);

    const jwt = await encode({
      secret,
      salt: AUTH_SALT,
      maxAge: 30 * 24 * 60 * 60,
      token: {
        name: user.name,
        email: user.email,
        picture: user.image ?? null,
        sub: user._id.toString(),
        id: user._id.toString(),
        roleId,
        roleName,
        permissions,
      },
    });

    const useHttps =
      process.env.NEXTAUTH_URL?.startsWith('https://') ??
      (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production');
    const cookieName = useHttps ? '__Secure-authjs.session-token' : 'authjs.session-token';

    const res = NextResponse.json({
      success: true,
      message: 'Signed in',
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        roleName,
      },
    });

    res.cookies.set(cookieName, jwt, {
      httpOnly: true,
      secure: useHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (err) {
    console.error('[mobile/login]', err);
    return NextResponse.json({ success: false, message: 'Sign-in failed' }, { status: 500 });
  }
}
