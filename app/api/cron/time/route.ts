'use server'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import { Chess } from 'chess.js';

export async function GET() {
  try {
    // Find all active games
    const activeGames = await prisma.game.findMany({
      where: {
        status: 'started',
      }
    });

    const now = new Date();
    const updates = [];

    for (const game of activeGames) {
      // Skip games without lastMoveAt timestamp
      if (!game.lastMoveAt) continue;

      // Calculate time elapsed since last move
      const elapsedTime = now.getTime() - new Date(game.lastMoveAt).getTime();
      
      // Extract time control information (e.g., "5+0" or "3+2")
      const [baseTime, increment] = (game.timeControl || '5+0').split('+').map(Number);
      const baseTimeMs = baseTime * 60 * 1000;
      
      // Determine whose turn it is based on FEN notation
      const isWhiteTurn = !game.fen || game.fen.split(' ')[1] === 'w';
      
      // Get current times with fallback to default
      let whiteTime = game.player1TimeLeft !== null ? game.player1TimeLeft : baseTimeMs;
      let blackTime = game.player2TimeLeft !== null ? game.player2TimeLeft : baseTimeMs;
      
      // Update time only for the player whose turn it is
      if (isWhiteTurn) {
        whiteTime = Math.max(0, whiteTime - elapsedTime);
      } else {
        blackTime = Math.max(0, blackTime - elapsedTime);
      }

      // If time ran out, end the game
      if (whiteTime <= 0 || blackTime <= 0) {
        const chess = new Chess(game.fen || undefined);
        const timeoutPlayer = whiteTime <= 0 ? 'white' : 'black';
        const opponentColor = timeoutPlayer === 'white' ? 'black' : 'white';
        
        // Check if opponent has sufficient material to checkmate
        const hasSufficientMaterial = (color: string) => {
          const pieces = chess.board().flat().filter(piece => piece && piece.color === color);
          
          // King + Queen or King + Rook is sufficient
          if (pieces.some(piece => piece?.type === 'q' || piece?.type === 'r')) return true;
          
          // King + 2 Knights is not sufficient
          if (pieces.length === 3 && pieces.filter(piece => piece?.type === 'n').length === 2) return false;
          
          // King + Bishop is not sufficient
          if (pieces.length === 2 && pieces.some(piece => piece?.type === 'b')) return false;
          
          // King + Knight is not sufficient
          if (pieces.length === 2 && pieces.some(piece => piece?.type === 'n')) return false;
          
          // King + Multiple bishops on same color is not sufficient
          if (pieces.filter(piece => piece?.type === 'b').length > 0) {
            const bishops = pieces.filter(piece => piece?.type === 'b');
            const allOnSameColor = bishops.every((bishop) => {
              const square = chess.board().findIndex(row => row.includes(bishop));
              const isLightSquare = (Math.floor(square / 8) + (square % 8)) % 2;
              return isLightSquare === ((Math.floor(square / 8) + (square % 8)) % 2);
            });
            if (allOnSameColor) return false;
          }
          
          // King + Pawn or King + Multiple pieces is sufficient
          return pieces.length > 2 || pieces.some(piece => piece?.type === 'p');
        };

        const opponentHasSufficientMaterial = hasSufficientMaterial(opponentColor);
        
        if (opponentHasSufficientMaterial) {
          const winnerId = whiteTime <= 0 ? game.blackPlayerId : game.whitePlayerId;
          
          updates.push(
            prisma.game.update({
              where: { id: game.id },
              data: {
                status: 'finished',
                winner: winnerId,
                betProcessed: true,
                player1TimeLeft: Math.max(0, whiteTime),
                player2TimeLeft: Math.max(0, blackTime),
                lastMoveAt: now
              }
            })
          );

          // Notify clients about game end
          await pusherServer.trigger(`private-game-${game.id}`, 'game-ended', {
            winner: whiteTime <= 0 ? 'black' : 'white',
            reason: 'time'
          });
        } else {
          // Draw due to insufficient material
          updates.push(
            prisma.game.update({
              where: { id: game.id },
              data: {
                status: 'finished',
                winner: null, // Draw
                betProcessed: true,
                player1TimeLeft: Math.max(0, whiteTime),
                player2TimeLeft: Math.max(0, blackTime),
                lastMoveAt: now
              }
            })
          );

          // Notify clients about draw
          await pusherServer.trigger(`private-game-${game.id}`, 'game-ended', {
            winner: null,
            reason: 'insufficient_material'
          });
        }
      } else {
        // Just update the times
        updates.push(
          prisma.game.update({
            where: { id: game.id },
            data: {
              player1TimeLeft: whiteTime,
              player2TimeLeft: blackTime,
              lastMoveAt: now
            }
          })
        );

        // Notify connected clients about time update
        await pusherServer.trigger(`private-game-${game.id}`, 'time-update', {
          whiteTime,
          blackTime
        });
      }
    }

    // Execute all updates in parallel
    if (updates.length > 0) {
      await Promise.all(updates);
    }

    return NextResponse.json({
      message: `Successfully updated time for ${activeGames.length} active games`,
      updatedGames: updates.length
    });
  } catch (error) {
    console.error('Error updating game times:', error);
    return NextResponse.json(
      { error: 'Failed to update game times' },
      { status: 500 }
    );
  }
} 