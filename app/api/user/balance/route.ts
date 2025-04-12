'use server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key'

export async function GET(request: Request) {
  try {
    // Get token from cookie
    const token = request.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('token='))
      ?.split('=')[1]
    
    if (!token) {
      return NextResponse.json(
        { error: 'You must be logged in to view balance' },
        { status: 401 }
      )
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string }
      
      if (!decoded.id) {
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        )
      }

      // Get user's balance
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { chessCoin: true }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ balance: user.chessCoin })
    } catch (jwtError) {
      console.error('Token verification error:', jwtError)
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Error fetching balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    )
  }
} 