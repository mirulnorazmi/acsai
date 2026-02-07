import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || '';

// Create client with fallback for build time
// Runtime validation will happen when functions are called
export const openai = new OpenAI({
  apiKey: apiKey || 'placeholder-key',
});

/**
 * Validate that OpenAI is properly configured
 * Call this before making API calls
 */
export function validateOpenAIConfig() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment variable. Please set it in your .env.local file');
  }
}

/**
 * Generate a workflow from a natural language prompt
 */
export async function generateWorkflowFromPrompt(
  prompt: string,
  availableTools: string[]
): Promise<any> {
  const systemPrompt = `You are an AI workflow generator. Given a user's natural language request and a list of available tools, generate a JSON workflow with steps.

Available tools: ${availableTools.join(', ')}

Return ONLY a JSON object with this structure:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "steps": [
    {
      "id": "step_1",
      "type": "action",
      "tool": "tool_name",
      "config": {},
      "position": { "x": 0, "y": 0 }
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  return JSON.parse(content);
}

/**
 * Modify an existing workflow based on natural language instruction
 */
export async function modifyWorkflow(
  currentWorkflow: any,
  instruction: string
): Promise<any> {
  const systemPrompt = `You are an AI workflow modifier. Given an existing workflow JSON and a modification instruction, return the updated workflow.

Return ONLY the modified JSON workflow with the same structure as the input.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Current workflow:\n${JSON.stringify(currentWorkflow, null, 2)}\n\nModification: ${instruction}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  return JSON.parse(content);
}

/**
 * Generate a diff summary between two workflows
 */
export function generateDiff(oldWorkflow: any, newWorkflow: any): string {
  const changes: string[] = [];

  if (oldWorkflow.name !== newWorkflow.name) {
    changes.push(`Name changed: "${oldWorkflow.name}" → "${newWorkflow.name}"`);
  }

  const oldStepCount = oldWorkflow.steps?.length || 0;
  const newStepCount = newWorkflow.steps?.length || 0;

  if (oldStepCount !== newStepCount) {
    changes.push(`Steps count: ${oldStepCount} → ${newStepCount}`);
  }

  if (changes.length === 0) {
    return 'Minor configuration changes';
  }

  return changes.join('; ');
}
