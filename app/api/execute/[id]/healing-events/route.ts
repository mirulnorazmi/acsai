import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { extractUserId } from '@/lib/auth';

/**
 * GET /api/execute/[id]/healing-events
 * Retrieve logs where AI auto-fixed an error (Mind-Blowing Feature!)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    validateSupabaseConfig();

    const { id: executionId } = await params;

    // 1. Extract and validate user
    const userId = extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    // 2. Verify user has access to this execution
    const { data: execution, error: executionError } = await supabase
      .from('x_execution_logs')
      .select('id')
      .eq('id', executionId)
      .eq('user_id', userId)
      .single();

    if (executionError || !execution) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Execution not found' },
        { status: 404 }
      );
    }

    // 3. Query self-healing events
    const { data: healingEvents, error: eventsError } = await supabase
      .from('execution_events')
      .select('*')
      .eq('execution_id', executionId)
      .eq('event_type', 'self_healing')
      .order('created_at', { ascending: true });

    if (eventsError) {
      console.error('Failed to fetch healing events:', eventsError);
      return NextResponse.json(
        { error: 'Server Error', message: 'Failed to fetch healing events' },
        { status: 500 }
      );
    }

    // 4. Format healing events for response
    const events = healingEvents?.map(event => ({
      step: event.step_id || 'unknown',
      step_index: event.step_index || 0,
      error: event.original_error || 'Unknown error',
      fix_applied: event.fix_applied || 'No fix details',
      ai_reasoning: event.ai_reasoning || 'No reasoning provided',
      timestamp: event.created_at,
      retry_count: event.retry_count || 0,
    })) || [];

    // 5. Return healing events
    return NextResponse.json({
      execution_id: executionId,
      total_healing_events: events.length,
      events,
    });
  } catch (error) {
    console.error('Error fetching healing events:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch healing events' },
      { status: 500 }
    );
  }
}
