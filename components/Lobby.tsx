'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateGameModal } from './CreateGameModal';
import { useRouter } from 'next/navigation';
import { X, RefreshCw, Plus, Crown } from 'lucide-react';

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
  timeControl: string;
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

  const handleCreateGame = async (betAmount: number, timeControl: string) => {
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
        body: JSON.stringify({ betAmount, timeControl }),
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
      <div className="space-y-8">
        <div className="flex justify-center items-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Loading Games
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="relative animate-pulse glass-effect">
              <CardHeader>
                <div className="h-7 bg-primary/20 rounded-full w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-5 bg-primary/20 rounded-full w-3/4"></div>
                  <div className="h-5 bg-primary/20 rounded-full w-1/2"></div>
                  <div className="h-5 bg-primary/20 rounded-full w-2/3"></div>
                  <div className="h-10 bg-primary/20 rounded-lg w-full mt-6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-center gap-6">
        <div className="text-center sm:text-left">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Available Games
          </h2>
          <p className="text-muted-foreground mt-2">Join an existing game or create your own</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button 
            onClick={() => fetchGames()} 
            variant="outline"
            className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/20"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="gap-2 hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Create Game
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <Card key={game.id} className="relative glass-effect hover:shadow-lg transition-all duration-300">
            {game.player1.id === user?.id && game.status === 'waiting' && (
              <Button 
                onClick={() => handleCancelGame(game.id)}
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                aria-label="Cancel Game"
              >
                <X size={18} />
              </Button>
            )}
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                {game.player1.name}&apos;s Game
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Bet Amount</span>
                </div>
                <span className="text-lg font-bold text-primary">{game.betAmount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Time Control</span>
                <span className="text-sm font-medium">
                  {game.timeControl === '3+2' ? '3 min + 2 sec' : '5 min'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`text-sm font-medium ${
                  game.status === 'waiting' ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {game.status === 'waiting' ? 'Waiting for opponent' : 'In progress'}
                </span>
              </div>
              <Button
                onClick={() => handleJoinGame(game.id)}
                disabled={game.status !== 'waiting' || game.player1.id === user?.id}
                className="w-full mt-4 hover:bg-primary/90"
              >
                {game.player1.id === user?.id ? 'Your Game' : 'Join Game'}
              </Button>
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