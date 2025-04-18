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
      console.log('Unauthorized - No token for game cancel');
      return NextResponse.json(
        { error: 'You must be logged in to cancel a game' },
        { status: 401 }
      );
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

      if (!decoded.id) {
        console.log('Unauthorized - Invalid token format for game cancel');
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        );
      }

      const userId = decoded.id;
      const { id: gameId } = await params;

      // Get the game to ensure it exists and user is the creator
      const game = await prisma.game.findUnique({
        where: { id: gameId },
      });

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }

      // Check if game is already finished
      if (game.status === 'finished') {
        return NextResponse.json(
          { error: 'Game is already finished' },
          { status: 400 }
        );
      }

      // Verify user is the creator
      if (game.player1Id !== userId) {
        return NextResponse.json(
          { error: 'Only the game creator can cancel the game' },
          { status: 403 }
        );
      }

      // Update game status to finished
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'finished',
          betProcessed: true,
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