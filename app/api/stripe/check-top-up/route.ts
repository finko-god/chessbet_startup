import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const topUp = await prisma.topUp.findFirst({
      where: { userId: decoded.id }
    });

    return NextResponse.json({ hasTopUp: !!topUp });
  } catch (error) {
    console.error('Error checking top-up:', error);
    return NextResponse.json(
      { error: 'Error checking top-up' },
      { status: 500 }
    );
  }
} 