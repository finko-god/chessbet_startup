'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ChessCoinBalance from '@/app/components/ChessCoinBalance';

interface User {
  id: string;
  name: string;
  email: string;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          router.push('/signin');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/signin');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        window.location.href = '/';
      } else {
        console.error('Sign out failed:', await response.text());
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-accent/20 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-4 bg-accent/20 rounded w-3/4"></div>
              <div className="h-4 bg-accent/20 rounded w-1/2"></div>
              <div className="h-4 bg-accent/20 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Name</span>
                <span className="text-foreground font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground font-medium">{user.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">ChessCoins Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col text-primary items-center justify-center py-8">
              <ChessCoinBalance />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={() => router.push('/')}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Return to Lobby
              </Button>
              <Button 
                onClick={handleSignOut}
                variant="outline" 
                className="w-full border-destructive text-destructive hover:bg-destructive/10"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 