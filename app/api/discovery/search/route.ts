import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embeddings';
import { SearchToolsSchema } from '@/lib/validations/discovery';
import type { SearchMatch } from '@/types/discovery';

/**
 * GET /api/x_discovery/search
 * Semantic search for tools based on natural language query
 */
export async function GET(request: NextRequest) {
  try {
    validateSupabaseConfig();

    // 1. Extract and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');
    const limit = searchParams.get('limit');
    const threshold = searchParams.get('threshold');

    const validation = SearchToolsSchema.safeParse({
      q,
      limit,
      threshold,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: 'Invalid search parameters',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { q: query, limit: matchCount, threshold: matchThreshold } = validation.data;

    // 2. Generate embedding for the query
    let queryEmbedding: number[];
    try {
      const embeddingResult = await generateEmbedding(query);
      queryEmbedding = embeddingResult.embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return NextResponse.json(
        {
          error: 'Embedding Error',
          message: 'Failed to generate query embedding',
        },
        { status: 500 }
      );
    }

    // 3. Call Supabase RPC function for vector similarity search
    const { data: matches, error: searchError } = await supabase.rpc('x_match_actions', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (searchError) {
      console.error('Vector search error:', searchError);
      return NextResponse.json(
        {
          error: 'Search Error',
          message: 'Vector search failed',
          details: searchError.message,
        },
        { status: 500 }
      );
    }

    // 4. Format results
    const formattedMatches: SearchMatch[] = (matches || []).map((match: any) => ({
      id: match.id,
      name: match.name,
      platform: match.platform,
      description: match.description,
      schema: match.schema,
      similarity: match.similarity,
    }));

    // 5. Return results
    return NextResponse.json({
      query,
      matches: formattedMatches,
      total: formattedMatches.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during search',
      },
      { status: 500 }
    );
  }
}
