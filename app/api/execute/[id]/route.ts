import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { executeWorkflow } from '@/lib/executor';
import { ExecuteWorkflowSchema } from '@/lib/validations/execution';
import { extractUserId } from '@/lib/auth';

/**
 * POST /api/execute/[id]
 * Triggers the execution of a workflow (Async)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    validateSupabaseConfig();

    const { id: workflowId } = await params;

    // 1. Extract and validate user
    const userId = extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = ExecuteWorkflowSchema.safeParse(body);

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

    const { input_variables } = validation.data;

    // 3. Fetch workflow to validate it exists and user has access
    const { data: workflow, error: workflowError } = await supabase
      .from('x_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Workflow not found or access denied' },
        { status: 404 }
      );
    }

    // 4. Create execution log record with status "pending"
    const { data: executionLog, error: executionError } = await supabase
      .from('x_execution_logs')
      .insert({
        workflow_id: workflowId,
        user_id: userId,
        status: 'pending',
        input_variables: input_variables || {},
        current_step_index: 0,
      })
      .select()
      .single();

    if (executionError || !executionLog) {
      console.error('Failed to create execution log:', executionError);
      return NextResponse.json(
        { error: 'Server Error', message: 'Failed to create execution record' },
        { status: 500 }
      );
    }

    // 5. Trigger async execution (Fire-and-Forget)
    // Using setTimeout to simulate background job
    // In production, use Inngest, BullMQ, or similar
    setTimeout(async () => {
      try {
        await executeWorkflow(
          executionLog.id,
          workflowId,
          userId,
          workflow.steps || [],
          input_variables || {}
        );
      } catch (error) {
        console.error('Background execution error:', error);
      }
    }, 0);

    // 6. Return immediately with execution ID
    return NextResponse.json(
      {
        execution_id: executionLog.id,
        status: 'running' as const,
      },
      { status: 202 } // 202 Accepted
    );
  } catch (error) {
    console.error('Error triggering workflow execution:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while triggering execution',
      },
      { status: 500 }
    );
  }
}
