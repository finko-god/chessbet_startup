'use server';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const amountTotal = session.amount_total;

    if (!userId || !amountTotal) {
      return NextResponse.json(
        { error: 'Missing userId or amount in session' },
        { status: 400 }
      );
    }

    try {
      // Convert cents to euros (1:1 ratio with ChessCoins)
      const chessCoinsToAdd = Math.floor(amountTotal / 100);

      await prisma.user.update({
        where: { id: userId },
        data: {
          chessCoin: {
            increment: chessCoinsToAdd
          }
        }
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error updating user balance:', error);
      return NextResponse.json(
        { error: 'Error updating user balance' },
        { status: 500 }
      );
    }
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    const user = await prisma.user.findFirst({
      where: { stripeConnectId: account.id }
    });

    if (user) {
      // Check if the account is fully verified and has all required capabilities
      const isVerified = account.charges_enabled && account.payouts_enabled;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          ableForPayouts: isVerified,
          stripeConnectId: account.id
        }
      });
    }
  }

  if (event.type === 'payout.failed' || event.type === 'payout.canceled') {
    const payout = event.data.object as Stripe.Payout;
    
    const payoutRecord = await prisma.payout.findFirst({
      where: { stripePayoutId: payout.id }
    });

    if (payoutRecord) {
      await prisma.$transaction([
        prisma.payout.update({
          where: { id: payoutRecord.id },
          data: { status: event.type === 'payout.failed' ? 'failed' : 'canceled' }
        }),
        prisma.user.update({
          where: { id: payoutRecord.userId },
          data: { chessCoin: { increment: Math.floor(payoutRecord.amount / 100) + 1 } }
        })
      ]);
    }
  }

  if (event.type === 'payout.paid') {
    const payout = event.data.object as Stripe.Payout;
    
    const payoutRecord = await prisma.payout.findFirst({
      where: { stripePayoutId: payout.id }
    });

    if (payoutRecord) {
      await prisma.$transaction([
        prisma.payout.update({
          where: { id: payoutRecord.id },
          data: { status: 'paid' }
        }),
        // Add any other related updates here if needed
      ]);
    }
  }

  return NextResponse.json({ received: true });
}