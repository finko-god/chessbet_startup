'use server'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get token from cookie
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    
    if (!token) {
      console.log('Unauthorized - No token');
      return NextResponse.json(
        { error: 'You must be logged in to cancel a game' },
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

      const gameId = context.params.id;

      // Find the game
      const game = await prisma.game.findUnique({
        where: {
          id: gameId,
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

      // Only the creator can cancel the game
      if (game.player1Id !== decoded.id) {
        return NextResponse.json(
          { error: 'Only the game creator can cancel the game' },
          { status: 403 }
        );
      }

      // Only waiting games can be canceled
      if (game.status !== 'waiting') {
        return NextResponse.json(
          { error: 'Only waiting games can be canceled' },
          { status: 400 }
        );
      }

      // Update the game status to finished
      const updatedGame = await prisma.game.update({
        where: {
          id: gameId,
        },
        data: {
          status: 'finished',
          winner: null,
        },
        include: {
          player1: true,
          player2: true,
        },
      });

      return NextResponse.json({
        message: 'Game canceled successfully',
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
    console.error('Error canceling game:', error);
    return NextResponse.json(
      { error: 'Failed to cancel game' },
      { status: 500 }
    );
  }
} 