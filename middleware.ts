import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

export async function middleware(request: NextRequest) {
  // Get token from cookies
  const token = request.cookies.get('token')?.value;
  
  // Define auth and protected pages
  const isAuthPage = request.nextUrl.pathname.startsWith('/signin') || 
                     request.nextUrl.pathname.startsWith('/signup');
  
  const isProtectedPage = request.nextUrl.pathname.startsWith('/account') ||
                          request.nextUrl.pathname.startsWith('/game');
  
  // If user is authenticated and trying to access auth pages, redirect to home
  if (isAuthPage && token) {
    try {
      // Verify token
      jwt.verify(token, JWT_SECRET);
      console.log("Token valid, redirecting from auth page to home");
      return NextResponse.redirect(new URL('/', request.url));
    } catch (error) {
      console.log("Invalid token on auth page, not redirecting");
      // Token is invalid, do nothing and allow access to auth pages
    }
  }

  // Only check auth for explicitly protected routes (account and game)
  if (isProtectedPage && !token) {
    console.log("No token for protected route, redirecting to signin");
    const signInUrl = new URL('/signin', request.url);
    // Only include callback for non-signin pages
    if (!request.nextUrl.pathname.startsWith('/signin')) {
      signInUrl.searchParams.set('callbackUrl', request.url);
    }
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/account/:path*',
    '/game/:path*',
    '/signin',
    '/signup',
    '/((?!api/pusher/auth).*)'  // Exclude Pusher auth route from middleware
  ]
}; 