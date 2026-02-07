import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { generateWorkflowFromPrompt, validateOpenAIConfig } from '@/lib/ai';
import { GenerateWorkflowSchema } from '@/lib/validations/orchestrator';
import { extractUserId, semanticSearchTools, checkRateLimit } from '@/lib/auth';

/**
 * POST /api/orchestrator/generate
 * Converts natural language prompt into a JSON workflow
 */
export async function POST(request: NextRequest) {
  try {
    // 0. Validate environment configuration
    validateSupabaseConfig();
    validateOpenAIConfig();

    // 1. Extract and validate user
    const userId = await extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    // 2. Check rate limit
    const canProceed = await checkRateLimit(userId);
    if (!canProceed) {
      return NextResponse.json(
        { error: 'Rate Limit Exceeded', message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validation = GenerateWorkflowSchema.safeParse(body);

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

    const { prompt, context_override } = validation.data;

    // 4. Perform semantic search to find relevant tools
    const relevantTools = await semanticSearchTools(
      context_override || prompt
    );

    // 5. Call AI service to generate workflow
    const generatedWorkflow = await generateWorkflowFromPrompt(
      prompt,
      relevantTools
    );

    // 6. Save workflow to database
    const { data: workflow, error: dbError } = await supabase
      .from('x_workflows')
      .insert({
        name: generatedWorkflow.name || 'Untitled Workflow',
        description: generatedWorkflow.description || prompt,
        steps: generatedWorkflow.steps || [],
        status: 'draft',
        version: 1,
        user_id: userId,
        is_deleted: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Database Error', message: 'Failed to save workflow : ' + dbError.message },
        { status: 500 }
      );
    }

    // 7. Return success response
    return NextResponse.json(
      {
        workflow_id: workflow.id,
        name: workflow.name,
        steps: workflow.steps,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating workflow:', error);

    // Handle specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while generating the workflow',
      },
      { status: 500 }
    );
  }
}
