'use server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// This endpoint will be called by Vercel's cron service every minute
export async function GET() {
  try {
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000)

    // Find all waiting games that are older than 20 minutes
    const oldGames = await prisma.game.findMany({
      where: {
        status: 'waiting',
        createdAt: {
          lt: twentyMinutesAgo
        }
      }
    })

    // Cancel each old game
    for (const game of oldGames) {
      await prisma.game.update({
        where: { id: game.id },
        data: {
          status: 'finished',
          betProcessed: true,
          endReason: 'timeout'
        }
      })
    }

    return NextResponse.json({
      message: `Successfully cleaned up ${oldGames.length} old games`,
      cleanedGames: oldGames
    })
  } catch (error) {
    console.error('Error cleaning up old games:', error)
    return NextResponse.json(
      { error: 'Failed to clean up old games' },
      { status: 500 }
    )
  }
} 