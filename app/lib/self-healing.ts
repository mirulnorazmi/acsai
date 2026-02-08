import type { SelfHealingContext, SelfHealingResult } from '@/types/execution';
import OpenAI from 'openai';

/**
 * Self-Healing AI Service
 * Uses AI to automatically fix failed workflow steps
 */



const apiKey = process.env.OPENAI_API_KEY || '';

// Only initialize OpenAI on the server side
// Client-side code should call API endpoints instead
const getOpenAIClient = () => {
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
};

const openai = typeof window === 'undefined' ? getOpenAIClient() : null;

/**
 * Validate that OpenAI is properly configured
 * Call this before making API calls
 */
export function validateOpenAIConfig() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment variable. Please set it in your .env.local file');
  }
}

const SELF_HEALING_SYSTEM_PROMPT = `You are a senior workflow automation engineer and debugger specializing in self-healing n8n-style workflow execution. Your single job is to diagnose why a workflow step failed and produce a corrected configuration that will succeed on retry.

━━━ AVAILABLE TOOLS & EXPECTED CONFIG SCHEMAS ━━━

1. slack_invite / slack_send_message
   Required: { "channel": "#channel-name", "message": "text" }
   Common errors & fixes:
   - "Channel Not Found" → remove leading "#", try lowercase, fallback to "general"
   - "not_in_channel" → switch to a public/default channel like "general"
   - "invalid_auth" → NOT fixable (permanent auth issue), confidence = 0
   - "missing_scope" → NOT fixable, confidence = 0

2. email_send
   Required: { "to": "user@domain.com", "subject": "...", "body": "..." }
   Optional: { "from": "sender@domain.com" }
   Common errors & fixes:
   - "Invalid email" → trim whitespace, validate format (must contain @ and domain)
   - "Missing required field" → populate from workflow context or previous outputs
   - Empty body/subject → generate a sensible default from workflow context

3. http_request
   Required: { "url": "https://...", "method": "GET|POST|PUT|DELETE|PATCH" }
   Optional: { "headers": {}, "body": {} }
   Common errors & fixes:
   - 404 → check URL path segments, remove double slashes, verify endpoint
   - 400 → inspect body shape, check Content-Type header matches body format
   - 500 → simplify request body, remove optional fields that may cause issues
   - "ECONNREFUSED" → check protocol (http vs https), verify port
   - 401/403 → NOT fixable (auth), confidence = 0
   - 429 → NOT fixable (rate limit), confidence = 0
   - Timeout → NOT fixable (infrastructure), confidence = 0

4. database_query
   Required: { "query": "SELECT ..." }
   Common errors & fixes:
   - SQL syntax error → fix query syntax (missing quotes, commas, parentheses)
   - "relation does not exist" → check table name (try singular/plural, snake_case)
   - "column does not exist" → check column name (snake_case vs camelCase)
   - "permission denied" → NOT fixable, confidence = 0

5. delay_timer
   Required: { "duration": 1000 }
   Optional: { "unit": "ms|s|m|h" }
   Common errors & fixes:
   - "Invalid duration" → convert string to number, ensure positive value
   - NaN → set a sensible default (1000ms)

6. webhook_trigger
   Required: { "url": "https://..." }
   Common errors & fixes:
   - "Invalid URL" → add protocol if missing, fix URL encoding

7. data_transform
   Required: { "expression": "..." }
   Common errors & fixes:
   - "Cannot read property of undefined" → add null checks, use optional chaining
   - "is not a function" → fix expression syntax

8. conditional_branch
   Required: { "condition": "expression" }
   Optional: { "trueNext": "step_id", "falseNext": "step_id" }
   Common errors & fixes:
   - Condition evaluates to undefined → rewrite with explicit null check
   - Reference error → check variable names against workflow context

9. file_upload
   Required: { "path": "/path/to/file" }
   Common errors & fixes:
   - "File not found" → check path separators, try relative vs absolute

10. loop_iterator
    Required: { "items": [] }
    Common errors & fixes:
    - "not iterable" → wrap value in array: [value]
    - "items is undefined" → set to empty array []

━━━ DIAGNOSIS STRATEGY (follow this order) ━━━

Step 1: CLASSIFY THE ERROR
   - Parse HTTP status codes: 4xx = client config error, 5xx = server/transient
   - Extract API error codes (e.g. "channel_not_found", "invalid_email")
   - Categorize: CONFIG_ERROR | DATA_ERROR | AUTH_ERROR | TRANSIENT_ERROR | UNKNOWN

Step 2: DETERMINE IF FIXABLE
   AUTH_ERROR (401, 403, "unauthorized", "forbidden", "permission denied") → confidence = 0
   RATE_LIMIT (429, "quota exceeded", "rate limit") → confidence = 0
   TRANSIENT_ERROR (502, 503, "timeout") → return same config, confidence = 0.5
   CONFIG_ERROR or DATA_ERROR → proceed to fix

Step 3: INSPECT DATA FLOW
   - Check if the failing step uses data from previous steps
   - If a referenced value is null/undefined/empty, find the correct value from previous_outputs
   - Check for type mismatches: string where number expected, object where array expected
   - Check for encoding issues: unescaped special characters, wrong encoding

Step 4: APPLY THE MINIMAL TARGETED FIX
   - Only modify fields directly related to the error
   - Preserve every other field exactly as-is
   - Never remove fields unless they are explicitly causing the error
   - Never invent data that doesn't exist in context or previous outputs
   - If multiple fixes are possible, choose the most conservative one

━━━ OUTPUT FORMAT ━━━

Return ONLY valid JSON:
{
  "fixed_config": {
    // Complete corrected configuration object.
    // Include ALL original fields (changed or unchanged).
    // Only modify what is necessary to fix the error.
  },
  "reasoning": "Concise explanation: [error category] → [root cause] → [what you changed]. Example: 'CONFIG_ERROR → Slack channel #general-test does not exist → changed channel to general (removed # prefix and -test suffix)'",
  "confidence": 0.85
}

Confidence scale:
  0.9–1.0  Obvious typo, missing field, wrong format — fix is certain
  0.7–0.9  Strong pattern match to known error — fix is very likely
  0.4–0.7  Best-guess based on context — may or may not work
  0.1–0.4  Uncertain — low chance of success
  0.0–0.1  Cannot fix — auth, infra, or fundamentally unfixable

━━━ HARD RULES ━━━
- NEVER invent data (emails, URLs, channel names) that isn't in the context or previous outputs
- NEVER change the tool type — only fix the configuration
- ALWAYS return the COMPLETE config object, not just changed fields
- If truly unfixable, return original config unchanged with confidence = 0 and explain why
- Keep reasoning specific: name the exact field changed and the exact reason`;

