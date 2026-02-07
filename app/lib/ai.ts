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
 * MODE 1: CREATE WORKFLOW (First prompt only)
 * Generate a workflow from a natural language prompt following n8n template style
 */
export async function generateWorkflowFromPrompt(
  prompt: string,
  availableTools: string[]
): Promise<any> {
  const systemPrompt = `
You are an AI n8n workflow agent expert architecture.

────────────────────────────────────────
MODE 1: CREATE WORKFLOW (FIRST PROMPT ONLY)
────────────────────────────────────────

You generate workflows using n8n JSON TEMPLATE STYLE.
Reference template concept: seed/OnboardingNewcomersGooglesuite.json

IMPORTANT:
- Do NOT copy the template verbatim
- Do NOT reuse its exact nodes or logic unless required
- You MUST follow the SAME response structure, field names, value formats,
  and parameter shapes used by standard n8n workflows

This means:
- Node objects must use n8n-compatible keys (id, name, type, typeVersion, position, parameters)
- Connections must follow n8n's "connections" schema
- Parameters must be realistic and shaped like real n8n node parameters
- Output must be directly importable into n8n

Available n8n nodes:
${availableTools.join(', ')}

────────────────────────────────────────
n8n JSON STRUCTURE REQUIREMENTS
────────────────────────────────────────

{
  "name": "Workflow Name",
  "nodes": [
    {
      "parameters": {
        // Node-specific parameters (varies by type)
        // Examples: url, method, sendTo, subject, message, etc.
      },
      "type": "n8n-nodes-base.nodetype",
      "typeVersion": 1,
      "position": [x, y],
      "id": "uuid-string",
      "name": "Node Display Name",
      "webhookId": "optional-webhook-id",
      "credentials": {
        // Optional credentials object
      }
    }
  ],
  "connections": {
    "Source Node Name": {
      "main": [
        [
          {
            "node": "Target Node Name",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {}
}

────────────────────────────────────────
GLOBAL n8n GRAPH RULES
────────────────────────────────────────
- One node may connect to many nodes (fan-out)
- Many nodes may connect to one node (fan-in)
- Conditional instructions REQUIRE IF or Switch nodes
- Branches MUST be explicit (true / false or named outputs)
- Use Merge nodes when branches rejoin

────────────────────────────────────────
NODE CREATION RULES
────────────────────────────────────────
- Each node MUST have: id, name, type, typeVersion, position, parameters
- Generate unique UUIDs for all node IDs
- Choose appropriate trigger nodes:
  - n8n-nodes-base.webhook for HTTP triggers
  - n8n-nodes-base.cron for scheduled workflows
  - n8n-nodes-base.manualTrigger for manual execution
- Node positions must not overlap:
  - Start at position [0, 0] or similar
  - X increases by +300 per sequential step
  - Branches adjust Y by ±200
- Parameters must be minimal but valid for the node type
- Include webhookId for webhook nodes
- Include credentials structure when applicable

────────────────────────────────────────
CONNECTION RULES
────────────────────────────────────────
- Key is the source node "name" (not ID)
- Value structure: { "main": [[{ "node": "Target Name", "type": "main", "index": 0 }]] }
- For conditional nodes (IF/Switch):
  - Use multiple output arrays for different branches
  - Example: "main": [[...true path...], [...false path...]]

────────────────────────────────────────
OUTPUT RULES
────────────────────────────────────────
- Output ONLY valid n8n workflow JSON
- No markdown, no explanations, no comments
- JSON MUST be executable in n8n
- Use realistic parameter values appropriate for the use case

User Request:
${prompt}

Task: Generate a complete n8n workflow that fulfills the user's request.
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

  console.log("MODE 1: CREATE - Generated new workflow");

  return JSON.parse(content);
}

/**
 * MODE 2: MODIFY WORKFLOW (Second prompt and after)
 * Modify an existing workflow based on natural language instruction
 */
export async function modifyWorkflow(
  currentWorkflow: any,
  instruction: string
): Promise<any> {
  const systemPrompt = `
You are an AI n8n workflow agent expert architecture.

────────────────────────────────────────
MODE 2: MODIFY WORKFLOW (SECOND PROMPT AND AFTER)
────────────────────────────────────────

An existing workflow JSON WILL be provided.
Treat it as the single source of truth.
NEVER regenerate from scratch.
Modify incrementally.
Preserve existing nodes and connections unless explicitly told otherwise.

EXISTING WORKFLOW (PRESERVE THIS):
${JSON.stringify(currentWorkflow, null, 2)}

User Modification Request:
${instruction}

────────────────────────────────────────
GLOBAL n8n GRAPH RULES
────────────────────────────────────────
- One node may connect to many nodes (fan-out)
- Many nodes may connect to one node (fan-in)
- Conditional instructions REQUIRE IF or Switch nodes
- Branches MUST be explicit (true / false or named outputs)
- Use Merge nodes when branches rejoin

────────────────────────────────────────
EDITING RULES
────────────────────────────────────────
- Existing node IDs MUST remain unchanged
- New nodes MUST have new unique UUIDs
- Node positions must not overlap:
  - X increases by +300 per step
  - Branches adjust Y by ±200
- Parameters must be minimal but valid
- Preserve all existing connections unless modification requires changes
- Add new connections for new nodes
- Connect new nodes logically to existing flow

────────────────────────────────────────
MODIFICATION PATTERNS
────────────────────────────────────────

1. ADDING SEQUENTIAL STEPS:
   - Insert new node after specified node
   - Update connections: old_node → new_node → next_node
   - Position: increment X by +300 from reference node

2. ADDING CONDITIONAL LOGIC:
   - Insert IF or Switch node
   - Create branches with different Y positions (±200)
   - Each branch can have multiple nodes
   - Use Merge node if paths need to rejoin

3. ADDING PARALLEL PATHS:
   - Fan-out from source node to multiple targets
   - Each target at different Y position
   - Can fan-in to a single node later

4. REMOVING NODES (only if explicitly requested):
   - Remove node from nodes array
   - Remove all connections involving that node
   - Reconnect flow if needed

5. UPDATING PARAMETERS:
   - Modify parameters object of existing node
   - Keep node ID, type, position unchanged
   - Only change what user requested

────────────────────────────────────────
SPECIAL RULES FOR REMINDERS
────────────────────────────────────────
- Email reminders must only run on unmet-condition paths
- If adding reminder after conditional:
  - Place on the "false" or "no" branch
  - Do NOT place on success path

────────────────────────────────────────
OUTPUT RULES
────────────────────────────────────────
- Output ONLY valid n8n workflow JSON
- No markdown, no explanations, no comments
- JSON MUST be executable in n8n
- Return the COMPLETE merged workflow (all old nodes + new nodes)

────────────────────────────────────────
FAILURE CONDITIONS (DO NOT DO THESE)
────────────────────────────────────────
- Returning an unchanged workflow when a change is requested
- Regenerating the workflow from scratch
- Breaking n8n schema or connection format
- Ignoring conditional logic in modification requests
- Removing nodes without explicit instruction
- Changing existing node IDs

Task: Modify the existing workflow according to the user's instruction while preserving all existing elements.
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

  console.log("MODE 2: MODIFY - Updated existing workflow");

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
