import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that do NOT require authentication
const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '?')
  );

  if (!isPublic) {
    const accessToken = request.cookies.get('insurelead_access')?.value;
    const refreshToken = request.cookies.get('insurelead_refresh')?.value;

    if (!accessToken && !refreshToken) {
      return NextResponse.next();
    }

    if (!accessToken && refreshToken) {
      return NextResponse.next();
    }

    // Cryptographically verify JWT signature and expiration
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('PROXY: JWT_SECRET environment variable is not set');
      return NextResponse.next();
    }

    try {
      await jwtVerify(accessToken!, new TextEncoder().encode(secret));
    } catch {
      // If a refresh cookie exists, let the client restore the session in-app.
      if (refreshToken) {
        return NextResponse.next();
      }

      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match all pages except Next internals, static files, and /api
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\..*).*)'],
};
