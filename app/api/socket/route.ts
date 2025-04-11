import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Store active games and their last states
const gameStates = new Map();

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// This is a polling-based approach since direct WebSockets are challenging in Next.js App Router
export async function GET(req: NextRequest) {
  try {
    const gameId = req.nextUrl.searchParams.get('gameId');
    const lastTimestamp = req.nextUrl.searchParams.get('lastTimestamp');
    
    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId parameter' }, { status: 400 });
    }
    
    // Get the latest game state from database
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        fen: true,
        pgn: true,
        status: true,
        winner: true,
        updatedAt: true,
        player1Id: true,
        player2Id: true
      }
    });
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    
    // Check if there's a newer state since client's last check
    const currentTimestamp = game.updatedAt.getTime();
    const hasUpdate = !lastTimestamp || currentTimestamp > parseInt(lastTimestamp);
    
    // Store current state for potential future comparisons
    gameStates.set(gameId, {
      fen: game.fen,
      pgn: game.pgn,
      status: game.status,
      winner: game.winner,
      timestamp: currentTimestamp,
      player1Id: game.player1Id,
      player2Id: game.player2Id
    });
    
    console.log(`GET socket for game ${gameId}: hasUpdate=${hasUpdate}, status=${game.status}, fen=${game.fen?.substring(0, 20)}...`);
    
    return NextResponse.json({
      hasUpdate,
      gameState: hasUpdate ? {
        fen: game.fen,
        pgn: game.pgn,
        status: game.status,
        winner: game.winner,
        timestamp: currentTimestamp,
        player1Id: game.player1Id,
        player2Id: game.player2Id
      } : null
    });
  } catch (error) {
    console.error('Error in socket poll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Endpoint to push a move
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { gameId, move, fen, pgn, playerId, gameOver, winner, gameOverReason } = data;
    
    if (!gameId || !fen || !pgn) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }
    
    // Get current game data to verify player and turn
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        player1Id: true,
        player2Id: true,
        status: true,
        fen: true
      }
    });
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    
    // Ensure the player is part of this game
    if (playerId !== game.player1Id && playerId !== game.player2Id) {
      console.log(`Unauthorized move attempt: Player ${playerId} not in game ${gameId}`);
      return NextResponse.json({ error: 'You are not a player in this game' }, { status: 403 });
    }
    
    console.log(`POST socket for game ${gameId}: player=${playerId}, new fen=${fen.substring(0, 20)}...`);
    
    // Update the game state in the database
    const updateData: Record<string, any> = {
      fen,
      pgn,
      updatedAt: new Date()
    };
    
    // If game is over, update status and winner
    if (gameOver) {
      updateData.status = 'finished';
      if (winner) {
        updateData.winner = winner;
      }
    }
    
    // Update game in database
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: updateData
    });
    
    // Update in-memory state
    const currentTimestamp = Date.now();
    gameStates.set(gameId, {
      fen,
      pgn,
      status: gameOver ? 'finished' : 'started',
      winner: winner || null,
      timestamp: currentTimestamp,
      player1Id: game.player1Id,
      player2Id: game.player2Id
    });
    
    return NextResponse.json({ 
      success: true,
      timestamp: currentTimestamp
    });
  } catch (error) {
    console.error('Error pushing move:', error);
    return NextResponse.json({ error: 'Failed to process move' }, { status: 500 });
  }
} 