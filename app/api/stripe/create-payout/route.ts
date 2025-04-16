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
        stripeConnectId: true,
        ableForPayouts: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.ableForPayouts) {
      return NextResponse.json(
        { error: 'Account not verified for payouts' },
        { status: 400 }
      );
    }

    if (amount > user.chessCoin) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Calculate amount after commission (1 EUR)
    const amountAfterCommission = (amount - 1) * 100; // Convert to cents

    const payout = await stripe.payouts.create({
      amount: amountAfterCommission,
      currency: 'eur',
      destination: user.stripeConnectId!,
    });

    // Create payout record and update balance
    await prisma.$transaction([
      prisma.payout.create({
        data: {
          userId: user.id,
          amount: amountAfterCommission,
          currency: 'eur',
          status: 'created',
          stripePayoutId: payout.id,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { chessCoin: { decrement: amount } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating payout:', error);
    return NextResponse.json(
      { error: 'Error creating payout' },
      { status: 500 }
    );
  }
} 