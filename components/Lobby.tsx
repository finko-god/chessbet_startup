'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CreateGameModal } from './CreateGameModal';
import { useRouter } from 'next/navigation';
import { X, Crown } from 'lucide-react';
// import { ChessboardComponent } from './ChessBoard';

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

interface LobbyProps {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

export function Lobby({ isCreateModalOpen, setIsCreateModalOpen }: LobbyProps) {
  const [games, setGames] = useState<Game[]>([]);
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

  // Listen for refresh-games event
  useEffect(() => {
    const handleRefreshGames = () => {
      fetchGames();
    };

    const element = document.querySelector('.games-list');
    if (element) {
      element.addEventListener('refresh-games', handleRefreshGames);
      return () => element.removeEventListener('refresh-games', handleRefreshGames);
    }
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
      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left pl-10 py-3 px-4 text-muted-foreground font-medium">Player</th>
              <th className="text-center py-3 px-4 text-muted-foreground font-medium">Time Control</th>
              <th className="text-center py-3 px-4 text-muted-foreground font-medium">Bet Amount</th>
              <th className="text-right pr-10 py-3 px-4 text-muted-foreground font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr 
                key={game.id} 
                className="border-b border-border hover:bg-accent/5 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                                  <Crown className="w-4 h-4 text-primary" />
                    <span className="font-medium">{game.player1.name}</span>
                  </div>
                </td>

                <td className="py-4 px-4 text-center">
                  <span className="font-medium">
                    {game.timeControl === '3+2' ? '3 min + 2 sec' : '5 min'}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
  
                  <span className="font-medium text-primary">{game.betAmount}</span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {game.player1.id === user?.id && game.status === 'waiting' && (
                      <Button 
                        onClick={() => handleCancelGame(game.id)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                      >
                        <X size={16} />
                      </Button>
                    )}
                    <Button
                      onClick={() => handleJoinGame(game.id)}
                      disabled={game.status !== 'waiting' || game.player1.id === user?.id}
                      size="sm"
                      variant={game.player1.id === user?.id ? "outline" : "default"}
                      className={game.player1.id === user?.id ? "pointer-events-none" : ""}
                    >
                      {game.player1.id === user?.id ? 'Your Game' : 'Join Game'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateGameModal
        isOpen={isCreateModalOpen}
        onCloseAction={async () => setIsCreateModalOpen(false)}
        onCreateAction={handleCreateGame}
      />
    </div>
  );
}