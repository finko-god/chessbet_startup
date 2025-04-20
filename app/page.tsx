'use client'
import { ChessboardComponent } from '@/components/ChessboardComponent';
import { Lobby } from '@/components/Lobby';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchGames = () => {
    // This will be handled by the Lobby component's internal fetchGames
    const lobbyElement = document.querySelector('.games-list');
    if (lobbyElement) {
      const event = new Event('refresh-games');
      lobbyElement.dispatchEvent(event);
    }
  };

  return (
    <main className="container mx-auto p-4 min-h-[150vh] lg:min-h-0">
      <h1 className="text-3xl font-bold mb-6 text-center">Chess Betting Platform</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="order-1 lg:order-1">
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-center gap-6 mb-8">
            <div className="text-center sm:text-left">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Available Games
              </h2>
              <p className="text-muted-foreground mt-2">Join an existing game or create your own</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button 
                onClick={fetchGames} 
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
          <div className="block lg:hidden mb-8">
            <div className="w-full max-w-[280px] mx-auto">
              <ChessboardComponent />
            </div>
          </div>
          <div className="games-list">
            <Lobby isCreateModalOpen={isCreateModalOpen} setIsCreateModalOpen={setIsCreateModalOpen} />
          </div>
        </div>
        <div className="hidden lg:flex order-2 items-start justify-center sticky top-4">
          <div className="w-full max-w-[400px]">
            <ChessboardComponent />
          </div>
        </div>
      </div>
    </main>
  );
}
