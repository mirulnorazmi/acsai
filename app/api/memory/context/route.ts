import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { GetContextSchema } from '@/lib/validations/memory';
import { extractUserId } from '@/lib/auth';

/**
 * GET /api/memory/context
 * Retrieve specific context/facts about a person or project (RAG)
 */
export async function GET(request: NextRequest) {
  try {
    validateSupabaseConfig();

    // 1. Extract and validate user
    const userId = await extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    // 2. Extract and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const entity = searchParams.get('entity');

    const validation = GetContextSchema.safeParse({ entity });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: 'Invalid query parameters',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { entity: entityName } = validation.data;

    // 3. Query entity_memory table using ILIKE for case-insensitive search
    const { data: memories, error: queryError } = await supabase
      .from('x_entity_memory')
      .select('id, fact, created_at')
      .eq('user_id', userId)
      .ilike('subject', `%${entityName}%`)
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('Database error:', queryError);
      return NextResponse.json(
        {
          error: 'Database Error',
          message: 'Failed to retrieve memory facts',
        },
        { status: 500 }
      );
    }

    // 4. Check if any facts were found
    if (!memories || memories.length === 0) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: `No facts found for entity: ${entityName}`,
        },
        { status: 404 }
      );
    }

    // 5. Map results to simple list of strings
    const facts = memories.map(m => m.fact);

    // 6. Return context response
    return NextResponse.json({
      entity: entityName,
      facts,
      total: facts.length,
    });
  } catch (error) {
    console.error('Error retrieving context:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while retrieving context',
      },
      { status: 500 }
    );
  }
}
