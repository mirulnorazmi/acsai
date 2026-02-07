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
- ONLY use node types from the available list or standard n8n nodes (e.g., n8n-nodes-base.webhook, n8n-nodes-base.httpRequest)
- DO NOT include explanations, markdown, or comments
- DO NOT include text outside the JSON
- The workflow must be executable in n8n
- Each step MUST be a valid n8n node object

Return ONLY a JSON object with this exact structure (based on n8n schema):

{
  "name": "Workflow Name",
  "nodes": [
    {
      "parameters": {
        "url": "https://example.com/webhook",
        "method": "POST",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [0, 0],
      "id": "uuid-string",
      "name": "HTTP Request"
    }
  ],
  "connections": {
    "Node Name": {
      "main": [
        [
          {
            "node": "Next Node Name",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}

Guidelines:
- "nodes": Array of node objects.
  - "id": UUID.
  - "name": Unique display name.
  - "type": n8n node type (e.g., "n8n-nodes-base.webhook", "n8n-nodes-base.gmail", "n8n-nodes-base.httpRequest"). Use the available tools list to infer the type.
  - "position": [x, y] coordinates. Use incremental positioning (x +300, y +0) for visualization.
  - "parameters": Logic and configuration.
- "connections": Object defining the standard n8n wiring.
  - Key is the source node "name".
  - Value has "main": [[{ "node": "Target Node Name", "type": "main", "index": 0 }]]
- Use "n8n-nodes-base.webhook" as the trigger if implied.
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
  const systemPrompt = `
You are an expert Workflow Architect for n8n.

CRITICAL: You are INTEGRATING new steps into an EXISTING workflow. DO NOT regenerate from scratch.

Current Workflow (Row 1 - PRESERVE THIS):
${JSON.stringify(currentWorkflow, null, 2)}

User Request (Row 2 - ADD THIS):
${instruction}

Task: INTEGRATE the new step into the Current Workflow.

Rules:
1. PRESERVATION: Do NOT delete existing steps unless explicitly asked
2. INTEGRATION: Connect the last step of the old flow to the new step
3. IDs: Keep existing node IDs stable. Generate new UUIDs for new nodes only
4. CONNECTIONS: Maintain all existing connections. Add new connections for new nodes
5. POSITIONING: Calculate new X/Y positions to avoid overlap
   - If adding sequentially: increment Y by +150 from last node
   - If adding branches: shift X by +300 for parallel paths
6. BRANCHING: If user asks for conditions (e.g., 'if/else', 'check status'), insert an n8n-nodes-base.if node
7. MERGING: Connect new nodes logically to existing flow

Strict Output Rules:
- Output ONLY the updated workflow JSON
- No explanations, no markdown, no comments
- Return the COMPLETE merged workflow (all old nodes + new nodes)
- Use valid n8n node structures

Return format:
{
  "name": "Workflow Name",
  "nodes": [...all nodes including old and new...],
  "connections": {...all connections including old and new...},
  "settings": { "executionOrder": "v1" }
}
`;

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
