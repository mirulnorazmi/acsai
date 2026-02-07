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
  const systemPrompt = `
You are an AI that generates VALID n8n workflow JSON.

You will be given:
1. A natural language request from the user
2. A list of available n8n node types

Available n8n nodes:
${availableTools.join(', ')}

Rules:
- You MUST generate valid n8n-compatible JSON
- ONLY use node types from the available list
- DO NOT include explanations, markdown, or comments
- DO NOT include text outside the JSON
- The workflow must be executable in n8n
- Each step MUST be a valid n8n node object

Return ONLY a JSON object with this exact structure:

{
  "name": "Workflow Name",
  "description": "Brief description",
  "steps": [
    {
      "id": "uuid-or-string",
      "name": "Node Name",
      "type": "n8n-node-type",
      "typeVersion": 1,
      "position": [0, 0],
      "parameters": {}
    },

       "nodes": [
         { id: '1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'New Employee Added', description: 'HR System Webhook', nodeType: 'trigger' } },
         { id: '2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Create User Account', description: 'Active Directory', nodeType: 'action', icon: 'users' } },
         { id: '3', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Send Welcome Email', description: 'Email Service', nodeType: 'action', icon: 'email' } },
         { id: '4', type: 'condition', position: { x: 250, y: 440 }, data: { label: 'Is Manager?', description: 'Check role', nodeType: 'condition' } },
         { id: '5', type: 'action', position: { x: 100, y: 580 }, data: { label: 'Grant Admin Access', description: 'Permission System', nodeType: 'action' } },
         { id: '6', type: 'delay', position: { x: 400, y: 580 }, data: { label: 'Wait 3 Days', description: 'Follow-up delay', nodeType: 'delay' } },
       ] as Node[],
       "edges": [
         { id: 'e1-2', source: '1', target: '2', animated: true },
         { id: 'e2-3', source: '2', target: '3' },
         { id: 'e3-4', source: '3', target: '4' },
         { id: 'e4-5', source: '4', target: '5', sourceHandle: 'yes', label: 'Yes' },
         { id: 'e4-6', source: '4', target: '6', sourceHandle: 'no', label: 'No' },
       ] as Edge[]
  ],
  "connections": {}
}

Guidelines:
- Use incremental positioning (x +300, y +0) for each node
- Generate realistic parameters for each node
- Connect nodes logically in the "connections" object
- Use Webhook or Trigger nodes if the workflow needs to start automatically
`;

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

  console.log("generate workflowcontent : " + content);

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
 * Generate a diff summary between two x_workflows
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
