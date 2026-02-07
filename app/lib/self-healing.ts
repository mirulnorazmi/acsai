import { openai, validateOpenAIConfig } from './ai';
import type { SelfHealingContext, SelfHealingResult } from '@/types/execution';

/**
 * Self-Healing AI Service
 * Uses AI to automatically fix failed workflow steps
 */

/**
 * Attempt to fix a failed step using AI
 */
export async function attemptSelfHealing(
  context: SelfHealingContext
): Promise<SelfHealingResult> {
  validateOpenAIConfig();

  const systemPrompt = `You are an AI workflow debugger and fixer. When a workflow step fails, you analyze the error and propose a fix.

Your job:
1. Understand the step configuration and what it was trying to do
2. Analyze the error message
3. Propose a corrected configuration that should work
4. Explain your reasoning

Return ONLY a JSON object with this structure:
{
  "fixed_config": { /* corrected step configuration */ },
  "reasoning": "Brief explanation of what was wrong and how you fixed it",
  "confidence": 0.85 // 0-1 score of how confident you are this will work
}`;

  const userPrompt = `
Step ID: ${context.step_id}
Original Configuration: ${JSON.stringify(context.step_config, null, 2)}

Error Message: ${context.error_message}
${context.error_details ? `Error Details: ${JSON.stringify(context.error_details, null, 2)}` : ''}

Workflow Context: ${JSON.stringify(context.workflow_context, null, 2)}
Previous Step Outputs: ${JSON.stringify(context.previous_outputs, null, 2)}

Please analyze this error and propose a fix.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more deterministic fixes
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(content) as SelfHealingResult;

    // Validate the response has required fields
    if (!result.fixed_config || !result.reasoning) {
      throw new Error('Invalid AI response format');
    }

    return result;
  } catch (error) {
    console.error('Self-healing AI error:', error);
    throw new Error('Failed to generate self-healing fix');
  }
}

/**
 * Determine if an error is healable
 * Some errors are permanent and shouldn't be retried
 */
export function isErrorHealable(error: any): boolean {
  const errorMessage = error?.message || String(error);
  const lowerError = errorMessage.toLowerCase();

  // Errors that are likely fixable
  const healablePatterns = [
    'not found',
    'invalid',
    'missing',
    'incorrect',
    'channel',
    'parameter',
    'configuration',
    'format',
  ];

  // Errors that are permanent
  const permanentPatterns = [
    'unauthorized',
    'forbidden',
    'authentication failed',
    'permission denied',
    'quota exceeded',
    'rate limit',
  ];

  // Check if it's a permanent error
  if (permanentPatterns.some(pattern => lowerError.includes(pattern))) {
    return false;
  }

  // Check if it matches healable patterns
  return healablePatterns.some(pattern => lowerError.includes(pattern));
}

/**
 * Extract meaningful error details from various error types
 */
export function extractErrorDetails(error: any): {
  message: string;
  details?: any;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      },
    };
  }

  if (typeof error === 'object' && error !== null) {
    return {
      message: error.message || error.error || 'Unknown error',
      details: error,
    };
  }

  return {
    message: String(error),
  };
}
