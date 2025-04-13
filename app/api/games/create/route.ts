'use server'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

// 5 minutes in milliseconds
const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // Get token from cookie
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'You must be logged in to create a game' },
        { status: 401 }
      );
    }
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      
      if (!decoded.id) {
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        );
      }
      
      const { betAmount } = await request.json();

      if (!betAmount || typeof betAmount !== 'number' || betAmount <= 0) {
        return NextResponse.json(
          { error: 'Invalid bet amount' },
          { status: 400 }
        );
      }

      // Verify user exists in database and has enough ChessCoins
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }

      if (user.chessCoin < betAmount) {
        return NextResponse.json(
          { error: 'Insufficient ChessCoins to create this game' },
          { status: 400 }
        );
      }

      // Create game and deduct ChessCoins in a transaction
      const game = await prisma.$transaction(async (tx) => {
        // Create the game
        return tx.game.create({
          data: {
            player1Id: decoded.id,
            whitePlayerId: decoded.id,
            betAmount,
            status: 'waiting',
            player1TimeLeft: FIVE_MINUTES_MS,
            player2TimeLeft: FIVE_MINUTES_MS,
          },
        });
      });

      return NextResponse.json(game);
    } catch (jwtError) {
      console.error('JWT error:', jwtError)
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json(
      { error: 'Failed to create game. Please try again.' },
      { status: 500 }
    );
  }
} 