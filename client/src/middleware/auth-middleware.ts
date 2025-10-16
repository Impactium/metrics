import { NextResponse, type NextRequest } from 'next/server';
import { Authorization, SERVER_SSR } from '../../constraints';

export async function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(Authorization);

  const isLoggedIn = token
    ? await fetch(`http://${SERVER_SSR}/api/auth/profile`, {
      method: 'GET',
      headers: {
        [Authorization]: token.value
      },
      next: { tags: ['profile'] }
    })
    .then(async response => {
      const payload = await response.json();
      return typeof payload.data.id !== 'undefined' && payload.data.email === 'ceo@impactium.dev';
    })
    .catch(_ => false)
    : false;

  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (isLoggedIn && pathname === '/auth/login') {
    return NextResponse.redirect(new URL('/dashboard/speedtest', req.url));
  }

  return NextResponse.next();
}
