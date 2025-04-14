'use server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcrypt';
import { sign } from 'jsonwebtoken';

// Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || 'chessbet_supersecret_jwt_key';

export async function POST(request: Request) {
  console.log('Signin request received');
  
  try {
    const { email, password } = await request.json();
    console.log('Signin attempt for email:', email);

    if (!email || !password) {
      console.log('Missing email or password');
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('User not found:', email);
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create a JWT token with all needed user data
    const token = sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('Token created for user ID:', user.id);

    // Create the response
    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    // Add the cookie to the response
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    console.log('Cookie set in response. Cookie name: token, path: /, sameSite: lax');
    return response;
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { message: 'An error occurred during sign in' },
      { status: 500 }
    );
  }
}
