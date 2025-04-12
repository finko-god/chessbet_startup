'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { X } from 'lucide-react'
import { Toast } from './ui/toast'

interface Game {
  id: string
  player1: {
    id: string
    name: string
  }
  player2?: {
    id: string
    name: string
  }
  betAmount: number
  status: string
}

export default function Lobby() {
  const [games, setGames] = useState<Game[]>([])
  const [betAmount, setBetAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const router = useRouter()

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setGames(data)
      }
    } catch (error) {
      console.error('Error fetching games:', error)
    }
  }

  useEffect(() => {
    fetchGames()
    // Set up polling to refresh games list
    const interval = setInterval(fetchGames, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleCreateGame = async () => {
    try {
      setIsCreating(true);
      setError(null);
      
      const amount = parseInt(betAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid bet amount');
        return;
      }
  
      const response = await fetch('/api/games/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ betAmount: amount }),
      });
  
      const data = await response.json();
      
      if (response.ok) {
        router.push(`/game/${data.id}`);
      } else {
        // Handle specific error cases
        if (data.error?.includes('Insufficient ChessCoins')) {
          setShowToast(true);
        } else if (response.status === 401) {
          router.push('/signin');
        } else {
          setError(data.error || 'Failed to create game');
          setShowToast(true);
        }
      }
    } catch (error) {
      setShowToast(true);
      setError('Failed to create game. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }

  const handleJoinGame = async (gameId: string) => {
    try {
      setIsJoining(gameId)
      setError(null)
      
      const response = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        credentials: 'include',
      })

      const responseData = await response.json()
      
      if (response.ok) {
        router.push(`/game/${gameId}`)
      } else {
        if (responseData.error && responseData.error.includes('Insufficient ChessCoins')) {
          setError('You don\'t have enough ChessCoins to join this game. Please check your balance in your account page.')
        } else {
          setError(responseData.error || 'Failed to join game')
        }
      }
    } catch (error) {
      console.error('Error joining game:', error)
      setError('Failed to join game')
    } finally {
      setIsJoining(null)
    }
  }

  const handleDismissError = () => {
    setError(null)
  }

  return (
    <div className="space-y-6">
      <Toast
        message="Insufficient ChessCoins! Please check your balance in the account page."
        isOpen={showToast}
        onClose={() => setShowToast(false)}
      />
      {error && !showToast && (
        <Alert variant="warning" className="relative">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={handleDismissError}>
            <X size={16} />
          </Button>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Create New Game</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="betAmount">Bet Amount (ChessCoins)</Label>
              <Input
                id="betAmount"
                type="number"
                min="1"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="Enter bet amount"
              />
            </div>
            <Button 
              onClick={handleCreateGame} 
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? 'Creating...' : 'Create Game'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {games.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {games.filter(game => game.status === 'waiting').map((game) => (
                <div key={game.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                  <div>
                    <p className="font-medium">{game.player1.name}'s Game</p>
                    <p className="text-sm text-muted-foreground">Bet: {game.betAmount} ChessCoins</p>
                  </div>
                  <Button 
                    onClick={() => handleJoinGame(game.id)}
                    disabled={isJoining === game.id}
                  >
                    {isJoining === game.id ? 'Joining...' : 'Join Game'}
                  </Button>
                </div>
              ))}
              {games.filter(game => game.status === 'waiting').length === 0 && (
                <p className="text-center text-muted-foreground">No games available to join</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}