'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ChessBoard from '@/app/components/ChessBoard'
import { use } from 'react'

interface User {
  id: string
  name: string
  email: string
}

interface Game {
  id: string
  player1: {
    id: string
    name: string
  }
  player2: {
    id: string
    name: string
  } | null
  betAmount: number
  status: string
  fen: string | null
  pgn: string | null
  winner: string | null
  whitePlayerId: string | null
  blackPlayerId: string | null
}

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  // Properly unwrap params promise using React.use
  const { id: gameId } = use(params)
  
  // All useState hooks grouped together at the top
  const [game, setGame] = useState<Game | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [finishMessage, setFinishMessage] = useState<string | null>(null)
  const [gameResult, setGameResult] = useState<{ winner: string | null, reason: string } | null>(null)
  const [redirectedFromJoin, setRedirectedFromJoin] = useState(false)
  
  const router = useRouter()

  // All useEffect hooks grouped together
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          router.push('/signin')
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        router.push('/signin')
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('joined') === 'true') {
      setRedirectedFromJoin(true)
      window.history.replaceState({}, '', `/game/${gameId}`)
    }
  }, [gameId])

  useEffect(() => {
    if (gameId) {
      fetchGame()
      
      if (!redirectedFromJoin) {
        const interval = setInterval(fetchGame, 2000)
        return () => clearInterval(interval)
      }
    }
  }, [gameId, redirectedFromJoin])

  useEffect(() => {
    if (game && user) {
      console.log('Game page debug:', {
        userId: user.id,
        player1Id: game.player1?.id,
        player2Id: game.player2?.id,
        isCreator: user.id === game.player1?.id,
        isJoiner: game.player2 && user.id === game.player2?.id,
        gameStatus: game.status,
        initialFen: game.fen
      })
    }
  }, [game, user])

  const fetchGame = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch game')
      }

      const data = await response.json()
      setGame(data)

      // If game is finished, show message and redirect to lobby after a delay
      if (data.status === 'finished') {
        setFinishMessage('Game has ended. Redirecting to lobby...')
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    } catch (error) {
      console.error('Error fetching game:', error)
      setError('Failed to load game')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinGame = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        // Add a flag to URL to remember we just joined
        window.location.href = `/game/${gameId}?joined=true`
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to join game')
      }
    } catch (error) {
      console.error('Error joining game:', error)
      setError('Failed to join game')
    }
  }

  const handleFinishGame = async () => {
    setIsFinishing(true)
    try {
      const response = await fetch(`/api/games/${gameId}/finish`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        setFinishMessage('Game finished! Both players will be redirected to the lobby...')
        // Redirect to landing page after a short delay
        setTimeout(() => {
          router.push('/')
        }, 2500)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to finish game')
        setIsFinishing(false)
      }
    } catch (error) {
      console.error('Error finishing game:', error)
      setError('Failed to finish game')
      setIsFinishing(false)
    }
  }

  const handleGameEnd = async (winner: string | null, reason: string) => {
    setGameResult({ winner, reason })
    
    try {
      await fetch(`/api/games/${gameId}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          result: reason,
          winnerId: winner,
        }),
      })
    } catch (error) {
      console.error('Error recording game result:', error)
    }
  }

  if (isLoading) {
    return <div>Loading game...</div>
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">{error}</p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Return to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p>Game not found</p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Return to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (finishMessage) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-lg font-medium">{finishMessage}</p>
            <div className="mt-4 text-center animate-pulse">
              Redirecting...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (gameResult) {
    const winnerName = gameResult.winner === game.player1.id 
      ? game.player1.name 
      : (game.player2 && gameResult.winner === game.player2.id ? game.player2.name : 'Draw');
    
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Game Over</h2>
            <p className="text-lg">
              {gameResult.winner 
                ? `${winnerName} won by ${gameResult.reason}` 
                : `Game ended in a ${gameResult.reason}`}
            </p>
            <Button onClick={() => router.push('/')} className="mt-6">
              Return to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isGameCreator = user?.id === game.player1.id
  const isGamePlayer = game.player2 && user?.id === game.player2.id
  const canJoin = !isGameCreator && !isGamePlayer && game.status === 'waiting' && user?.id

  // Determine if we can show the chess board (game has started and user is a player)
  const showChessBoard = game.status === 'started' && (isGameCreator || isGamePlayer)

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Game #{game.id.slice(0, 8)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Players</h3>
              <p>Player 1 (White): {game.player1.name}</p>
              <p>Player 2 (Black): {game.player2?.name || 'Waiting for opponent...'}</p>
            </div>
            <div>
              <h3 className="font-semibold">Bet Amount</h3>
              <p>${game.betAmount}</p>
            </div>
            <div>
              <h3 className="font-semibold">Status</h3>
              <p className={game.status === 'started' ? "text-green-600 font-medium" : ""}>
                {game.status === 'waiting' ? 'Waiting for opponent' : 
                 game.status === 'started' ? 'Game in progress' : 
                 'Game finished'}
              </p>
            </div>

            {canJoin && (
              <Button
                onClick={handleJoinGame}
                className="w-full"
              >
                Join Game
              </Button>
            )}

            {game.status === 'started' && (
              <Button
                onClick={handleFinishGame}
                disabled={isFinishing}
                variant="outline"
                className="w-full"
              >
                {isFinishing ? 'Finishing game...' : 'Finish Game (Draw)'}
              </Button>
            )}

            {showChessBoard && (
              <div className="mt-6">
                <ChessBoard
                  gameId={game.id}
                  player1Id={game.player1.id}
                  player2Id={game.player2?.id}
                  whitePlayerId={game.whitePlayerId}
                  blackPlayerId={game.blackPlayerId}
                  initialFen={game.fen || undefined}
                  initialPgn={game.pgn || undefined}
                  onGameEnd={handleGameEnd}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
