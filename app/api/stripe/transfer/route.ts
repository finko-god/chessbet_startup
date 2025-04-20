'use server';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await request.json();
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true,
        chessCoin: true,
        stripeConnectId: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.stripeConnectId) {
      return NextResponse.json({ 
        error: 'Please connect your Stripe account first' 
      }, { status: 400 });
    }

    if (amount > user.chessCoin) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Calculate amount after commission (5%)
    const commission = amount * 0.05;
    const amountAfterCommission = (amount - commission) * 100;

    try {
      // Create transfer to connected account
      const transfer = await stripe.transfers.create({
        amount: amountAfterCommission,
        currency: 'eur',
        destination: user.stripeConnectId,
        description: `Transfer of ${amount} ChessCoins (${amountAfterCommission/100} EUR after 5% commission)`
      });

      // Update user's balance and create transfer record
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { chessCoin: { decrement: amount } }
        }),
        prisma.transfer.create({
          data: {
            userId: user.id,
            amount: amountAfterCommission,
            currency: 'eur',
            status: 'completed', // Transfers are completed immediately
            stripeTransferId: transfer.id
          }
        })
      ]);

      return NextResponse.json({ 
        success: true,
        transferId: transfer.id,
        amountTransferred: amountAfterCommission/100
      });
    } catch (error) {
      console.error('Transfer error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        return NextResponse.json({ 
          error: error.message 
        }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error processing transfer:', error);
    return NextResponse.json(
      { error: 'Error processing transfer' },
      { status: 500 }
    );
  }
} 