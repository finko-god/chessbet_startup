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

interface MoveSquares {
  [key: string]: {
    background: string;
    borderRadius: string;
  };
}

interface OptionSquares {
  [key: string]: {
    background: string;
    borderRadius: string;
  };
}

interface GameState {
  fen: string;
  pgn: string;
  status: string;
  winner: string | null;
  player1TimeLeft: number;
  player2TimeLeft: number;
}

export default function ChessBoard({
  gameId,
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
  const [moveSquares] = useState<MoveSquares>({})
  const [optionSquares, setOptionSquares] = useState<OptionSquares>({})
  const [firstMoveMade, setFirstMoveMade] = useState(false)
  const [, setMoveHistory] = useState<string[]>([])
  const [, setIllegalMoveError] = useState<string | null>(null)
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [inCheck, setInCheck] = useState(false)
  const [kingSquare, setKingSquare] = useState<string | null>(null)
  const [boardWidth, setBoardWidth] = useState(400)
  const [showInvalidMove, setShowInvalidMove] = useState(false)
  const [invalidMoveMessage, setInvalidMoveMessage] = useState<string | null>(null)
  const [invalidMoveSquare, setInvalidMoveSquare] = useState<string | null>(null)
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Determine whose turn it is (for drag/dropping logic)
  const isPlayerTurn = useMemo(() => {
    const currentTurn = game.turn() === 'w'
    return currentTurn ? isWhitePlayer : !isWhitePlayer
  }, [game, isWhitePlayer])
  
  // Update move history when game state changes
  useEffect(() => {
    if (gameState?.pgn) {
      try {
        const tempGame = new Chess()
        tempGame.loadPgn(gameState.pgn)
        const moves = tempGame.history()
        setMoveHistory(moves)
      } catch (error) {
        console.error('Error loading PGN:', error)
      }
    }
  }, [gameState?.pgn])
  
  // Helper to update game state via API
  const updateGameState = useCallback(
    async (move: string, isFirstMove: boolean = false) => {
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
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update game state')
        }
    
        const newGameState = await response.json()
        setGameState(newGameState)
        
        // Update game instance using PGN if available
        const newChess = new Chess()
        if (newGameState.pgn) {
          newChess.loadPgn(newGameState.pgn)
          setMoveHistory(newChess.history())
        }
        setGame(newChess)
        setCurrentPosition(newGameState.fen)
    
        // Update last move for highlighting
        const history = newChess.history({ verbose: true })
        if (history.length > 0) {
          const lastMoveItem = history[history.length - 1]
          setLastMove({
            from: lastMoveItem.from,
            to: lastMoveItem.to
          })
        }
      } catch (error) {
        console.error('Error updating game state:', error)
        setIllegalMoveError(error instanceof Error ? error.message : 'Invalid move')
      }
    },
    [gameId]
  )
  
  // Poll game state periodically
  const pollGameState = useCallback(async () => {
    if (!user) return
    try {
      const response = await fetch(`/api/games/${gameId}`)
      if (!response.ok) throw new Error('Failed to fetch game state')
      const newGameState = await response.json()
      setGameState(newGameState)
      
      if (newGameState.fen && newGameState.fen !== currentPosition) {
        const newChess = new Chess()
        if (newGameState.pgn) {
          newChess.loadPgn(newGameState.pgn)
          const history = newChess.history({ verbose: true })
          if (history.length > 0) {
            const lastMoveItem = history[history.length - 1]
            setLastMove({
              from: lastMoveItem.from,
              to: lastMoveItem.to
            })
          }
        }
        setGame(newChess)
        setCurrentPosition(newGameState.fen)
  
        if (newChess.isCheckmate()) {
          const winner = newChess.turn() === 'w' ? blackPlayerId : whitePlayerId
          if (onGameEnd && winner) {
            onGameEnd(winner, 'checkmate')
          }
          router.push('/')
        }
      }
  
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
  
  useEffect(() => {
    if (gameId && user) {
      pollGameState()
      const interval = setInterval(pollGameState, 500)
      return () => {
        clearInterval(interval)
        if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
      }
    }
  }, [gameId, user, pollGameState])
  
  // Load initial game state if provided via props
  useEffect(() => {
    try {
      if (initialPgn) {
        const loadedGame = new Chess()
        loadedGame.loadPgn(initialPgn)
        setGame(loadedGame)
        setCurrentPosition(loadedGame.fen())
        const history = loadedGame.history({ verbose: true })
        if (history.length > 0) {
          const lastMoveItem = history[history.length - 1]
          setLastMove({
            from: lastMoveItem.from,
            to: lastMoveItem.to
          })
        }
      } else if (initialFen) {
        const loadedGame = new Chess(initialFen)
        setGame(loadedGame)
        setCurrentPosition(loadedGame.fen())
      }
    } catch (error) {
      console.error('Error loading initial game state:', error)
    }
  }, [initialFen, initialPgn])
  
  // Handle piece moves
  function onDrop(sourceSquare: string, targetSquare: string) {
    if (!isGameStarted) return false
    if (!isPlayerTurn) return false
  
    const isFirstMove = !firstMoveMade && game.turn() === 'w'
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })
      if (move) {
        updateGameState(move.san, isFirstMove)
        if (isFirstMove) setFirstMoveMade(true)
        setOptionSquares({})
        setLastMove({
          from: sourceSquare,
          to: targetSquare
        })
        return true
      }
    } catch (error) {
      console.error('Error on drop:', error)
      setInvalidMoveSquare(sourceSquare)
      setShowInvalidMove(true)
      setInvalidMoveMessage('Invalid move!')
      setTimeout(() => {
        setShowInvalidMove(false)
        setInvalidMoveMessage(null)
        setInvalidMoveSquare(null)
      }, 1000)
      return false
    }
    return false
  }
  
  // Handle square clicks for piece moves
  function onSquareClick(square: Square) {
    if (!isGameStarted || !isPlayerTurn) return
    if (selectedPiece) {
      try {
        const move = game.move({
          from: selectedPiece,
          to: square,
          promotion: 'q',
        })
        if (move) {
          updateGameState(move.san, !firstMoveMade && game.turn() === 'w')
          setSelectedPiece(null)
          setOptionSquares({})
          setLastMove({
            from: selectedPiece,
            to: square
          })
          return
        }
      } catch (error) {
        console.error('Error on square click:', error)
        setInvalidMoveSquare(selectedPiece)
        setShowInvalidMove(true)
        setInvalidMoveMessage('Invalid move!')
        setTimeout(() => {
          setShowInvalidMove(false)
          setInvalidMoveMessage(null)
          setInvalidMoveSquare(null)
        }, 1000)
        return
      }
      if (square === selectedPiece) {
        setSelectedPiece(null)
        setOptionSquares({})
        return
      }
      const piece = game.get(square)
      if (
        piece &&
        ((piece.color === 'w' && game.turn() === 'w') ||
          (piece.color === 'b' && game.turn() === 'b'))
      ) {
        setSelectedPiece(square)
        showPossibleMoves(square)
        return
      }
    }
    const piece = game.get(square)
    if (
      piece &&
      ((piece.color === 'w' && game.turn() === 'w') ||
        (piece.color === 'b' && game.turn() === 'b'))
    ) {
      setSelectedPiece(square)
      showPossibleMoves(square)
    }
  }
  
  // Show possible moves for a piece
  function showPossibleMoves(square: Square) {
    const moves = game.moves({ square, verbose: true })
    if (moves.length > 0) {
      const newSquares: OptionSquares = {}
      moves.forEach((move) => {
        newSquares[move.to] = move.captured
          ? {
              background: 'radial-gradient(circle, transparent 70%, rgba(255, 255, 255, 0.8) 70%)',
              borderRadius: '0',
            }
          : {
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 25%, transparent 25%)',
              borderRadius: '0',
            }
      })
      setOptionSquares(newSquares)
    }
  }
  
  // Highlight possible targets on drag start
  function onPieceDragBegin(piece: string, sourceSquare: string) {
    if (!isPlayerTurn) return
    const moves = game.moves({ square: sourceSquare as Square, verbose: true })
    if (moves.length > 0) {
      const newSquares: OptionSquares = {}
      moves.forEach((move) => {
        newSquares[move.to] = move.captured
          ? {
              background: 'radial-gradient(circle, transparent 70%, rgba(255, 255, 255, 0.8) 70%)',
              borderRadius: '0',
            }
          : {
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 25%, transparent 25%)',
              borderRadius: '0',
            }
      })
      setOptionSquares(newSquares)
    }
  }
  
  function onPieceDragEnd() {
    setOptionSquares({})
  }
  
  // Update board width based on container size
  useEffect(() => {
    const updateBoardWidth = () => {
      const container = document.querySelector('.chess-board-container')
      if (container) {
        const containerWidth = container.clientWidth
        const containerHeight = window.innerHeight
        // Use 90% of the container width or height, whichever is smaller
        const maxSize = Math.min(containerWidth * 0.9, containerHeight * 0.7)
        // Set a minimum size of 280px to ensure the board is always visible
        setBoardWidth(Math.max(maxSize, 280))
      }
    }
    updateBoardWidth()
    window.addEventListener('resize', updateBoardWidth)
    return () => window.removeEventListener('resize', updateBoardWidth)
  }, [])
  
  // Check for check state to highlight the king
  useEffect(() => {
    if (!game) return
    const turn = game.turn()
    const isInCheck = game.inCheck()
    setInCheck(isInCheck)
    if (isInCheck) {
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
    <div className="chess-board-container w-full h-full">
      <div className="board-wrapper">
        {showInvalidMove && invalidMoveMessage && (
          <div className="invalid-move-message">
            {invalidMoveMessage}
          </div>
        )}
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          onSquareClick={onSquareClick}
          onPieceDragBegin={onPieceDragBegin}
          onPieceDragEnd={onPieceDragEnd}
          customBoardStyle={{
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            width: '100%',
            height: '100%',
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
            ...(invalidMoveSquare ? {
              [invalidMoveSquare]: { animation: 'invalid-move 0.15s ease-in-out' }
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
    </div>
  )
}
