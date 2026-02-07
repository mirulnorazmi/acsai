import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { extractUserId } from '@/lib/auth';

/**
 * DELETE /api/memory/entity/[id]
 * Remove a specific memory fact (Privacy/GDPR)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    validateSupabaseConfig();

    const { id: memoryId } = await params;

    // 1. Extract and validate user
    const userId = await extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    // 2. Verify the memory exists and belongs to the user
    const { data: memory, error: fetchError } = await supabase
      .from('x_entity_memory')
      .select('id, user_id')
      .eq('id', memoryId)
      .single();

    if (fetchError || !memory) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: 'Memory not found or access denied',
        },
        { status: 404 }
      );
    }

    // 3. Check ownership
    if (memory.user_id !== userId) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have permission to delete this memory',
        },
        { status: 403 }
      );
    }

    // 4. Delete the memory
    const { error: deleteError } = await supabase
      .from('x_entity_memory')
      .delete()
      .eq('id', memoryId)
      .eq('user_id', userId); // Extra safety check

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        {
          error: 'Database Error',
          message: 'Failed to delete memory',
        },
        { status: 500 }
      );
    }

    // 5. Return success response
    return NextResponse.json({
      status: 'deleted' as const,
      id: memoryId,
    });
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while deleting memory',
      },
      { status: 500 }
    );
  }
}
