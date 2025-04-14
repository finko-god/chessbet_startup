// /api/games/[id]/time/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { pusherServer } from '@/lib/pusher';

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from cookie
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    
    if (!token) {
      console.log('Unauthorized - No token for time update');
      return NextResponse.json(
        { error: 'You must be logged in to update time' },
        { status: 401 }
      );
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      
      if (!decoded.id) {
        console.log('Unauthorized - Invalid token format for time update');
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        );
      }

      const { id } = await params;
      const { whiteTime, blackTime } = await request.json();

      // Get the game
      const game = await prisma.game.findUnique({
        where: { id },
      });

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }

      // Verify user is a participant
      if (game.whitePlayerId !== decoded.id && game.blackPlayerId !== decoded.id) {
        return NextResponse.json(
          { error: 'You are not a participant in this game' },
          { status: 403 }
        );
      }

      // Update the game with new times
      const updatedGame = await prisma.game.update({
        where: { id },
        data: {
          player1TimeLeft: whiteTime,
          player2TimeLeft: blackTime,
        },
      });

      // Trigger Pusher event
      await pusherServer.trigger(`private-game-${id}`, 'time-update', {
        whiteTime: updatedGame.player1TimeLeft,
        blackTime: updatedGame.player2TimeLeft
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
    console.error('Error updating game time:', error);
    return NextResponse.json(
      { error: 'Failed to update game time' },
      { status: 500 }
    );
  }
}