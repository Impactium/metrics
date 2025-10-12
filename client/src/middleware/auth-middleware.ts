import { NextResponse, type NextRequest } from 'next/server';

const Authorization = 'Authorization'

export async function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(Authorization);

  const isLoggedIn = token ? await fetch('http://localhost:1337/api/auth/profile', {
    method: 'GET',
    headers: {
      [Authorization]: token.value
    },
    next: { tags: ['profile'] }
  }).then(response => response.json().then(payload => typeof payload.data.id !== 'undefined' && payload.data.email === 'ceo@impactium.dev')) : false;

  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (isLoggedIn && pathname === '/auth/login') {
    return NextResponse.redirect(new URL('/dashboard/speedtest', req.url));
  }

  return NextResponse.next();
}
