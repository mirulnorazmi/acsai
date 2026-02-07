import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StoreKeySchema } from '@/lib/validations/auth';
import { extractUserId } from '@/lib/auth';

/**
 * POST /api/auth/keys
 * Store API keys for external services securely.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Extract and validate user
    const userId = extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    // 2. Validate request body
    const body = await request.json();
    const validation = StoreKeySchema.safeParse(body);

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

    const { platform, api_key, api_secret, metadata } = validation.data;

    // 3. Upsert into x_user_secrets
    const { data: secretData, error: secretError } = await supabase
      .from('x_user_secrets')
      .upsert({
        user_id: userId,
        platform,
        api_key, // TODO: Encrypt this in production!
        api_secret,
        metadata,
        updated_at: new Date().toISOString(), // Ensure updated_at refreshes on upsert
      }, {
        onConflict: 'user_id, platform', // Upsert based on unique constraint
      })
      .select('id, platform, created_at')
      .single();

    if (secretError) {
      console.error('Failed to store API key:', secretError);
      return NextResponse.json(
        { error: 'Database Error', message: 'Failed to save API key' },
        { status: 500 }
      );
    }

    // 4. Return success
    return NextResponse.json({
      status: 'success',
      platform: secretData.platform,
      key_id: secretData.id,
      message: `API Key for ${platform} stored successfully`,
    }, { status: 200 }); // Or 201 Created

  } catch (error) {
    console.error('Error in /api/auth/keys:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
