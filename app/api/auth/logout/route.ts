import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/logout
 * Log out the current user and invalidate session.
 */
export async function POST(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('No authorization header for logout');
      // Still return success - logout is idempotent
      return NextResponse.json({ success: true, message: 'Logged out' });
    }

    const token = authHeader.substring(7);

    // Create an authenticated Supabase client with the user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      // Still return success - client should clear local storage anyway
      return NextResponse.json({ success: true, message: 'Logged out' });
    }

    // Create authenticated client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Sign out the user from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Supabase sign out error:', error);
      // Still return success - invalidating client-side is enough
    }

    console.log('User logged out successfully');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

  } catch (error) {
    console.error('Error in /api/auth/logout:', error);
    // Return success anyway - logout should always succeed from client perspective
    return NextResponse.json({
      success: true,
      message: 'Logged out',
    });
  }
}
