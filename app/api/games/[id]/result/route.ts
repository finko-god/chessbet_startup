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

      // Verify user is a participant
      if (game.player1Id !== userId && game.player2Id !== userId) {
        return NextResponse.json(
          { error: 'You are not a participant in this game' },
          { status: 403 }
        )
      }

      // Update game with result and winner
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'finished',
          winner: winnerId,
        },
      })

      return NextResponse.json({
        message: 'Game result recorded successfully',
        game: updatedGame,
        resultDetails: result, // Return the result details even if not stored in DB
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