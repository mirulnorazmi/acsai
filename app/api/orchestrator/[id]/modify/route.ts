import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { modifyWorkflow, generateDiff, validateOpenAIConfig } from '@/lib/ai';
import { ModifyWorkflowSchema } from '@/lib/validations/orchestrator';
import { extractUserId } from '@/lib/auth';

/**
 * POST /api/orchestrator/[id]/modify
 * Applies natural language changes to an existing workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    validateSupabaseConfig();
    validateOpenAIConfig();
    
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
    const validation = ModifyWorkflowSchema.safeParse(body);

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

    const { instruction, current_version } = validation.data;

    // 3. Fetch existing workflow
    const { data: existingWorkflow, error: fetchError } = await supabase
      .from('x_workflows')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !existingWorkflow) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Workflow not found' },
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

    // 5. Version conflict check
    if (existingWorkflow.version !== current_version) {
      return NextResponse.json(
        {
          error: 'Version Conflict',
          message: `Workflow has been modified. Current version is ${existingWorkflow.version}, but you provided ${current_version}`,
          current_version: existingWorkflow.version,
        },
        { status: 409 }
      );
    }

    // 6. Call AI service to modify workflow
    const currentWorkflowData = {
      name: existingWorkflow.name,
      description: existingWorkflow.description,
      steps: existingWorkflow.steps,
    };

    let modifiedWorkflowData;
    try {
      modifiedWorkflowData = await modifyWorkflow(
        currentWorkflowData,
        instruction
      );
    } catch (aiError) {
      console.error('AI service error:', aiError);
      return NextResponse.json(
        {
          error: 'AI Service Error',
          message: 'Failed to process modification instruction',
        },
        { status: 500 }
      );
    }

    // 7. Generate diff summary
    const diff = generateDiff(currentWorkflowData, modifiedWorkflowData);

    // 8. Update workflow in database
    const newVersion = existingWorkflow.version + 1;
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('x_workflows')
      .update({
        name: modifiedWorkflowData.name || existingWorkflow.name,
        description: modifiedWorkflowData.description || existingWorkflow.description,
        steps: modifiedWorkflowData.steps || existingWorkflow.steps,
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

    // 9. Return success response
    return NextResponse.json({
      workflow_id: updatedWorkflow.id,
      version: newVersion,
      diff,
      steps: updatedWorkflow.steps,
      name: updatedWorkflow.name,
      description: updatedWorkflow.description,
    });
  } catch (error) {
    console.error('Error modifying workflow:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while modifying the workflow',
      },
      { status: 500 }
    );
  }
}
