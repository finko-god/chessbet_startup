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
      console.log('Unauthorized - No token for game abandonment');
      return NextResponse.json(
        { error: 'You must be logged in to abandon a game' },
        { status: 401 }
      );
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

      if (!decoded.id) {
        console.log('Unauthorized - Invalid token format for game abandonment');
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        );
      }

      const userId = decoded.id;
      const { id: gameId } = await params;

      // Get the game to ensure it exists and user is a participant
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

      // Verify user is a participant
      if (game.player1Id !== userId && game.player2Id !== userId) {
        return NextResponse.json(
          { error: 'You are not a participant in this game' },
          { status: 403 }
        );
      }

      // Determine the winner (the other player)
      const winnerId = game.player1Id === userId ? game.player2Id : game.player1Id;

      // Update game status and process ChessCoins in a transaction
      const updatedGame = await prisma.$transaction(async (tx) => {
        // First, check if game is already finished and bets processed
        const currentGame = await tx.game.findUnique({
          where: { id: gameId },
          select: {
            status: true,
            betProcessed: true,
            betAmount: true,
            player1Id: true,
            player2Id: true,
            winner: true
          }
        });

        if (!currentGame) {
          throw new Error('Game not found');
        }

        if (currentGame.status === 'finished' && currentGame.betProcessed) {
          throw new Error('Game is already finished and bets processed');
        }

        // Update game status first
        const game = await tx.game.update({
          where: { id: gameId },
          data: {
            status: 'finished',
            winner: winnerId,
            betProcessed: true,
          },
        });

        // Process ChessCoins if not processed yet
        if (!currentGame.betProcessed && winnerId) {
          // Winner gets double the bet amount (their bet + loser's bet)
          await tx.user.update({
            where: { id: winnerId },
            data: {
              chessCoin: { increment: currentGame.betAmount * 2 }
            }
          });
        }

        return game;
      });

      return NextResponse.json({
        message: 'Game abandoned successfully',
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
    console.error('Error abandoning game:', error);
    return NextResponse.json(
      { error: 'Failed to abandon game' },
      { status: 500 }
    );
  }
} 