// /api/games/[id]/time/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
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
      
      const userId = decoded.id;
      const gameId = params.id;
      const { whiteTime, blackTime } = await request.json();

      // Get the current game state
      const game = await prisma.game.findUnique({
        where: { id: gameId },
      });

      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      // Verify that the user is a player in the game
      if (userId !== game.whitePlayerId && userId !== game.blackPlayerId) {
        return NextResponse.json(
          { error: 'You are not a player in this game' },
          { status: 403 }
        );
      }

      // Only update if the game is active
      if (game.status !== 'started') {
        return NextResponse.json(
          { error: 'Game is not active' },
          { status: 400 }
        );
      }

      // Update the game with new times
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          player1TimeLeft: whiteTime,
          player2TimeLeft: blackTime,
        },
      });

      return NextResponse.json({
        whiteTime: updatedGame.player1TimeLeft,
        blackTime: updatedGame.player2TimeLeft,
      });
    } catch (jwtError) {
      console.error('Token verification error:', jwtError);
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error updating time:', error);
    return NextResponse.json(
      { error: 'Failed to update time' },
      { status: 500 }
    );
  }
}