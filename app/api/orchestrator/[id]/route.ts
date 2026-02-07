import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { UpdateWorkflowSchema } from '@/lib/validations/orchestrator';
import { extractUserId } from '@/lib/auth';

/**
 * GET /api/orchestrator/[id]
 * Retrieve a workflow for React Flow UI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    validateSupabaseConfig();
    
    const { id } = await params;
    
    // 1. Extract and validate user
    const userId = extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    // 2. Fetch workflow from database
    const { data: workflow, error: dbError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (dbError || !workflow) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Workflow not found' },
        { status: 404 }
      );
    }

    // 3. Check authorization
    if (workflow.user_id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this workflow' },
        { status: 403 }
      );
    }

    // 4. Return workflow
    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      steps: workflow.steps,
      version: workflow.version,
      status: workflow.status,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orchestrator/[id]
 * Manually update workflow JSON (e.g., Drag & Drop updates)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    validateSupabaseConfig();
    
    const { id } = await params;
    
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
    const validation = UpdateWorkflowSchema.safeParse(body);

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

    const { steps } = validation.data;

    // 3. Fetch existing workflow to check ownership
    const { data: existingWorkflow, error: fetchError } = await supabase
      .from('workflows')
      .select('user_id, version, is_deleted')
      .eq('id', id)
      .single();

    if (fetchError || !existingWorkflow) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Workflow not found' },
        { status: 404 }
      );
    }

    if (existingWorkflow.is_deleted) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Workflow has been deleted' },
        { status: 404 }
      );
    }

    // 4. Check authorization
    if (existingWorkflow.user_id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this workflow' },
        { status: 403 }
      );
    }

    // 5. Update workflow
    const newVersion = existingWorkflow.version + 1;
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('workflows')
      .update({
        steps,
        version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { error: 'Database Error', message: 'Failed to update workflow' },
        { status: 500 }
      );
    }

    // 6. Return success response
    return NextResponse.json({
      status: 'updated',
      version: newVersion,
      workflow: {
        id: updatedWorkflow.id,
        steps: updatedWorkflow.steps,
        updated_at: updatedWorkflow.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating workflow:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orchestrator/[id]
 * Soft delete a workflow
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    validateSupabaseConfig();
    
    const { id } = await params;
    
    // 1. Extract and validate user
    const userId = extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    // 2. Fetch existing workflow to check ownership
    const { data: existingWorkflow, error: fetchError } = await supabase
      .from('workflows')
      .select('user_id, is_deleted')
      .eq('id', id)
      .single();

    if (fetchError || !existingWorkflow) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Workflow not found' },
        { status: 404 }
      );
    }

    if (existingWorkflow.is_deleted) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Workflow already deleted' },
        { status: 404 }
      );
    }

    // 3. Check authorization
    if (existingWorkflow.user_id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this workflow' },
        { status: 403 }
      );
    }

    // 4. Soft delete workflow
    const { error: deleteError } = await supabase
      .from('workflows')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json(
        { error: 'Database Error', message: 'Failed to delete workflow' },
        { status: 500 }
      );
    }

    // 5. Return success response
    return NextResponse.json({
      status: 'deleted',
      id,
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
