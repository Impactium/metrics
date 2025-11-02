import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from './middleware/auth-middleware';

export async function proxy(request: NextRequest) {
  // Unauthorized cannot must login
  const { response, user } = await authMiddleware(request);
  if (response) {
    return response;
  }

  // Unverified users must wait & has permission to see module
  if (user && request.url.includes('/dashboard')) {
    const module = request.url.split('/').pop();
    if (!user.verified || !user.permissions.allowed.includes(module)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  if (request.url.includes('/unauthorized')) {
    return NextResponse.redirect(new URL(`/dashboard/${user.permissions.allowed[0]}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/login', '/unauthorized'],
};
