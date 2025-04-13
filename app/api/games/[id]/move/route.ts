'use server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { Chess } from 'chess.js'

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get token from cookie
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1]
    
    if (!token) {
      console.log('Unauthorized - No token for move')
      return NextResponse.json(
        { error: 'You must be logged in to make a move' },
        { status: 401 }
      )
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string }
      
      if (!decoded.id) {
        console.log('Unauthorized - Invalid token format for move')
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        )
      }

      const { move, timestamp, isFirstMove } = await request.json()
      const { id: gameId } = await params
      const userId = decoded.id

      // Get the current game state
      const game = await prisma.game.findUnique({
        where: { id: gameId },
      })

      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 })
      }

      // Check if the game is still active
      if (game.status !== 'started') {
        return NextResponse.json({ error: 'Game is not active' }, { status: 400 })
      }

      // Verify that the user is a player in the game
      if (userId !== game.whitePlayerId && userId !== game.blackPlayerId) {
        return NextResponse.json(
          { error: 'You are not a player in this game' },
          { status: 403 }
        )
      }

      // Check if it's the player's turn
      const chess = new Chess()
      if (game.pgn) {
        chess.loadPgn(game.pgn)
      } else if (game.fen) {
        chess.load(game.fen)
      }
      const isWhiteTurn = chess.turn() === 'w'
      if (
        (isWhiteTurn && userId !== game.whitePlayerId) ||
        (!isWhiteTurn && userId !== game.blackPlayerId)
      ) {
        return NextResponse.json({ error: 'Not your turn' }, { status: 400 })
      }

      // Calculate time elapsed since last move, but only if not the first move
      // For first move, we don't deduct time
      let whiteTime = game.player1TimeLeft || 300000
      let blackTime = game.player2TimeLeft || 300000

      if (!isFirstMove) {
        const timeElapsed = timestamp - (game.lastMoveAt?.getTime() || Date.now())
        
        // Update player times based on whose turn it was
        if (isWhiteTurn) {
          whiteTime = Math.max(0, whiteTime - timeElapsed)
        } else {
          blackTime = Math.max(0, blackTime - timeElapsed)
        }
      }

      // Check if the move is valid and update the game state
      try {
        chess.move(move)
      } catch (error) {
        console.error('Invalid move:', error)
        return NextResponse.json({ error: 'Invalid move' }, { status: 400 })
        
      }

      // Update the game with new state and times
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          fen: chess.fen(),
          pgn: chess.pgn(),
          player1TimeLeft: whiteTime,
          player2TimeLeft: blackTime,
          lastMoveAt: new Date(timestamp),
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
    console.error('Error processing move:', error)
    return NextResponse.json(
      { error: 'Failed to process move' },
      { status: 500 }
    )
  }
}