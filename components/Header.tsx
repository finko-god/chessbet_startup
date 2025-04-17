'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
// import ChessCoinBalance from '@/components/ChessCoinBalance';
import { Crown } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  chessCoin: number;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-background border-b border-border">
      <div className="container mx-auto py-2">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-primary">ChessBet</span>
            </Link>
            <nav className="hidden md:flex space-x-4">
              <Link
                href="/"
                className={`text-md font-medium transition-colors hover:text-primary ${
                  isActive('/') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Play
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium"><Crown className="w-4 h-4" /></span>
                  <span className="text-sm font-bold">{user.chessCoin}</span>
                </div>
                <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium">${user.chessCoin}</span>
                </div>
              </div>
            )}
            {user ? (
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            ) : (
              <Button variant="outline" onClick={() => router.push('/signin')}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}