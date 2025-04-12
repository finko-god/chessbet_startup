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
        { error: 'You must be logged in to join a game' },
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

      // Await params before accessing its properties
      const { id: gameId } = await params;

      const game = await prisma.game.findUnique({
        where: {
          id: gameId,
        },
        include: {
          player1: true,
        },
      });

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }

      if (game.status !== 'waiting') {
        return NextResponse.json(
          { error: 'Game is not available for joining' },
          { status: 400 }
        );
      }

      if (game.player1Id === decoded.id) {
        return NextResponse.json(
          { error: 'You cannot join your own game' },
          { status: 400 }
        );
      }

      if (game.player2Id) {
        return NextResponse.json(
          { error: 'Game is already full' },
          { status: 400 }
        );
      }

      // Check if joining player has enough ChessCoins
      const joiningPlayer = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!joiningPlayer) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (joiningPlayer.chessCoin < game.betAmount) {
        return NextResponse.json(
          { error: 'Insufficient ChessCoins to join this game' },
          { status: 400 }
        );
      }

      // Update game and deduct ChessCoins in a transaction
      const updatedGame = await prisma.$transaction(async (tx) => {
        // Deduct ChessCoins from joining player
        await tx.user.update({
          where: { id: decoded.id },
          data: { chessCoin: { decrement: game.betAmount } }
        });

        // Update the game
        return tx.game.update({
          where: {
            id: gameId,
          },
          data: {
            player2Id: decoded.id,
            blackPlayerId: decoded.id,
            status: 'started',
          },
          include: {
            player1: true,
            player2: true,
          },
        });
      });

      // Return the data needed for both players to be redirected
      return NextResponse.json({
        game: updatedGame,
        message: 'Game started successfully',
        redirectUrl: `/game/${gameId}`,
        player1Id: updatedGame.player1Id,
        gameStatus: 'started'
      });
    } catch (jwtError) {
      console.error('Token verification error:', jwtError);
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error joining game:', error);
    return NextResponse.json(
      { error: 'Failed to join game' },
      { status: 500 }
    );
  }
} 