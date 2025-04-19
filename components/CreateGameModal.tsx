'use client'

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateGameModalProps {
  isOpen: boolean;
  onCloseAction: () => Promise<void>;
  onCreateAction: (betAmount: number, timeControl: string) => Promise<void>;
}

export function CreateGameModal({ isOpen, onCloseAction, onCreateAction }: CreateGameModalProps) {
  const [betAmount, setBetAmount] = useState('');
  const [timeControl, setTimeControl] = useState('5+0');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = Number(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    if (amount > 10) {
      setError('Maximum bet amount is 10 ChessCoins');
      return;
    }

    await onCreateAction(amount, timeControl);
    setBetAmount('');
    setTimeControl('5+0');
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onCloseAction()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Game</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="betAmount">Bet Amount (max 10)</Label>
            <Input
              id="betAmount"
              type="number"
              min="1"
              max="10"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter bet amount"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeControl">Time Control</Label>
            <Select value={timeControl} onValueChange={setTimeControl}>
              <SelectTrigger>
                <SelectValue placeholder="Select time control" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5+0">5+0</SelectItem>
                <SelectItem value="3+2">3+2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onCloseAction()}>
              Cancel
            </Button>
            <Button type="submit">Create Game</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 