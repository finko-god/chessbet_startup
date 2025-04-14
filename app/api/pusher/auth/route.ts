'use server';

import { NextRequest, NextResponse } from 'next/server'
import { pusherServer } from '@/lib/pusher'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key'

export async function POST(request: NextRequest) {
  try {
    // Parse form data from the request
    const formData = await request.formData()
    const socketId = formData.get('socket_id') as string
    const channelName = formData.get('channel_name') as string

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const token = request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string }
      
      if (!decoded.id) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }

      // Extract gameId from channel name - get everything after 'private-game-'
      const gameId = channelName.replace('private-game-', '')
      
      if (!gameId) {
        return NextResponse.json({ error: 'Invalid channel name' }, { status: 400 })
      }

      // Validate user is part of the game
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { 
          whitePlayerId: true, 
          blackPlayerId: true,
          status: true
        }
      })

      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 })
      }

      // Check if game is active
      if (game.status !== 'started') {
        return NextResponse.json({ error: 'Game is not active' }, { status: 403 })
      }

      // Check if user is a participant
      if (![game.whitePlayerId, game.blackPlayerId].includes(decoded.id)) {
        return NextResponse.json({ error: 'You are not a participant in this game' }, { status: 403 })
      }

      // Authenticate the user with Pusher
      const authResponse = pusherServer.authorizeChannel(
        socketId,
        channelName,
        {
          user_id: decoded.id,
          user_info: {
            id: decoded.id
          }
        }
      )

      return NextResponse.json(authResponse)
    } catch {

      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}