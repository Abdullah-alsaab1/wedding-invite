import { NextResponse } from 'next/server';

const ADMIN_USER = process.env.ADMIN_USER || 'king';
const ADMIN_PASS = process.env.ADMIN_PASS || 'king2026';

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  const auth = req.headers.get('authorization');
  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic') {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(':');
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Admin Area"',
    },
  });
}

export const config = {
  matcher: ['/admin.html', '/admin/:path*'],
};
