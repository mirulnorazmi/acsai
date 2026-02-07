import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { RegisterSchema } from '@/lib/validations/auth';

/**
 * POST /api/auth/register
 * Register a new user and generate Supabase auth token.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate request body
    const body = await request.json();
    const validation = RegisterSchema.safeParse(body);

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

    const { email, password, full_name } = validation.data;

    // 2. Call Supabase Auth to Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name, // Store in user metadata
        },
      },
    });

    if (authError) {
      console.error('Registration failed:', authError.message);
      return NextResponse.json(
        {
          error: 'Registration Failed',
          message: authError.message,
        },
        { status: 400 } // Or 500 depending on error, but 400 is safer for bad input
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Registration Failed', message: 'No user data returned' },
        { status: 500 }
      );
    }

    // 3. Insert into public users table (x_users)
    // Note: Supabase Auth trigger could do this, but explicit insert ensures sync
    const { error: insertError } = await supabase
      .from('x_users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        full_name: full_name || null,
        preferences: {},
      });

    if (insertError) {
      console.error('Failed to create user profile:', insertError);
      // We don't rollback auth user here for MVP simplicity, but in production consider cleanup
    }

    // 4. Return success along with session token if auto-sign-in enabled
    // Note: signUp usually returns a session if email confirmation is disabled or auto-confirm enabled.
    const token = authData.session?.access_token;

    return NextResponse.json({
      user_id: authData.user.id,
      email: authData.user.email,
      token: token || null, // Token might be null if email confirmation required
      message: 'Registration successful',
    }, { status: 201 });

  } catch (error) {
    console.error('Error in /api/auth/register:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
