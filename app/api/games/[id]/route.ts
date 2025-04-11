'use server'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params before accessing its properties
    const { id } = await params;

    const game = await prisma.game.findUnique({
      where: {
        id,
      },
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

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
} 