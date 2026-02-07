import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { extractUserId } from '@/lib/auth';

/**
 * GET /api/execute/[id]/status
 * Polling endpoint to check x_execution progress
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

    // 2. Fetch x_execution log
    const { data: x_execution, error: executionError } = await supabase
      .from('x_execution_logs')
      .select('*')
      .eq('id', executionId)
      .eq('user_id', userId)
      .single();

    if (executionError || !x_execution) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Execution not found' },
        { status: 404 }
      );
    }

    // 3. Fetch recent events for logs
    const { data: events, error: eventsError } = await supabase
      .from('execution_events')
      .select('message, created_at, event_type')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (eventsError) {
      console.error('Failed to fetch events:', eventsError);
    }

    // 4. Get workflow to determine total steps
    const { data: workflow } = await supabase
      .from('x_workflows')
      .select('steps')
      .eq('id', x_execution.workflow_id)
      .single();

    const totalSteps = workflow?.steps?.length || 0;

    // 5. Format logs
    const logs = events?.map(e => 
      `[${new Date(e.created_at).toISOString()}] ${e.message}`
    ) || [];

    // 6. Return status response
    return NextResponse.json({
      execution_id: executionId,
      status: x_execution.status,
      current_step: x_execution.current_step_id,
      current_step_index: x_execution.current_step_index || 0,
      total_steps: totalSteps,
      logs,
      started_at: x_execution.started_at,
      completed_at: x_execution.completed_at,
      error_message: x_execution.error_message,
    });
  } catch (error) {
    console.error('Error fetching x_execution status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch x_execution status' },
      { status: 500 }
    );
  }
}
