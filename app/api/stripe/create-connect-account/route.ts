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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true,
        email: true,
        stripeConnectId: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let accountId = user.stripeConnectId;

    // If user doesn't have a Stripe Connect account, create one
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        business_type: 'individual',
        business_profile: {
          url: 'https://chessbet.co'
        },
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'manual'
            }
          }
        },
        // Request identity verification immediately
        tos_acceptance: {
          service_agreement: 'full',
        },
      });

      accountId = account.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { 
          stripeConnectId: account.id 
        }
      });
    }

    // Create account link for verification with prefilled data
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${request.headers.get('origin')}/account?verify=failed`,
      return_url: `${request.headers.get('origin')}/account?verify=success`,
      type: 'account_onboarding',
      collect: 'eventually_due',  // Ensure all required verification is collected
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating connect account:', error);
    return NextResponse.json(
      { error: 'Error creating connect account' },
      { status: 500 }
    );
  }
}