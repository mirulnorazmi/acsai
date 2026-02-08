import { NextRequest, NextResponse } from 'next/server';
import { generateN8nWorkflowJSON, validateOpenAIConfig } from '@/lib/ai';

/**
 * POST /api/orchestrator/generate-n8n
 * Generates n8n workflow JSON from natural language prompt
 */
export async function POST(request: NextRequest) {
  try {
    // Validate OpenAI is configured
    validateOpenAIConfig();

    // Parse request
    const body = await request.json();
    const { prompt, availableTools = [] } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Generate n8n workflow using OpenAI
    const n8nWorkflow = await generateN8nWorkflowJSON(prompt, availableTools);

    // Validate the generated workflow has required structure
    if (!n8nWorkflow.name || !Array.isArray(n8nWorkflow.nodes)) {
      return NextResponse.json(
        { error: 'Invalid workflow', message: 'Generated workflow missing required fields' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        workflow: n8nWorkflow,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating n8n workflow:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Generation Error',
        message: error instanceof Error ? error.message : 'Failed to generate n8n workflow',
      },
      { status: 500 }
    );
  }
}
