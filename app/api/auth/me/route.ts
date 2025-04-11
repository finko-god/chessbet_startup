import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

export async function GET(request: Request) {
  try {
    // Get the token from cookies
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

    // Return user info
    return NextResponse.json({ id: decoded.id });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
} 