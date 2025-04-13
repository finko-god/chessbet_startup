'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ChessBoard from '@/components/ChessBoard'
import ChessClock from '@/components/ChessClock'
import { use } from 'react'
import { X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
  player1TimeLeft: number | null
  player2TimeLeft: number | null
  lastMoveAt: string | null
}

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = use(params)
  const router = useRouter()
  
  const [game, setGame] = useState<Game | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [finishMessage, setFinishMessage] = useState<string | null>(null)
  const [gameResult, setGameResult] = useState<{ winner: string | null, reason: string } | null>(null)
  const [redirectedFromJoin, setRedirectedFromJoin] = useState(false)
  const [joiningGame, setJoiningGame] = useState(false)

  // Fetch user data on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' })
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
      const response = await fetch(`/api/games/${gameId}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch game')
      const data = await response.json()
      setGame(data)
      if (data.status === 'finished') {
        setFinishMessage('Game has ended. Redirecting to lobby...')
        setTimeout(() => router.push('/'), 3000)
      }
    } catch (error) {
      console.error('Error fetching game:', error)
      setError('Failed to load game')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinGame = async () => {
    setJoiningGame(true)
    setError(null)
    try {
      const response = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        credentials: 'include',
      })
      let responseData
      try {
        responseData = await response.json()
      } catch (parseError) {
        console.error('Error parsing response:', parseError)
        setError('Failed to join game: invalid response from server')
        setJoiningGame(false)
        return
      }
  
      if (response.ok) {
        window.location.href = `/game/${gameId}?joined=true`
      } else {
        if (responseData.error && responseData.error.includes('Insufficient ChessCoins')) {
          setError('You don\'t have enough ChessCoins to join this game. Please check your balance in your account page.')
        } else {
          setError(responseData.error || 'Failed to join game')
        }
      }
    } catch (error) {
      console.error('Error joining game:', error)
      setError('Failed to join game: network or server error')
    } finally {
      setJoiningGame(false)
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
        setTimeout(() => router.push('/'), 2500)
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: reason, winnerId: winner }),
      })
    } catch (error) {
      console.error('Error recording game result:', error)
    }
  }

  const handleTimeEnd = async (gameId: string, winner: 'white' | 'black') => {
    const winnerId = winner === 'white' ? game?.whitePlayerId : game?.blackPlayerId
    if (winnerId) {
      setGameResult({ winner: winnerId, reason: 'time' })
      try {
        await fetch(`/api/games/${gameId}/result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ result: 'time', winnerId: winnerId }),
        })
        await fetchGame()
      } catch (error) {
        console.error('Error recording game result:', error)
      }
    }
  }

  const handleDismissError = () => {
    setError(null)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-accent/20 rounded mb-4"></div>
          <div className="h-64 bg-accent/20 rounded-lg"></div>
          <div className="h-24 bg-accent/20 rounded mt-4"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={handleDismissError}>
            <X size={16} />
          </Button>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-4">
          Return to Lobby
        </Button>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-card">
          <CardContent className="p-6">
            <p className="text-foreground">Game not found</p>
            <Button onClick={() => router.push('/')} className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
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
        <Card className="bg-card">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-medium text-foreground">{finishMessage}</p>
            <div className="mt-4 text-center text-muted-foreground animate-pulse">
              Redirecting...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (gameResult) {
    const winnerName =
      gameResult.winner === game.player1.id
        ? game.player1.name
        : game.player2 && gameResult.winner === game.player2.id
        ? game.player2.name
        : 'Draw'
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-card">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-4 text-foreground">Game Over</h2>
            <p className="text-lg text-foreground">
              {gameResult.winner
                ? `${winnerName} won by ${gameResult.reason}`
                : `Game ended in a ${gameResult.reason}`}
            </p>
            <Button onClick={() => router.push('/')} className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
              Return to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <Card className="mb-6 bg-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">White</p>
                <p className="font-medium">
                  {game.whitePlayerId === game.player1.id ? game.player1.name : game.player2?.name || 'Waiting...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Black</p>
                <p className="font-medium">
                  {game.blackPlayerId === game.player1.id ? game.player1.name : game.player2?.name || 'Waiting...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Bet Amount</p>
                <p className="font-medium">{game.betAmount} ChessCoins</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{game.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="bg-card rounded-lg p-4 h-[calc(100vh-200px)] min-h-[600px]">
              <ChessBoard
                gameId={gameId}
                player1Id={game.player1.id}
                player2Id={game.player2?.id}
                whitePlayerId={game.whitePlayerId}
                blackPlayerId={game.blackPlayerId}
                initialFen={game.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
                initialPgn={game.pgn}
                onGameEnd={handleGameEnd}
                isWhitePlayer={user?.id === game.whitePlayerId}
                isGameStarted={game.status === 'started'}
              />
            </div>
          </div>
          <div className="col-span-1 space-y-4">
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-lg font-medium">
                    {!game.fen || game.fen.split(' ')[1] === 'w' ? 'White to move' : 'Black to move'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user?.id === ((!game.fen || game.fen.split(' ')[1] === 'w') ? game.whitePlayerId : game.blackPlayerId)
                      ? 'Your turn'
                      : 'Opponent\'s turn'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <ChessClock
              gameId={gameId}
              isWhitePlayer={user?.id === game.whitePlayerId}
              whiteTime={game.player1TimeLeft || 300000}
              blackTime={game.player2TimeLeft || 300000}
              isWhiteTurn={!game.fen || game.fen.split(' ')[1] === 'w'}
              isGameStarted={game.status === 'started'}
              onTimeEndAction={handleTimeEnd}
            />
            <Card className="bg-card">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-lg">Move History</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-64 overflow-y-auto pr-2 move-history">
                  {game.pgn ? (
                    <div className="space-y-1">
                      {game.pgn
                        .split('\n')
                        .filter(line => !line.startsWith('[') && line.trim() !== '')
                        .join(' ')
                        .split(/\d+\./)
                        .filter(move => move.trim() !== '')
                        .map((move, index) => (
                          <div key={index} className="flex items-center text-sm">
                            <span className="w-8 text-muted-foreground">{index + 1}.</span>
                            <span className="px-2 py-1 rounded bg-muted">
                              {move.trim()}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No moves yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
            {game.status === 'waiting' && !game.player2 && (
              <Button
                onClick={handleJoinGame}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={joiningGame}
              >
                {joiningGame ? 'Joining...' : 'Join Game'}
              </Button>
            )}
            {game.status === 'started' && (
              <Button
                onClick={handleFinishGame}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isFinishing}
              >
                {isFinishing ? 'Finishing...' : 'Finish Game'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden space-y-4">
        <Card className="bg-card">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">White: </span>
                <span className="font-medium">
                  {game.whitePlayerId === game.player1.id ? game.player1.name : game.player2?.name || 'Waiting...'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Black: </span>
                <span className="font-medium">
                  {game.blackPlayerId === game.player1.id ? game.player1.name : game.player2?.name || 'Waiting...'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Bet: </span>
                <span className="font-medium">{game.betAmount} ChessCoins</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status: </span>
                <span className="font-medium capitalize">{game.status}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="bg-card rounded-lg p-3 text-center">
          <p className="font-medium">
            {!game.fen || game.fen.split(' ')[1] === 'w' ? 'White to move' : 'Black to move'}
          </p>
          <p className="text-sm text-muted-foreground">
            {user?.id === ((!game.fen || game.fen.split(' ')[1] === 'w') ? game.whitePlayerId : game.blackPlayerId)
              ? 'Your turn'
              : 'Opponent\'s turn'}
          </p>
        </div>
  {/* ChessBoard Container */}
  <div className="w-full px-2"> {/* Add horizontal padding */}
    <div className="bg-card rounded-lg aspect-square shadow-lg overflow-hidden">
      <ChessBoard
        gameId={gameId}
        player1Id={game.player1.id}
        player2Id={game.player2?.id}
        whitePlayerId={game.whitePlayerId}
        blackPlayerId={game.blackPlayerId}
        initialFen={game.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
        initialPgn={game.pgn}
        onGameEnd={handleGameEnd}
        isWhitePlayer={user?.id === game.whitePlayerId}
        isGameStarted={game.status === 'started'}
      />
    </div>
  </div>
        <ChessClock
          gameId={gameId}
          isWhitePlayer={user?.id === game.whitePlayerId}
          whiteTime={game.player1TimeLeft || 300000}
          blackTime={game.player2TimeLeft || 300000}
          isWhiteTurn={!game.fen || game.fen.split(' ')[1] === 'w'}
          isGameStarted={game.status === 'started'}
          onTimeEndAction={handleTimeEnd}
        />
        <Card className="bg-card">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-base">Move History</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-40 overflow-y-auto pr-1 move-history">
              {game.pgn ? (
                <div className="space-y-1">
                  {game.pgn
                    .split('\n')
                    .filter(line => !line.startsWith('[') && line.trim() !== '')
                    .join(' ')
                    .split(/\d+\./)
                    .filter(move => move.trim() !== '')
                    .map((move, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <span className="w-6 text-muted-foreground">{index + 1}.</span>
                        <span className="px-2 py-1 rounded bg-muted text-xs">
                          {move.trim()}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No moves yet</p>
              )}
            </div>
          </CardContent>
        </Card>
        {game.status === 'waiting' && !game.player2 && (
          <Button
            onClick={handleJoinGame}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={joiningGame}
          >
            {joiningGame ? 'Joining...' : 'Join Game'}
          </Button>
        )}
        {game.status === 'started' && (
          <Button
            onClick={handleFinishGame}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isFinishing}
          >
            {isFinishing ? 'Finishing...' : 'Finish Game'}
          </Button>
        )}
      </div>
    </div>
  )
}
