import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractUserId } from '@/lib/auth';

/**
 * GET /api/auth/me
 * Get current user details and preferences.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Extract and validate user
    const userId = await extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    // 2. Fetch user details from x_users
    // Note: We use the Supabase client associated with current session ideally, but for now we trust `extractUserId` which validates JWT.
    // However, to read user details, we might need to bypass RLS if not authenticated properly with Supabase client context.
    // BUT! Since `x_users` has RLS: "auth.uid() = id", we MUST use authenticated client.
    
    // Create new Supabase client with auth headers to respect RLS
    // Wait, `extractUserId` just validates JWT manually or via helper.
    // To fetch from DB with RLS, we need to set the session or JWT on the client? 
    // Or we rely on `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS) and manually filter `userId`.
    // Since this is backend API, using service role key + manual WHERE clause is safer/simpler than passing user JWT context to helper in some cases,
    // BUT for "Me" endpoint, verifying owner is implicit.

    const { data: userProfile, error: profileError } = await supabase
      .from('x_users')
      .select('id, email, full_name, preferences, created_at')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      // If profile not found but auth valid (weird state potentially), check auth.users?
      // For MVP, just return 404 or auth info alone if profile missing.
      return NextResponse.json(
        { error: 'Profile Not Found', message: 'User profile does not exist or access denied' },
        { status: 404 }
      );
    }

    // 3. Return user details
    return NextResponse.json({
      id: userProfile.id,
      email: userProfile.email,
      full_name: userProfile.full_name,
      preferences: userProfile.preferences,
      created_at: userProfile.created_at,
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
