'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import ChessCoinBalance from '@/components/ChessCoinBalance';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface User {
  id: string;
  name: string;
  email: string;
  chessCoin: number;
  stripeConnectId: string | null;
  ableForPayouts: boolean;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const router = useRouter();

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

  useEffect(() => {
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

  const handleTopUp = async () => {
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user?.email,
        }),
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  const handleVerifyAccount = async () => {
    try {
      const response = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating connect account:', error);
    }
  };

  const handleWithdraw = async () => {
    try {
      const amount = parseInt(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        return;
      }

      const response = await fetch('/api/stripe/create-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        setIsWithdrawDialogOpen(false);
        // Refresh user data to update balance
        await fetchUserData();
      } else {
        const error = await response.json();
        console.error('Withdrawal failed:', error);
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
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
                        
                <Alert className="text-white border-blue-400 mb-4">
                  <AlertDescription>
                    To withdraw your ChessCoins, you need to verify your identity. This is a secure process handled by Stripe.
                    We've simplified verification by pre-filling your email and business information for your convenience.
                  </AlertDescription>
                </Alert>

              


              

            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <ChessCoinBalance />
              <div className="flex space-x-4 w-full max-w-xs">
                <Button
                  onClick={handleVerifyAccount}
                  className={`flex-1 ${user.ableForPayouts ? 'bg-gray-400 cursor-not-allowed' : ''}`}
                  disabled={user.ableForPayouts}
                  title={`${user.ableForPayouts ? "Account already verified" : "Verify account for withdrawals"}`}
                >
                  Verify Account
                </Button>
                <Button
                  onClick={() => setIsWithdrawDialogOpen(true)}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  Withdraw
                </Button>
              </div>
              <Button onClick={handleTopUp} className="w-full max-w-xs">
                Top Up ChessCoins
              </Button>
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

        <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw ChessCoins</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount to withdraw</label>
                <Input
                  type="number"
                  min="1"
                  max={user.chessCoin}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Max: ${user.chessCoin} ChessCoins`}
                />
                <p className="text-sm text-muted-foreground">
                  Note: 1 ChessCoin = 1 EUR. A commission fee of 1 EUR will be deducted.
                </p>
                {withdrawAmount && (
                  <p className="text-sm">
                    You will receive: {Math.max(0, parseInt(withdrawAmount) - 1)} EUR
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsWithdrawDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleWithdraw}>
                  Confirm Withdrawal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 