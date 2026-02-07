import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { ExportWorkflowSchema } from '@/lib/validations/learning';
import { extractUserId } from '@/lib/auth';
import { convertToN8N, convertToZapier } from '@/lib/services/translator';
import type { WorkflowStep } from '@/types/orchestrator';

/**
 * POST /api/export/[id]
 * [Universal Translator] Converts internal Workflow JSON to an external platform format
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    validateSupabaseConfig();

    const { id: workflowId } = await params;

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
    const validation = ExportWorkflowSchema.safeParse(body);

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

    const { target_platform } = validation.data;

    // 3. Fetch workflow from database
    const { data: workflow, error: fetchError } = await supabase
      .from('x_workflows')
      .select('id, name, steps')
      .eq('id', workflowId)
      .eq('user_id', userId) // Ensure ownership
      .single();

    if (fetchError || !workflow) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: 'Workflow not found or access denied',
        },
        { status: 404 }
      );
    }

    const steps = workflow.steps as unknown as WorkflowStep[];

    // 4. Adapt to target platform
    let jsonContent: Record<string, any>;

    try {
      if (target_platform === 'n8n') {
        jsonContent = convertToN8N(steps);
      } else if (target_platform === 'zapier') {
        jsonContent = convertToZapier(steps);
      } else {
        throw new Error(`Platform ${target_platform} not supported`);
      }
    } catch (adapterError: any) {
      console.error('Adapter error:', adapterError);
      return NextResponse.json(
        {
          error: 'Conversion Error',
          message: adapterError.message || 'Failed to convert workflow',
        },
        { status: 500 }
      );
    }

    // 5. Return transformed JSON
    return NextResponse.json({
      platform: target_platform,
      json_content: jsonContent,
      workflow_name: workflow.name,
    });
  } catch (error) {
    console.error('Error exporting workflow:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during export',
      },
      { status: 500 }
    );
  }
}
