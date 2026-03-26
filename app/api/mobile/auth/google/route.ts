/**
 * POST /api/mobile/auth/google
 * JSON body: { idToken: string } — Google ID token from the Flutter / native client.
 * Verifies the token with Google, syncs user (same rules as web Google OAuth), sets Auth.js session cookie.
 */
import { NextRequest, NextResponse } from 'next/server';
import { encode } from '@auth/core/jwt';
import { OAuth2Client } from 'google-auth-library';
import { applyCorsHeaders, handleCorsPreflight, jsonWithCors } from '@/lib/cors';
import { getUserPermissions } from '@/lib/permissions';
import { syncGoogleUserFromGoogleAccount } from '@/lib/sync-google-oauth-user';
import { needsSameSiteNoneForCredentialSharing, useSecureSessionCookies } from '@/lib/mobile-session-cookie';

const AUTH_SALT = 'authjs.session-token';

function googleAudiences(): string[] {
  const ids = [
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_ANDROID_CLIENT_ID,
    process.env.AUTH_GOOGLE_IOS_CLIENT_ID,
  ].filter((x): x is string => Boolean(x?.trim()));
  return ids;
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function POST(req: NextRequest) {
  let body: { idToken?: string };
  try {
    body = await req.json();
  } catch {
    return jsonWithCors(req, { success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const idToken = (body.idToken ?? '').trim();
  if (!idToken) {
    return jsonWithCors(req, { success: false, message: 'idToken required' }, { status: 400 });
  }

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    return jsonWithCors(req, { success: false, message: 'Server misconfigured' }, { status: 500 });
  }

  const audiences = googleAudiences();
  if (audiences.length === 0) {
    return jsonWithCors(req, { success: false, message: 'Google OAuth not configured (AUTH_GOOGLE_ID)' }, { status: 503 });
  }

  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: audiences,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      return jsonWithCors(req, { success: false, message: 'Invalid Google token' }, { status: 401 });
    }
    if (payload.email_verified === false) {
      return jsonWithCors(req, { success: false, message: 'Email not verified with Google' }, { status: 401 });
    }

    let user;
    try {
      user = await syncGoogleUserFromGoogleAccount({
        googleId: payload.sub,
        email:    payload.email,
        name:     payload.name,
        image:    payload.picture,
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'USER_INACTIVE' || code === 'USER_DELETED') {
        return jsonWithCors(req, { success: false, message: 'Account is not available' }, { status: 403 });
      }
      if (code === 'NO_DEFAULT_ROLE' || code === 'USER_ROLE_MISSING') {
        console.error('[mobile/auth/google]', err);
        return jsonWithCors(req, { success: false, message: 'Sign-in failed' }, { status: 500 });
      }
      throw err;
    }

    const perms = await getUserPermissions(user.id, user.roleId);
    const permissions = perms.map((p) => `${p.resource}:${p.action}:${p.scope}`);

    const jwt = await encode({
      secret,
      salt: AUTH_SALT,
      maxAge: 30 * 24 * 60 * 60,
      token: {
        name: user.name,
        email: user.email,
        picture: user.image,
        sub: user.id,
        id: user.id,
        roleId: user.roleId,
        roleName: user.roleName,
        permissions,
      },
    });

    const useHttps = useSecureSessionCookies(req);
    const crossSite = needsSameSiteNoneForCredentialSharing(req);
    const useSameSiteNone = crossSite && useHttps;
    const sameSite: 'lax' | 'none' = useSameSiteNone ? 'none' : 'lax';
    const secure = useSameSiteNone ? true : useHttps;
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';

    const res = NextResponse.json({
      success: true,
      message: 'Signed in',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleName: user.roleName,
      },
    });

    applyCorsHeaders(req, res);

    res.cookies.set(cookieName, jwt, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (err) {
    console.error('[mobile/auth/google]', err);
    return jsonWithCors(req, { success: false, message: 'Google sign-in failed' }, { status: 401 });
  }
}
