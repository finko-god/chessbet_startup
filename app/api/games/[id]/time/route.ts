// /api/games/[id]/time/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { whiteTime, blackTime } = await request.json();
    const gameId = params.id;
    const userId = session.user.id;

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
  } catch (error) {
    console.error('Error updating time:', error);
    return NextResponse.json(
      { error: 'Failed to update time' },
      { status: 500 }
    );
  }
}