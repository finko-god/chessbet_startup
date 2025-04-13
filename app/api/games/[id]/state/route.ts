'use server'
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

interface GameUpdateData {
  fen?: string;
  pgn?: string;
  status?: string;
  player1TimeLeft?: number;
  player2TimeLeft?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get token from cookie
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    
    if (!token) {
      console.log('Unauthorized - No token for game state access');
      return NextResponse.json(
        { error: 'You must be logged in to view game state' },
        { status: 401 }
      );
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      
      if (!decoded.id) {
        console.log('Unauthorized - Invalid token format for game state');
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        );
      }
      
      const userId = decoded.id;
      const gameId = params.id;

      // Get the game
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

      // Verify user is part of the game
      if (game.player1Id !== userId && game.player2Id !== userId) {
        return NextResponse.json(
          { error: 'You are not a participant in this game' },
          { status: 403 }
        );
      }

      return NextResponse.json(game);
    } catch (jwtError) {
      console.error('Token verification error:', jwtError);
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error getting game state:', error);
    return NextResponse.json(
      { error: 'Failed to get game state' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get token from cookie
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    
    if (!token) {
      console.log('Unauthorized - No token for game state update');
      return NextResponse.json(
        { error: 'You must be logged in to update game state' },
        { status: 401 }
      );
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      
      if (!decoded.id) {
        console.log('Unauthorized - Invalid token format for game state update');
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        );
      }
      
      const userId = decoded.id;
      const gameId = params.id;
      const { fen, pgn, status, timeLeft } = await request.json();

      // Get the current game state
      const game = await prisma.game.findUnique({
        where: { id: gameId },
      });

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }

      // Verify user is part of the game
      if (game.player1Id !== userId && game.player2Id !== userId) {
        return NextResponse.json(
          { error: 'You are not a participant in this game' },
          { status: 403 }
        );
      }

      // Verify game is in progress
      if (game.status !== 'started') {
        return NextResponse.json(
          { error: 'Cannot update a game that is not in progress' },
          { status: 400 }
        );
      }

      const updateData: GameUpdateData = {};

      if (fen) updateData.fen = fen;
      if (pgn) updateData.pgn = pgn;
      if (status) updateData.status = status;

      // Handle time updates
      if (timeLeft && typeof timeLeft === 'object') {
        if (userId === game.player1Id && timeLeft.player1 !== undefined) {
          updateData.player1TimeLeft = timeLeft.player1;
        }
        if (userId === game.player2Id && timeLeft.player2 !== undefined) {
          updateData.player2TimeLeft = timeLeft.player2;
        }
      }

      // Update the game
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: updateData,
      });

      return NextResponse.json(updatedGame);
    } catch (jwtError) {
      console.error('Token verification error:', jwtError);
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error updating game state:', error);
    return NextResponse.json(
      { error: 'Failed to update game state' },
      { status: 500 }
    );
  }
} 