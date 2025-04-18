'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

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
          
          <div className="flex items-center space-x-4">
            {isLoading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : user ? (
              <>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium"><Crown className="w-4 h-4" /></span>
                  <span className="text-sm font-bold">{user.chessCoin}</span>
                </div>

              </div>
                <Link href="/account">
                  <Button variant="ghost" size="sm" className="hover:text-muted-foreground text-primary">
                    Account
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="hover:text-muted-foreground text-primary"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/signin">
                  <Button className='px-5 py-2' size="sm"  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className='px-4' size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}