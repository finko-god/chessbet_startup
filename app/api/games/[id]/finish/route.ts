'use server'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get token from cookie
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    
    if (!token) {
      console.log('Unauthorized - No token for game finish');
      return NextResponse.json(
        { error: 'You must be logged in to finish a game' },
        { status: 401 }
      );
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      
      if (!decoded.id) {
        console.log('Unauthorized - Invalid token format for game finish');
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        );
      }
      
      const userId = decoded.id;
      const gameId = params.id;

      // Get the game and make sure it exists
      const game = await prisma.game.findUnique({
        where: { id: gameId },
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

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }

      // User must be a participant in the game
      if (game.player1Id !== userId && game.player2Id !== userId) {
        return NextResponse.json(
          { error: 'You are not a participant in this game' },
          { status: 403 }
        );
      }

      // Game must be in progress
      if (game.status !== 'started') {
        return NextResponse.json(
          { error: 'Game must be in progress to be finished' },
          { status: 400 }
        );
      }

      // Now mutually agreed finish can proceed
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'finished',
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