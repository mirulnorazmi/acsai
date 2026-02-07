import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { RecordFeedbackSchema } from '@/lib/validations/learning';
import { extractUserId } from '@/lib/auth';

/**
 * POST /api/learning/feedback
 * [RLHF] Record user feedback to improve future generations
 */
export async function POST(request: NextRequest) {
  try {
    validateSupabaseConfig();

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
    const validation = RecordFeedbackSchema.safeParse(body);

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

    const { execution_id, rating, comment } = validation.data;

    // 3. Update execution_logs with feedback
    const { data: execution, error: updateError } = await supabase
      .from('x_execution_logs')
      .update({
        rating,
        feedback_comment: comment,
      })
      .eq('id', execution_id)
      .eq('user_id', userId) // Ensure ownership
      .select('workflow_id, id')
      .single();

    if (updateError || !execution) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: 'Execution not found or access denied',
        },
        { status: 404 }
      );
    }

    // 4. Gold Standard Logic: If rating is 5, mark workflow as gold standard
    let isGoldStandard = false;
    if (rating === 5 && execution.workflow_id) {
      const { error: workflowError } = await supabase
        .from('x_workflows')
        .update({ is_gold_standard: true })
        .eq('id', execution.workflow_id);

      if (workflowError) {
        console.error('Failed to update gold standard status:', workflowError);
        // We don't fail the request, just log it
      } else {
        isGoldStandard = true;
      }
    }

    // 5. Return success response
    return NextResponse.json({
      status: 'recorded',
      execution_id: execution.id,
      is_gold_standard: isGoldStandard,
    });
  } catch (error) {
    console.error('Error recording feedback:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while recording feedback',
      },
      { status: 500 }
    );
  }
}
