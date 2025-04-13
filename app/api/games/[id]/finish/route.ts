'use server'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from cookie
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    
    if (!token) {
      console.log('Unauthorized - No token');
      return NextResponse.json(
        { error: 'You must be logged in to finish a game' },
        { status: 401 }
      );
    }
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      
      if (!decoded.id) {
        console.log('Unauthorized - Invalid token');
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        );
      }

      const { id } = await params;

      // Find the game
      const game = await prisma.game.findUnique({
        where: {
          id,
        },
        include: {
          player1: true,
          player2: true,
        },
      });

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }

      // Only players can finish the game
      if (game.player1Id !== decoded.id && game.player2Id !== decoded.id) {
        return NextResponse.json(
          { error: 'Only players can finish the game' },
          { status: 403 }
        );
      }

      // Only started games can be finished
      if (game.status !== 'started') {
        return NextResponse.json(
          { error: 'Only started games can be finished' },
          { status: 400 }
        );
      }

      // Update the game status to finished
      const updatedGame = await prisma.game.update({
        where: {
          id,
        },
        data: {
          status: 'finished',
          winner: decoded.id,
        },
        include: {
          player1: true,
          player2: true,
        },
      });

      return NextResponse.json({
        message: 'Game finished successfully',
        game: updatedGame,
      });
    } catch (jwtError) {
      console.error('Token verification error:', jwtError);
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error finishing game:', error);
    return NextResponse.json(
      { error: 'Failed to finish game' },
      { status: 500 }
    );
  }
} 