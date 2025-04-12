'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess, Square } from 'chess.js'
import { useRouter } from 'next/navigation'
import './chess.css'

type ChessBoardProps = {
  gameId: string
  player1Id: string
  player2Id?: string | null
  whitePlayerId?: string | null
  blackPlayerId?: string | null
  initialFen?: string | null
  initialPgn?: string | null
  onGameEnd?: (winner: string | null, reason: string) => void
  isWhitePlayer?: boolean
  isGameStarted?: boolean
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
  isWhitePlayer,
  isGameStarted,
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
  const [firstMoveMade, setFirstMoveMade] = useState(false)
  const router = useRouter()
  const [gameState, setGameState] = useState<any>(null)
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [inCheck, setInCheck] = useState(false)
  const [kingSquare, setKingSquare] = useState<string | null>(null)
  const [boardWidth, setBoardWidth] = useState(400)
  
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
    const currentTurn = game.turn() === 'w'
    return currentTurn ? isWhitePlayer : !isWhitePlayer
  }, [game, isWhitePlayer])
  
  // Update move history when game state changes
  useEffect(() => {
    if (gameState?.pgn) {
      try {
        const tempGame = new Chess();
        tempGame.loadPgn(gameState.pgn);
        const moves = tempGame.history();
        setMoveHistory(moves);
      } catch (error) {
        console.error('Error loading PGN:', error);
      }
    }
  }, [gameState?.pgn]);
  
  // Helper to update game state via API
  const updateGameState = useCallback(async (move: string, isFirstMove: boolean = false) => {
    try {
      const response = await fetch(`/api/games/${gameId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          move,
          timestamp: Date.now(),
          isFirstMove,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update game state');
      }
  
      const newGameState = await response.json();
      setGameState(newGameState);
      
      // Create a new game instance with the updated PGN
      const newChess = new Chess();
      if (newGameState.pgn) {
        newChess.loadPgn(newGameState.pgn);
        // Update move history from the new PGN
        const moves = newChess.history();
        setMoveHistory(moves);
      }
      setGame(newChess);
      setCurrentPosition(newGameState.fen);
      
      // Update last move for highlighting
      const history = newChess.history({ verbose: true });
      if (history.length > 0) {
        const lastMoveItem = history[history.length - 1];
        setLastMove({
          from: lastMoveItem.from,
          to: lastMoveItem.to
        });
      }
    } catch (error) {
      console.error('Error updating game state:', error);
      setIllegalMoveError(error instanceof Error ? error.message : 'Invalid move');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  }, [gameId]);

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
        // Create a new game instance with the updated PGN
        const newChess = new Chess()
        if (newGameState.pgn) {
          newChess.loadPgn(newGameState.pgn)
          
          // Update last move for highlighting
          const history = newChess.history({ verbose: true });
          if (history.length > 0) {
            const lastMoveItem = history[history.length - 1];
            setLastMove({
              from: lastMoveItem.from,
              to: lastMoveItem.to
            });
          }
        }
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
      
      // Set up polling interval with reduced time
      const interval = setInterval(pollGameState, 500);
      
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
        
        // Set last move for highlighting
        const history = loadedGame.history({ verbose: true });
        if (history.length > 0) {
          const lastMoveItem = history[history.length - 1];
          setLastMove({
            from: lastMoveItem.from,
            to: lastMoveItem.to
          });
        }
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
  
  // Handle piece move
  function onDrop(sourceSquare: string, targetSquare: string) {
    if (!isGameStarted) return false
    if (!isPlayerTurn) return false

    // Check if this is white's first move
    const isFirstMove = !firstMoveMade && game.turn() === 'w'

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',  // Always promote to queen for simplicity
      })

      if (move === null) return false

      // Update the game state including first move info
      updateGameState(move.san, isFirstMove)
      
      // Mark first move as made if applicable
      if (isFirstMove) {
        setFirstMoveMade(true)
      }
      
      // Clear option squares after move
      setOptionSquares({})
      
      // Update last move for highlighting
      setLastMove({
        from: sourceSquare,
        to: targetSquare
      })
      
      return true
    } catch (error) {
      return false
    }
  }
  
  // Show possible moves when piece is clicked
  function onSquareClick(square: Square) {
    if (!isGameStarted || !isPlayerTurn) return
    
    // If we already have a selected piece
    if (selectedPiece) {
      // Try to make a move
      const move = game.move({
        from: selectedPiece,
        to: square,
        promotion: 'q',  // Always promote to queen for simplicity
      })
      
      // If move is valid
      if (move !== null) {
        // Update game state
        updateGameState(move.san, !firstMoveMade && game.turn() === 'w')
        
        // Clear selected piece and option squares
        setSelectedPiece(null)
        setOptionSquares({})
        
        // Update last move for highlighting
        setLastMove({
          from: selectedPiece,
          to: square
        })
        
        return
      }
      
      // If the click is on the same square, deselect
      if (square === selectedPiece) {
        setSelectedPiece(null)
        setOptionSquares({})
        return
      }
      
      // If click is on another piece of the same color, select that piece instead
      const piece = game.get(square)
      if (piece && 
          ((piece.color === 'w' && game.turn() === 'w') || 
           (piece.color === 'b' && game.turn() === 'b'))) {
        setSelectedPiece(square)
        showPossibleMoves(square)
        return
      }
    }
    
    // Check if the clicked square has a piece that can be moved
    const piece = game.get(square)
    if (piece && 
        ((piece.color === 'w' && game.turn() === 'w') || 
         (piece.color === 'b' && game.turn() === 'b'))) {
      setSelectedPiece(square)
      showPossibleMoves(square)
    }
  }
  
  // Show possible moves for a piece
  function showPossibleMoves(square: Square) {
    const moves = game.moves({
      square: square,
      verbose: true,
    })
    
    if (moves.length > 0) {
      const newSquares: Record<string, any> = {}
      moves.forEach((move) => {
        // Different styling for captures vs. regular moves
        if (move.captured) {
          newSquares[move.to] = {
            background: 'radial-gradient(circle, transparent 70%, rgba(255, 255, 255, 0.8) 70%)',
            borderRadius: '0',
          }
        } else {
          newSquares[move.to] = {
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 25%, transparent 25%)',
            borderRadius: '0',
          }
        }
      })
      setOptionSquares(newSquares)
    }
  }
  
  // Handle piece drag begin
  function onPieceDragBegin(piece: string, sourceSquare: string) {
    if (!isPlayerTurn) return
    
    // Get all possible moves for the piece
    const moves = game.moves({
      square: sourceSquare as Square,
      verbose: true,
    })
    
    // Highlight valid target squares
    if (moves.length > 0) {
      const newSquares: Record<string, any> = {}
      moves.forEach((move: any) => {
        // Different styling for captures vs. regular moves
        if (move.captured) {
          newSquares[move.to] = {
            background: 'radial-gradient(circle, transparent 70%, rgba(255, 255, 255, 0.8) 70%)',
            borderRadius: '0',
          }
        } else {
          newSquares[move.to] = {
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 25%, transparent 25%)',
            borderRadius: '0',
          }
        }
      })
      setOptionSquares(newSquares)
    }
  }
  
  function onPieceDragEnd() {
    setOptionSquares({})
  }
  
  useEffect(() => {
    // Update board width based on container size
    const updateBoardWidth = () => {
      const container = document.querySelector('.chess-board-container');
      if (container) {
        const containerWidth = container.clientWidth;
        const containerHeight = window.innerHeight;
        // For mobile, use 90% of the smaller dimension to ensure the board fits
        const maxSize = Math.min(containerWidth, containerHeight * 0.9);
        setBoardWidth(Math.min(maxSize, 600));
      }
    };

    updateBoardWidth();
    window.addEventListener('resize', updateBoardWidth);
    return () => window.removeEventListener('resize', updateBoardWidth);
  }, []);

  useEffect(() => {
    // Check if king is in check
    if (!game) return
    
    const turn = game.turn()
    const isInCheck = game.inCheck()
    setInCheck(isInCheck)
    
    if (isInCheck) {
      // Find king's position
      const board = game.board()
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const piece = board[i][j]
          if (piece && piece.type === 'k' && piece.color === turn) {
            const files = 'abcdefgh'
            const square = files[j] + (8 - i)
            setKingSquare(square)
            return
          }
        }
      }
    } else {
      setKingSquare(null)
    }
  }, [game])
  
  return (
    <div className="chess-board-container w-full max-w-[600px] mx-auto">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full aspect-square">
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            onPieceDragBegin={onPieceDragBegin}
            onPieceDragEnd={onPieceDragEnd}
            customBoardStyle={{
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
            customDarkSquareStyle={{ backgroundColor: '#779556' }}
            customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
            customSquareStyles={{
              ...moveSquares,
              ...optionSquares,
              ...(selectedPiece ? {
                [selectedPiece]: { backgroundColor: 'rgba(98, 153, 36, 0.2)' }
              } : {}),
              ...(lastMove ? {
                [lastMove.from]: { backgroundColor: 'rgba(98, 153, 36, 0.15)' },
                [lastMove.to]: { backgroundColor: 'rgba(98, 153, 36, 0.15)' }
              } : {}),
              ...(inCheck && kingSquare ? {
                [kingSquare]: { backgroundColor: 'rgba(204, 51, 51, 0.2)' }
              } : {})
            }}
            boardWidth={boardWidth}
            areArrowsAllowed={false}
            showBoardNotation={true}
            arePiecesDraggable={isGameStarted && isPlayerTurn}
            customArrowColor="rgba(98, 153, 36, 0.5)"
            boardOrientation={isWhitePlayer ? 'white' : 'black'}
          />
        </div>
        
        {/* <div className="w-full lg:w-64 bg-card rounded-lg p-4">
          <div className="mb-4">
            <div className={`text-sm font-medium mb-2 ${game.turn() === 'w' ? 'text-green-600' : 'text-gray-600'}`}>
              {game.turn() === 'w' ? 'White to move' : 'Black to move'}
            </div>
            <div className="text-xs text-muted-foreground">
              {isPlayerTurn ? 'Your turn' : 'Opponent\'s turn'}
            </div>
          </div>
          
          <div className="h-[300px] overflow-y-auto move-history">
            <div className="text-sm font-medium mb-2">Move History</div>
            <div className="space-y-1">
              {moveHistory.map((move, index) => {
                // Clean up the move by removing any asterisks and other PGN annotations
                const cleanMove = move.replace(/[!?+#*]/g, '');
                return (
                  <div key={index} className="move-item">
                    <span className="move-number">{Math.floor(index / 2) + 1}.</span>
                    <span className="move-text">
                      {cleanMove}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div> */}
      </div>
    </div>
  )
}