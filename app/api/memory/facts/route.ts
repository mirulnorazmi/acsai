import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embeddings';
import { StoreFactSchema } from '@/lib/validations/memory';
import { extractUserId } from '@/lib/auth';

/**
 * POST /api/memory/facts
 * Manually inject a fact into the system (Long-term memory)
 */
export async function POST(request: NextRequest) {
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

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = StoreFactSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: 'Request body validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { subject, fact } = validation.data;

    // 3. Generate embedding for the fact
    let embedding: number[] | null = null;
    let embeddingStatus: 'generated' | 'pending' | 'failed' = 'pending';

    try {
      const embeddingResult = await generateEmbedding(fact);
      embedding = embeddingResult.embedding;
      embeddingStatus = 'generated';
    } catch (error) {
      console.error('Embedding generation failed:', error);
      // Continue with null embedding - can be generated later
      embedding = null;
      embeddingStatus = 'failed';
    }

    // 4. Insert into entity_memory table
    const { data: memory, error: insertError } = await supabase
      .from('x_entity_memory')
      .insert({
        user_id: userId,
        subject,
        fact,
        embedding: embedding,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json(
        {
          error: 'Database Error',
          message: 'Failed to store memory fact',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    // 5. Return success response
    return NextResponse.json(
      {
        status: 'stored' as const,
        id: memory.id,
        embedding_status: embeddingStatus,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error storing fact:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while storing fact',
      },
      { status: 500 }
    );
  }
}
