import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/auth/me
 * Get current user details and preferences.
 */
export async function GET(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No valid authorization header found');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing authorization token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      console.error('Empty token after Bearer prefix');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid authorization header format' },
        { status: 401 }
      );
    }
    
    console.log('Token received, fetching user profile');

    // Create an authenticated Supabase client with the user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Create authenticated client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get user from Supabase auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User auth error:', userError);
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.log('User authenticated, user ID:', user.id);

    // Fetch user profile from x_users table
    const { data: userProfile, error: profileError } = await supabase
      .from('x_users')
      .select('id, email, full_name, avatar_url, preferences, created_at, updated_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // User doesn't have a profile yet, return basic user info with consistent schema
      const now = new Date().toISOString();
      return NextResponse.json({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        preferences: {},
        created_at: user.created_at || now,
        updated_at: now,
      });
    }

    // Return user details with consistent schema
    return NextResponse.json({
      id: userProfile.id,
      email: userProfile.email,
      full_name: userProfile.full_name || '',
      avatar_url: userProfile.avatar_url || '',
      preferences: userProfile.preferences || {},
      created_at: userProfile.created_at,
      updated_at: userProfile.updated_at,
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
