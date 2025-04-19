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
        stripeConnectId: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.stripeConnectId) {
      return NextResponse.json({ 
        verified: false,
        message: 'No Stripe Connect account found'
      });
    }

    // Fetch the latest account status from Stripe
    const account = await stripe.accounts.retrieve(user.stripeConnectId);
    
    // Check verification status
    const isVerified = 
      account.charges_enabled && 
      account.payouts_enabled && 
      account.capabilities?.transfers === 'active' &&
      account.requirements?.eventually_due?.length === 0;

    return NextResponse.json({ 
      verified: isVerified,
      message: isVerified ? 'Account fully verified' : 'Account not fully verified'
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    return NextResponse.json(
      { error: 'Error checking verification status' },
      { status: 500 }
    );
  }
} 