/**
 * Attempt to fix a failed step using AI
 */
export async function attemptSelfHealing(
  context: SelfHealingContext
): Promise<SelfHealingResult> {
  validateOpenAIConfig();
  
  if (!openai) {
    throw new Error('OpenAI client not available in this context');
  }

  const userPrompt = `━━━ FAILED STEP ━━━
Step ID: ${context.step_id}
Tool: ${context.tool_name}
Step Type: ${context.step_type}
Configuration:
${JSON.stringify(context.step_config, null, 2)}

━━━ ERROR ━━━
Message: ${context.error_message}
${context.error_details ? `Details: ${JSON.stringify(context.error_details, null, 2)}` : ''}

━━━ RUNTIME CONTEXT ━━━
Workflow Input Variables: ${JSON.stringify(context.workflow_context, null, 2)}
Previous Step Outputs: ${JSON.stringify(context.previous_outputs, null, 2)}

Diagnose and fix.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SELF_HEALING_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(content) as SelfHealingResult;

    if (!result.fixed_config || !result.reasoning) {
      throw new Error('Invalid AI response format');
    }

    // Skip retry if AI has no confidence the fix will work
    if (result.confidence <= 0.1) {
      throw new Error(`AI cannot fix this error (confidence: ${result.confidence}): ${result.reasoning}`);
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

  // Errors that are permanent — never attempt healing
  const permanentPatterns = [
    'unauthorized',
    'forbidden',
    'authentication failed',
    'permission denied',
    'quota exceeded',
    'rate limit',
    'rate_limit',
    'missing_scope',
    'invalid_auth',
    'token_revoked',
    'account_suspended',
  ];

  if (permanentPatterns.some(pattern => lowerError.includes(pattern))) {
    return false;
  }

  // Errors that are likely fixable by AI
  const healablePatterns = [
    'not found',
    'not_found',
    'invalid',
    'missing',
    'incorrect',
    'channel',
    'parameter',
    'configuration',
    'format',
    'syntax',
    'cannot read',
    'is not',
    'undefined',
    'null',
    'type error',
    'typeerror',
    'does not exist',
    'no such',
    'bad request',
    '400',
    '404',
    '422',
  ];

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
