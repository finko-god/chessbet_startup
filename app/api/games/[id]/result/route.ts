'use server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from cookie
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1]
    
    if (!token) {
      console.log('Unauthorized - No token for game result')
      return NextResponse.json(
        { error: 'You must be logged in to set game results' },
        { status: 401 }
      )
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string }
      
      if (!decoded.id) {
        console.log('Unauthorized - Invalid token format for game result')
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        )
      }
      
      const userId = decoded.id
      const { id: gameId } = await params
      const { result, winnerId } = await request.json()

      if (!result) {
        return NextResponse.json(
          { error: 'Result is required' },
          { status: 400 }
        )
      }

      // Get the game to ensure it exists and user is a participant
      const game = await prisma.game.findUnique({
        where: { id: gameId },
      })

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        )
      }

      // Check if game is already finished
      if (game.status === 'finished') {
        return NextResponse.json(
          { error: 'Game is already finished' },
          { status: 400 }
        )
      }

      // Verify user is a participant
      if (game.player1Id !== userId && game.player2Id !== userId) {
        return NextResponse.json(
          { error: 'You are not a participant in this game' },
          { status: 403 }
        )
      }

      // Update game with result and winner
      const updatedGame = await prisma.$transaction(async (tx) => {
        // First, check again if game is finished (to prevent race conditions)
        const currentGame = await tx.game.findUnique({
          where: { id: gameId },
          select: { status: true }
        });

        if (currentGame?.status === 'finished') {
          throw new Error('Game is already finished');
        }

        // Update game status
        const game = await tx.game.update({
          where: { id: gameId },
          data: {
            status: 'finished',
            winner: winnerId,
          },
        });

        // Handle ChessCoin transfers
        if (winnerId) {
          // Get current balances
          const winner = await tx.user.findUnique({
            where: { id: winnerId },
            select: { chessCoin: true }
          });
          const loserId = game.player1Id === winnerId ? game.player2Id : game.player1Id;
          const loser = loserId ? await tx.user.findUnique({
            where: { id: loserId },
            select: { chessCoin: true }
          }) : null;

          if (winner) {
            // Update winner's balance (add both bets)
            await tx.user.update({
              where: { id: winnerId },
              data: { chessCoin: winner.chessCoin + game.betAmount }
            });
          }

          if (loser && loserId) {
            // Update loser's balance (subtract their bet)
            await tx.user.update({
              where: { id: loserId },
              data: { chessCoin: Math.max(0, loser.chessCoin - game.betAmount) }
            });
          }
        } else {
          // In case of a draw, return ChessCoins to both players
          const player1 = await tx.user.findUnique({
            where: { id: game.player1Id },
            select: { chessCoin: true }
          });
          const player2 = game.player2Id ? await tx.user.findUnique({
            where: { id: game.player2Id },
            select: { chessCoin: true }
          }) : null;

          if (player1) {
            await tx.user.update({
              where: { id: game.player1Id },
              data: { chessCoin: player1.chessCoin + game.betAmount }
            });
          }

          if (player2 && game.player2Id) {
            await tx.user.update({
              where: { id: game.player2Id },
              data: { chessCoin: player2.chessCoin + game.betAmount }
            });
          }
        }

        return game;
      });

      return NextResponse.json({
        message: 'Game result recorded successfully',
        game: updatedGame,
        resultDetails: result,
      })
    } catch (jwtError) {
      console.error('Token verification error:', jwtError)
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Error recording game result:', error)
    return NextResponse.json(
      { error: 'Failed to record game result' },
      { status: 500 }
    )
  }
}