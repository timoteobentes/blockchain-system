import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/dashboard', '/products', '/admin'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('selva_token')?.value;
  const isProtected = PROTECTED.some(p => request.nextUrl.pathname.startsWith(p));
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/products/:path*', '/admin/:path*'] };
