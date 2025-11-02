import { NextResponse, type NextRequest } from 'next/server';
import { Authorization, SERVER_SSR } from '../../constraints';

export async function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(Authorization);

  const user = token
    ? await fetch(`http://${SERVER_SSR}/api/auth/profile`, {
      method: 'GET',
      headers: {
        [Authorization]: token.value
      },
      next: { tags: ['profile'] }
    })
      .then(async response => {
        const payload = await response.json();
        return payload.data
      })
      .catch(_ => null)
    : null;

  const isLoggedIn = user && typeof user.id !== 'undefined';

  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    return { response: NextResponse.redirect(new URL('/auth/login', req.url)), user };
  }

  if (isLoggedIn && !user.verified) {
    return { response: NextResponse.redirect(new URL(`/unauthorized`, req.url)), user };
  }

  if (isLoggedIn && pathname === '/auth/login') {
    return { response: NextResponse.redirect(new URL(`/dashboard/${user.permissions.allowed[0]}`, req.url)), user };
  }

  return { response: null, user };
}
