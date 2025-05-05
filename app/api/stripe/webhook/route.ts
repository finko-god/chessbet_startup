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
  const headersList = headers();
  const signature = (await headersList).get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('Received webhook event:', event.type);
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

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            chessCoin: {
              increment: chessCoinsToAdd
            }
          }
        }),
        prisma.topUp.create({
          data: {
            userId: userId,
            amount: amountTotal
          }
        })
      ]);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error updating user balance:', error);
      return NextResponse.json(
        { error: 'Error updating user balance' },
        { status: 500 }
      );
    }
  }

  // Handle account verification status updates
  if (event.type === 'account.updated' || event.type === 'account.application.authorized') {
    console.log('Processing account update event:', event.type);
    const account = event.data.object as Stripe.Account;
    console.log('Account details:', {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      capabilities: account.capabilities,
      requirements: account.requirements
    });

    const user = await prisma.user.findFirst({
      where: { stripeConnectId: account.id }
    });

    if (user) {
      // Check if the account is fully verified with completed KYC
      const kycVerified =
        account.charges_enabled &&
        account.payouts_enabled &&
        account.capabilities?.transfers === 'active' &&
        account.requirements?.eventually_due?.length === 0 &&
        account.requirements?.currently_due?.length === 0 &&
        account.requirements?.past_due?.length === 0;

      // Update stripeConnectId and isVerified status
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeConnectId: account.id,
          isVerified: kycVerified
        }
      });

      console.log(`User ${user.id} KYC verification status: ${kycVerified}`);
    }
  }

  // Handle person verification events (part of KYC)
  if (event.type === 'person.updated') {
    const person = event.data.object as Stripe.Person;
    const account = person.account as string;

    const user = await prisma.user.findFirst({
      where: { stripeConnectId: account }
    });

    if (user) {
      // Fetch the account to check overall verification status
      const accountDetails = await stripe.accounts.retrieve(account);
      const kycVerified =
        accountDetails.charges_enabled &&
        accountDetails.payouts_enabled &&
        accountDetails.requirements?.eventually_due?.length === 0 &&
        accountDetails.requirements?.currently_due?.length === 0 &&
        accountDetails.requirements?.past_due?.length === 0;

      // Update isVerified status
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: kycVerified }
      });

      console.log(`User ${user.id} person verification updated, KYC status: ${kycVerified}`);
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
      await prisma.payout.update({
        where: { id: payoutRecord.id },
        data: { status: 'paid' }
      });
    }
  }

  return NextResponse.json({ received: true });
}