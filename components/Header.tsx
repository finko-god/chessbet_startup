'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import ChessCoinBalance from '@/components/ChessCoinBalance';

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

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [pathname]);

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

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto py-2">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-primary">ChessBet</span>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link
                href="/"
                className={`text-md font-medium transition-all duration-200 hover:text-primary ${
                  isActive('/') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Play
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {isLoading ? (
              <div className="h-8 w-20 bg-primary/10 rounded-full animate-pulse"></div>
            ) : user ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 hover:bg-primary/15 transition-colors duration-200">
                    <ChessCoinBalance />
                  </div>
                </div>
                <Link href="/account">
                  <Button variant="ghost" size="sm" className="hover:text-primary hover:bg-primary/10 transition-colors duration-200">
                    Account
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/signin">
                  <Button className='px-5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors duration-200' size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className='px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200' size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}