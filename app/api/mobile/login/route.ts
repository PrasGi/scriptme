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
import { applyCorsHeaders, handleCorsPreflight, jsonWithCors } from '@/lib/cors';
import { connectDB } from '@/lib/db';
import User from '@/models/user.model';
import { getUserPermissions } from '@/lib/permissions';
import { needsSameSiteNoneForCredentialSharing, useSecureSessionCookies } from '@/lib/mobile-session-cookie';

const AUTH_SALT = 'authjs.session-token';

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonWithCors(req, { success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  if (!email || !password) {
    return jsonWithCors(req, { success: false, message: 'email and password required' }, { status: 400 });
  }

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    return jsonWithCors(req, { success: false, message: 'Server misconfigured' }, { status: 500 });
  }

  try {
    await connectDB();
    const user = await User.findOne({ email }).select('+password').populate('roleId').lean();
    if (!user) {
      return jsonWithCors(req, { success: false, message: 'Invalid email or password' }, { status: 401 });
    }
    if (!user.isActive) {
      return jsonWithCors(req, { success: false, message: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password ?? '');
    if (!valid) {
      return jsonWithCors(req, { success: false, message: 'Invalid email or password' }, { status: 401 });
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

    const useHttps = useSecureSessionCookies(req);
    const crossSite = needsSameSiteNoneForCredentialSharing(req);
    const useSameSiteNone = crossSite && useHttps;
    const sameSite: 'lax' | 'none' = useSameSiteNone ? 'none' : 'lax';
    const secure = useSameSiteNone ? true : useHttps;
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';

    const data: {
      id: string;
      name: string;
      email: string;
      roleName: string;
      sessionToken?: string;
    } = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      roleName,
    };
    // Flutter web: browsers may block cross-site cookies; client sends Authorization Bearer instead.
    if (req.headers.get('origin')) {
      data.sessionToken = jwt;
    }

    const res = NextResponse.json({
      success: true,
      message: 'Signed in',
      data,
    });

    applyCorsHeaders(req, res);

    res.cookies.set(cookieName, jwt, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    // #region agent log
    fetch('http://127.0.0.1:7444/ingest/c52b058c-998f-46c8-a602-4c73a0ed7fc0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd82dd' },
      body: JSON.stringify({
        sessionId: 'dd82dd',
        location: 'app/api/mobile/login/route.ts:POST',
        message: 'mobile login Set-Cookie',
        data: {
          cookieName,
          secure,
          sameSite,
          crossSite,
          origin: req.headers.get('origin') ?? '',
          hypothesisId: 'H5',
        },
        timestamp: Date.now(),
        hypothesisId: 'H5',
      }),
    }).catch(() => {});
    // #endregion

    return res;
  } catch (err) {
    console.error('[mobile/login]', err);
    return jsonWithCors(req, { success: false, message: 'Sign-in failed' }, { status: 500 });
  }
}
