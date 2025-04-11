'use server'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

export async function GET(request: Request) {
  try {
    // Get token from cookie
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    
    if (!token) {
      console.log('Unauthorized - No token for /api/games/active');
      return NextResponse.json(
        { error: 'You must be logged in to view active games' },
        { status: 401 }
      );
    }
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      
      if (!decoded.id) {
        console.log('Unauthorized - Invalid token format for /api/games/active');
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        );
      }

      const userId = decoded.id;

      // Get all games where the user is player1 or player2
      const activeGames = await prisma.game.findMany({
        where: {
          OR: [
            { player1Id: userId },
            { player2Id: userId }
          ],
          // Only active games (not finished)
          status: {
            in: ['waiting', 'started']
          }
        },
        include: {
          player1: {
            select: {
              id: true,
              name: true,
            },
          },
          player2: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return NextResponse.json(activeGames);
    } catch (jwtError) {
      console.error('Token verification error:', jwtError);
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error fetching active games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active games' },
      { status: 500 }
    );
  }
} 