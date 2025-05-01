'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ChessCoinBalance from '@/components/ChessCoinBalance';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  chessCoin: number;
  stripeConnectId: string | null;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
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

  const handleTransfer = async () => {
    if (!transferAmount || parseInt(transferAmount) <= 0) {
      setTransferError('Please enter a valid amount');
      return;
    }

    setIsTransferring(true);
    setTransferError('');

    try {
      const response = await fetch('/api/stripe/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: parseInt(transferAmount) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transfer funds');
      }

      setIsTransferDialogOpen(false);
      setTransferAmount('');
      await fetchUserData();
      
      // Show success alert
      setShowSuccessAlert(true);
      // Hide alert after 5 seconds
      setTimeout(() => setShowSuccessAlert(false), 5000);
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : 'Failed to transfer funds');
    } finally {
      setIsTransferring(false);
    }
  };

  // const handleManagePayouts = async () => {
  //   try {
  //     const response = await fetch('/api/stripe/create-login-link', {
  //       method: 'POST',
  //     });
      
  //     const { url } = await response.json();
  //     window.location.href = url;
  //   } catch (error) {
  //     console.error('Error accessing payouts:', error);
  //   }
  // };

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
        {showSuccessAlert && (
          <Alert className="bg-primary border-primary animate-in slide-in-from-top-5 duration-500">
            <CheckCircle2 className="h-4 w-4 text-black" />
            <AlertDescription className="text-black">
              Payout successful! Your payment will be processed within 24 hours, and it will be in your bank account in a few days.
            </AlertDescription>
          </Alert>
        )}
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
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <ChessCoinBalance />
              <div className="flex space-x-4 w-full max-w-xs">
                <Button
                  onClick={handleVerifyAccount}
                  className="flex-1"
                  title={user.stripeConnectId ? "View Stripe Connect account" : "Connect Stripe account"}
                >
                  {user.stripeConnectId ? "My Account" : "Connect Account"}
                </Button>
                <Button
                  onClick={() => setIsTransferDialogOpen(true)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                  disabled={!user.stripeConnectId}
                  title={!user.stripeConnectId ? "Please connect Stripe account first" : ""}
                >
                  Payout to Bank
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
            <CardTitle className="text-2xl font-bold text-foreground">Withdrawal Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How to Withdraw Your Winnings</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p className="font-medium text-amber-600">All verification steps are required for legal compliance and the safety of all users. This process helps prevent fraud and ensures secure transactions.</p>
                    
                    <h3 className="font-semibold">Step 1: Connect Your Stripe Account</h3>
                    <p>Click the &quot;Connect Account&quot; button to link your Stripe account. During registration:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Your email will be pre-filled, if not it must match your ChessBet account email</li>
                      <li>The type of industry should be prefiled, if not you can choose industry you want because it do not make any difference</li>
                      <li>Other fields will be pre-filled where possible</li>
                      <li>You will have to verify your account by uploading an ID document</li>
                      <li>This is a one-time setup process</li>

                    </ul>
                    
                    <h3 className="font-semibold">Step 2: Payout to Bank</h3>
                    <p>Use the &quot;Payout to Bank&quot; button to withdraw your ChessCoins to your bank account:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Payouts are processed by the platform within 24 hours, but it may take a few days to reach your bank account</li>
                      <li>A fixed commission fee of 1 EUR will be deducted from your payout amount</li>
                      <li>You can payout any amount from your ChessCoin balance</li>
                      <li>You will receive a confirmation message when your payout is successful</li>
                    </ul>
                    {/* <h3 className="font-semibold">Step 3: Manage Your Account</h3>
                    <p>Click &quot;Manage Payouts&quot; to access your Stripe dashboard where you can:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Set up your bank account for withdrawals</li>
                      <li>View your payout history</li>
                      <li>Manage your account settings</li>
                    </ul>
                     */}
                    <h3 className="font-semibold">Important Notes:</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>1 ChessCoin = 1 EUR</li>
                      <li>A fixed commission fee of 1 EUR is deducted at payout time</li>
                      <li>Payouts are processed within 24 hours</li>
                      <li>Verification may be required for security purposes</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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

        <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payout to Bank Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount to payout</label>
                <Input
                  type="number"
                  min="1"
                  max={user.chessCoin}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder={`Max: ${user.chessCoin} ChessCoins`}
                />
                <p className="text-sm text-muted-foreground">
                  Note: 1 ChessCoin = 1 EUR. A commission fee of 1 EUR will be deducted.
                </p>
                {transferAmount && (
                  <p className="text-sm">
                    You will receive: {Math.max(0, parseInt(transferAmount) - 1)} EUR in your bank account
                  </p>
                )}
              </div>
              {transferError && (
                <p className="text-sm text-red-500">{transferError}</p>
              )}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleTransfer}
                  disabled={isTransferring}
                >
                  {isTransferring ? 'Processing...' : 'Confirm Payout'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 