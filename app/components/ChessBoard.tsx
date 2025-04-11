'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess, Square } from 'chess.js'
import { useRouter } from 'next/navigation'

type ChessBoardProps = {
  gameId: string
  player1Id: string
  player2Id?: string | null
  whitePlayerId?: string | null
  blackPlayerId?: string | null
  initialFen?: string | null
  initialPgn?: string | null
  onGameEnd?: (winner: string | null, reason: string) => void
}

export default function ChessBoard({
  gameId,
  player1Id,
  player2Id,
  whitePlayerId,
  blackPlayerId,
  initialFen,
  initialPgn,
  onGameEnd,
}: ChessBoardProps) {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [game, setGame] = useState<Chess>(new Chess(initialFen || undefined))
  const [currentPosition, setCurrentPosition] = useState<string>(initialFen || 'start')
  const [moveSquares, setMoveSquares] = useState<Record<string, any>>({})
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [illegalMoveError, setIllegalMoveError] = useState<string | null>(null)
  const [isShaking, setIsShaking] = useState(false)
  const router = useRouter()
  const [gameState, setGameState] = useState<any>(null)
  
  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }
    fetchUser()
  }, [])
  
  // Determine player colors based on user ID
  const isWhite = user?.id === whitePlayerId
  const isBlack = user?.id === blackPlayerId
  const isSpectator = !isWhite && !isBlack
  
  // Is it this player's turn?
  const isPlayerTurn = useMemo(() => {
    if (!game || !whitePlayerId || !blackPlayerId) return false
    const currentTurn = game.turn() === 'w'
    return currentTurn ? isWhite : isBlack
  }, [game, whitePlayerId, blackPlayerId, isWhite, isBlack])
  
  // Update move history when game state changes
  useEffect(() => {
    if (game) {
      const moves = game.history()
      setMoveHistory(moves)
    }
  }, [game])
  
  // Helper to update game state via API
  const updateGameState = useCallback(async (move: string) => {
    try {
      const response = await fetch(`/api/games/${gameId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          move,
          playerId: user?.id,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update game state')
      }

      const newGameState = await response.json()
      setGameState(newGameState)
      setGame(new Chess(newGameState.fen))
      setCurrentPosition(newGameState.fen)
    } catch (error) {
      console.error('Error updating game state:', error)
      setIllegalMoveError(error instanceof Error ? error.message : 'Invalid move')
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
    }
  }, [gameId, user?.id])

  const pollGameState = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/games/${gameId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch game state')
      }

      const newGameState = await response.json()
      setGameState(newGameState)
      
      // Only update the game if the FEN has changed and is not null
      if (newGameState.fen && newGameState.fen !== currentPosition) {
        const newChess = new Chess(newGameState.fen)
        setGame(newChess)
        setCurrentPosition(newGameState.fen)

        // Check for checkmate
        if (newChess.isCheckmate()) {
          const winner = newChess.turn() === 'w' ? blackPlayerId : whitePlayerId
          if (onGameEnd && winner) {
            onGameEnd(winner, 'checkmate')
          }
          router.push('/')
        }
      }

      // Check for game over conditions
      if (newGameState.status === 'finished') {
        if (onGameEnd) {
          onGameEnd(newGameState.winner, 'Game finished')
        }
        router.push('/')
      }
    } catch (error) {
      console.error('Error polling game state:', error)
    }
  }, [gameId, user, router, currentPosition, onGameEnd, whitePlayerId, blackPlayerId])
  
  // Start polling when component mounts
  useEffect(() => {
    if (gameId && user) {
      console.log('Starting game state polling for game:', gameId);
      // Initial poll
      pollGameState();
      
      // Set up polling interval
      const interval = setInterval(pollGameState, 1000);
      
      // Clean up
      return () => {
        clearInterval(interval);
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current);
        }
      };
    }
  }, [gameId, user, pollGameState]);
  
  // Load initial game state if provided
  useEffect(() => {
    try {
      if (initialPgn) {
        const loadedGame = new Chess();
        loadedGame.loadPgn(initialPgn);
        setGame(loadedGame);
        setCurrentPosition(loadedGame.fen());
        console.log('Loaded game from PGN');
      } else if (initialFen) {
        const loadedGame = new Chess(initialFen);
        setGame(loadedGame);
        setCurrentPosition(loadedGame.fen());
        console.log('Loaded game from FEN');
      }
    } catch (error) {
      console.error('Error loading initial game state:', error);
    }
  }, [initialFen, initialPgn]);
  
  // Handle piece moves
  function onDrop(sourceSquare: string, targetSquare: string) {
    if (isSpectator) return false
    if ((game.turn() === 'w' && !isWhite) || (game.turn() === 'b' && !isBlack)) return false

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })

      if (move === null) return false

      updateGameState(move.san)
      return true
    } catch (error) {
      return false
    }
  }
  
  // Show possible moves when piece is clicked
  function onPieceDragBegin(piece: string, sourceSquare: string) {
    if (!isPlayerTurn) return;
    
    // Get all possible moves for the piece
    const moves = game.moves({
      square: sourceSquare as Square,
      verbose: true,
    });
    
    // Highlight valid target squares
    if (moves.length > 0) {
      const newSquares: Record<string, any> = {};
      moves.forEach((move: any) => {
        newSquares[move.to] = {
          background: 'rgba(255, 255, 0, 0.4)',
          borderRadius: '50%',
        };
      });
      setOptionSquares(newSquares);
    }
  }
  
  function onPieceDragEnd() {
    setOptionSquares({});
  }
  
  return (
    <div className="flex flex-col gap-4">
      {/* Turn indicator - now with more prominent styling */}
      <div className="bg-gray-100 p-4 rounded-lg shadow-md text-center mb-4 border-2 border-gray-300">
        <div className="flex justify-center items-center gap-3">
          <div className={`w-8 h-8 rounded-full border-2 ${game.turn() === 'w' ? 'bg-white border-black' : 'bg-black border-gray-400'}`}></div>
          <span className="text-xl font-bold">
            {game.turn() === 'w' ? "White's Move" : "Black's Move"}
          </span>
        </div>
      </div>

      <div className={`w-full max-w-md mx-auto ${isShaking ? 'animate-shake' : ''}`}>
        <Chessboard
          id={`game-${gameId}`}
          boardWidth={400}
          position={currentPosition}
          onPieceDrop={onDrop}
          onPieceDragBegin={onPieceDragBegin}
          onPieceDragEnd={onPieceDragEnd}
          customSquareStyles={{
            ...moveSquares,
            ...optionSquares,
          }}
          boardOrientation={isWhite ? 'white' : isBlack ? 'black' : 'white'}
        />
        <div className="mt-4 text-center">
          {connectionError && (
            <p className="text-red-500">
              {connectionError}
            </p>
          )}
          {illegalMoveError && (
            <p className="text-red-500 animate-fade-in">
              {illegalMoveError}
            </p>
          )}
          <div className="space-y-2">
            <p className={isPlayerTurn ? "text-green-600 font-medium" : "text-gray-600"}>
              {isPlayerTurn ? "Your turn" : "Waiting for opponent's move"}
            </p>
            <p className="text-gray-500">
              You are playing as {isWhite ? 'White' : isBlack ? 'Black' : 'Spectator'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}