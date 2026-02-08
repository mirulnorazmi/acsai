import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embeddings';
import { RegisterToolSchema } from '@/lib/validations/discovery';
import { extractUserId } from '@/lib/auth';
import type { ToolSummary } from '@/types/discovery';

/**
 * GET /api/x_discovery/tools
 * List all registered tools (for UI Sidebar)
 */
export async function GET(request: NextRequest) {
  try {
    validateSupabaseConfig();

    // 1. Fetch all active tools
    const { data: tools, error: fetchError } = await supabase
      .from('x_action_library')
      .select('id, name, platform, description')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error('Database error:', fetchError);
      return NextResponse.json(
        {
          error: 'Database Error',
          message: 'Failed to fetch tools',
        },
        { status: 500 }
      );
    }

    // 2. Format results
    const formattedTools: ToolSummary[] = (tools || []).map(tool => ({
      id: tool.id,
      name: tool.name,
      platform: tool.platform,
      description: tool.description,
    }));

    // 3. Return tools list
    return NextResponse.json({
      tools: formattedTools,
      total: formattedTools.length,
    });
  } catch (error) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch tools',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/x_discovery/tools
 * Register a new tool and generate its vector embedding
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

    // 2. Check admin authorization (Mock implementation)
    // In production, check user role from database
    const isAdmin = checkAdminRole(userId);
    if (!isAdmin) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Only administrators can register tools',
        },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validation = RegisterToolSchema.safeParse(body);

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

    const { name, platform, description, schema } = validation.data;

    // 4. Generate embedding for the description
    let embedding: number[] | null = null;
    let embeddingStatus: 'generated' | 'pending' | 'failed' = 'pending';

    try {
      const embeddingResult = await generateEmbedding(description);
      embedding = embeddingResult.embedding;
      embeddingStatus = 'generated';
    } catch (error) {
      console.error('Embedding generation failed:', error);
      // Continue with null embedding - can be generated later
      embedding = null;
      embeddingStatus = 'failed';
    }

    // 5. Insert tool into database
    const { data: tool, error: insertError } = await supabase
      .from('x_action_library')
      .insert({
        name,
        platform,
        description,
        schema,
        embedding: embedding,
        is_active: true,
        created_by: userId,
      })
      .select('id, name')
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json(
        {
          error: 'Database Error',
          message: 'Failed to register tool',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    // 6. Return success response
    return NextResponse.json(
      {
        id: tool.id,
        name: tool.name,
        embedding_status: embeddingStatus,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering tool:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while registering tool',
      },
      { status: 500 }
    );
  }
}

/**
 * Check if user has admin role (Mock implementation)
 * In production, query user roles from database
 */
function checkAdminRole(userId: string): boolean {
  // Mock: Allow all users for development
  // In production, check against user_roles table or similar
  
  // For demo, you can check if userId contains 'admin'
  // return userId.toLowerCase().includes('admin');
  
  // For now, allow all authenticated users
  return true;
}
