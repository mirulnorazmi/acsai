import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { LoginSchema } from '@/lib/validations/auth';

/**
 * POST /api/auth/login
 * Log in a user and generate Supabase auth token.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate request body
    const body = await request.json();
    const validation = LoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // 2. Call Supabase Auth to Sign In
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Login failed:', authError.message);
      return NextResponse.json(
        {
          error: 'Authentication Failed',
          message: authError.message,
        },
        { status: 401 } // 401 Unauthorized for bad credentials
      );
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json(
        { error: 'Login Failed', message: 'No session data returned' },
        { status: 500 }
      );
    }

    // 3. Return session token
    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      token: authData.session.access_token,
      expires_in: authData.session.expires_in,
    }, { status: 200 });

  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
