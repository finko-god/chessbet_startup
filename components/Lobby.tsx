'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateGameModal } from './CreateGameModal';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface Game {
  id: string;
  player1: {
    id: string;
    name: string;
  };
  player2?: {
    id: string;
    name: string;
  };
  betAmount: number;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export function Lobby() {
  const [games, setGames] = useState<Game[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // Fetch current user
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };

    checkAuth();
  }, []);

  // Fetch available games for joining
  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      const data = await response.json();
      setGames(data);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user is part of any active games
  const checkActiveGames = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/games/active', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        return;
      }
      
      const activeGames = await response.json();
      
      // If user is part of a started game, redirect to that game
      for (const game of activeGames) {
        if (game.status === 'started' && 
           (game.player1.id === user.id || game.player2?.id === user.id)) {
          router.push(`/game/${game.id}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking active games:', error);
    }
  };

  useEffect(() => {
    fetchGames();
    
    // Only check active games if there is a user
    if (user?.id) {
      checkActiveGames();
      
      // Poll for active games for this user
      const activeGamesInterval = setInterval(checkActiveGames, 3000);
      return () => clearInterval(activeGamesInterval);
    }
  }, [user?.id]);

  // Set up polling for available games regardless of session
  useEffect(() => {
    const gamesInterval = setInterval(fetchGames, 5000);
    return () => clearInterval(gamesInterval);
  }, []);

  const handleCreateGame = async (betAmount: number) => {
    if (!user) {
      console.error('No user found');
      router.push('/signin');
      return;
    }

    try {
      const response = await fetch('/api/games/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ betAmount }),
      });
      
      if (response.ok) {
        const data = await response.json();
        await fetchGames();
        setIsCreateModalOpen(false);
        router.push(`/game/${data.id}`);
      } else {
        const error = await response.json();
        console.error('Error creating game:', error);
        if (response.status === 401) {
          router.push('/signin');
        }
      }
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    if (!user?.id) {
      console.error('No user session');
      router.push('/signin');
      return;
    }

    try {
      const response = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        router.push(`/game/${gameId}`);
      } else {
        const error = await response.json();
        console.error('Error joining game:', error);
        if (response.status === 401) {
          router.push('/signin');
        }
      }
    } catch (error) {
      console.error('Error joining game:', error);
    }
  };

  const handleCancelGame = async (gameId: string) => {
    try {
      const response = await fetch(`/api/games/${gameId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        await fetchGames();
      } else {
        const error = await response.json();
        console.error('Error canceling game:', error);
      }
    } catch (error) {
      console.error('Error canceling game:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Loading Games</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="relative animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded w-full mt-4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Available Games</h2>
        <div className="space-x-2">
          <Button onClick={() => fetchGames()}>Refresh</Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>Create Game</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <Card key={game.id} className="relative">
            {game.player1.id === user?.id && game.status === 'waiting' && (
              <Button 
                onClick={() => handleCancelGame(game.id)}
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                aria-label="Cancel Game"
              >
                <X size={16} />
              </Button>
            )}
            <CardHeader>
              <CardTitle>Game #{game.id.slice(0, 6)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>Creator: {game.player1.name}</p>
                <p>Bet Amount: ${game.betAmount}</p>
                <p>Status: {game.status}</p>
                {game.status === 'waiting' && user?.id && game.player1.id !== user.id && (
                  <Button 
                    onClick={() => handleJoinGame(game.id)}
                    className="w-full"
                  >
                    Join Game
                  </Button>
                )}
                {game.player1.id === user?.id && game.status === 'waiting' && (
                  <p className="text-sm text-muted-foreground">Waiting for opponent...</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateGameModal
        isOpen={isCreateModalOpen}
        onCloseAction={async () => setIsCreateModalOpen(false)}
        onCreateAction={handleCreateGame}
      />
    </div>
  );
}