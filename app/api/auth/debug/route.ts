'use server';

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

interface DecodedToken {
  id?: string;
  email?: string;
  name?: string;
  error?: string;
  message?: string;
}

export async function GET(request: Request) {
  try {
    // Get all cookies from the request
    const cookieHeader = request.headers.get('cookie');
    
    // Get the token cookie specifically
    const tokenCookie = cookieHeader?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    
    // Parse the JWT if it exists
    let decodedToken: DecodedToken | null = null;
    if (tokenCookie) {
      try {
        decodedToken = jwt.verify(tokenCookie, JWT_SECRET) as DecodedToken;
      } catch (e) {
        decodedToken = { error: 'Invalid token', message: (e as Error).message };
      }
    }
    
    // Return debugging information
    return NextResponse.json({
      cookies: {
        raw: cookieHeader,
        parsed: cookieHeader?.split(';').map(c => c.trim()),
      },
      token: {
        raw: tokenCookie,
        valid: !!tokenCookie && !decodedToken?.error,
        decoded: decodedToken,
      },
      env: {
        nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        jwtSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug error',
      message: (error as Error).message,
    }, { status: 500 });
  }
} 