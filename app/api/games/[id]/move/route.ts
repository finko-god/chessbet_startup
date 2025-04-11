'use server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { Chess } from 'chess.js'

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
      return NextResponse.json(
        { error: 'You must be logged in to make a move' },
        { status: 401 }
      )
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string }
      
      if (!decoded.id) {
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        )
      }
      
      const userId = decoded.id
      const { id: gameId } = await params
      const { move, playerId } = await request.json()

      if (!move || !playerId) {
        return NextResponse.json(
          { error: 'Move and playerId are required' },
          { status: 400 }
        )
      }

      // Get the current game state
      const game = await prisma.game.findUnique({
        where: { id: gameId },
      })

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        )
      }

      // Verify user is part of the game
      if (game.player1Id !== userId && game.player2Id !== userId) {
        return NextResponse.json(
          { error: 'You are not a participant in this game' },
          { status: 403 }
        )
      }

      // Verify game is in progress
      if (game.status !== 'started') {
        return NextResponse.json(
          { error: 'Cannot make moves in a game that is not in progress' },
          { status: 400 }
        )
      }

      // Create a new chess game instance with the current FEN
      const chess = new Chess(game.fen || undefined)

      // Make the move
      try {
        chess.move(move)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid move' },
          { status: 400 }
        )
      }

      // Update the game state
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          fen: chess.fen(),
          pgn: chess.pgn(),
          lastMoveAt: new Date(),
        },
      })

      return NextResponse.json(updatedGame)
    } catch (jwtError) {
      console.error('Token verification error:', jwtError)
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Error making move:', error)
    return NextResponse.json(
      { error: 'Failed to make move' },
      { status: 500 }
    )
  }
} 