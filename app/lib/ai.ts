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
You are an expert n8n workflow JSON generator.

Your task is to convert natural language instructions into a COMPLETE,
VALID, and DEPLOYABLE n8n workflow JSON focused on INTEGRATIONS
(Gmail, Google Drive, Google Calendar, etc.).

You must strictly follow n8n workflow schema and parameter conventions.

────────────────────────────────────────
MODE 1: CREATE WORKFLOW
────────────────────────────────────────
- Generate a full n8n workflow JSON from scratch
- Choose appropriate trigger nodes (Manual Trigger, Webhook, Cron)
- Build a complete integration flow
- Output the FULL workflow JSON

Available integrations:
${availableTools.join(', ')}

────────────────────────────────────────
CRITICAL OUTPUT RULES (MUST FOLLOW)
────────────────────────────────────────
1. Output ONLY valid JSON — no explanations, markdown, or comments
2. Output MUST contain ONLY these top-level keys:
   - name
   - nodes
   - connections
   - settings
3. Every node MUST include:
   - id (unique UUID string)
   - name (unique display name)
   - type (must start with n8n-nodes-base.)
   - typeVersion (number)
   - position [x, y]
   - parameters (object)
4. Use realistic credential placeholders for Google services:
   - gmailOAuth2
   - googleDriveOAuth2Api
   - googleCalendarOAuth2Api
5. The JSON MUST be directly importable into n8n without errors

────────────────────────────────────────
n8n GRAPH & CONNECTION RULES
────────────────────────────────────────
- One node MAY connect to multiple nodes (fan-out)
- Multiple nodes MAY connect to one node (fan-in)
- Connections MUST follow n8n's "connections" object format:
  {
    "Source Node Name": {
      "main": [
        [
          { "node": "Target Node Name", "type": "main", "index": 0 }
        ]
      ]
    }
  }
- Use "main" output unless a node explicitly supports others
- Conditional logic MUST use:
  - n8n-nodes-base.if
  - n8n-nodes-base.switch
- When branches rejoin, use n8n-nodes-base.merge

────────────────────────────────────────
NODE POSITIONING RULES
────────────────────────────────────────
- Use [x, y] coordinates
- Start at [0, 0] or similar
- Increment X by ~150–250 per sequential step
- Use Y offsets (+/- 150–200) for parallel branches
- Avoid overlapping nodes

────────────────────────────────────────
INTEGRATION AUTO-DETECTION
────────────────────────────────────────
Infer nodes from keywords:
- "email", "send", "gmail" → n8n-nodes-base.gmail
- "google drive", "file", "folder", "copy", "download" → n8n-nodes-base.googleDrive
- "calendar", "event", "schedule", "meeting" → n8n-nodes-base.googleCalendar
- "wait", "delay" → n8n-nodes-base.wait
- "condition", "if", "else" → n8n-nodes-base.if
- "manual", "test" → n8n-nodes-base.manualTrigger
- "webhook", "api" → n8n-nodes-base.webhook

────────────────────────────────────────
PARAMETER RULES
────────────────────────────────────────
- Parameters MUST resemble real n8n node parameters
- Use expressions like:
  {{ $('Node Name').item.json.field }}
- Keep parameters minimal but valid
- Do NOT invent unsupported parameter names
- Common parameters:
  - Gmail: sendTo, subject, message, emailType
  - Google Drive: resource, operation, folderId, permissions
  - Google Calendar: calendar, start, end, summary, description

────────────────────────────────────────
EXAMPLE OUTPUT STRUCTURE
────────────────────────────────────────
{
  "name": "Workflow Name",
  "nodes": [
    {
      "parameters": {},
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [0, 0],
      "id": "uuid-1",
      "name": "When clicking 'Execute workflow'"
    },
    {
      "parameters": {
        "sendTo": "user@example.com",
        "subject": "Hello",
        "message": "Test message"
      },
      "type": "n8n-nodes-base.gmail",
      "typeVersion": 2.2,
      "position": [250, 0],
      "id": "uuid-2",
      "name": "Send Email",
      "credentials": {
        "gmailOAuth2": {
          "id": "placeholder-id",
          "name": "Gmail account"
        }
      }
    }
  ],
  "connections": {
    "When clicking 'Execute workflow'": {
      "main": [
        [
          { "node": "Send Email", "type": "main", "index": 0 }
        ]
      ]
    }
  },
  "settings": {}
}

────────────────────────────────────────
USER REQUEST
────────────────────────────────────────
${prompt}

────────────────────────────────────────
TASK
────────────────────────────────────────
Generate a complete n8n workflow JSON that fulfills the user's request.
Output ONLY the JSON. No explanations.
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
You are an expert n8n workflow JSON generator.

Your task is to MODIFY an existing n8n workflow JSON based on user instructions.

You must strictly follow n8n workflow schema and parameter conventions.

────────────────────────────────────────
MODE 2: MODIFY WORKFLOW
────────────────────────────────────────
- An existing workflow JSON WILL be provided
- Treat it as the SINGLE source of truth
- NEVER regenerate from scratch
- Modify incrementally
- Preserve existing nodes and connections unless explicitly told otherwise
- Add, update, or reconnect nodes as required

EXISTING WORKFLOW (PRESERVE THIS):
${JSON.stringify(currentWorkflow, null, 2)}

USER MODIFICATION REQUEST:
${instruction}

────────────────────────────────────────
CRITICAL OUTPUT RULES (MUST FOLLOW)
────────────────────────────────────────
1. Output ONLY valid JSON — no explanations, markdown, or comments
2. Output MUST contain ONLY these top-level keys:
   - name
   - nodes
   - connections
   - settings
3. Every node MUST include:
   - id (preserve existing IDs, generate new UUIDs for new nodes)
   - name (unique display name)
   - type (must start with n8n-nodes-base.)
   - typeVersion (number)
   - position [x, y]
   - parameters (object)
4. Use realistic credential placeholders for Google services
5. The JSON MUST be directly importable into n8n without errors

────────────────────────────────────────
n8n GRAPH & CONNECTION RULES
────────────────────────────────────────
- One node MAY connect to multiple nodes (fan-out)
- Multiple nodes MAY connect to one node (fan-in)
- Connections MUST follow n8n's "connections" object format
- Use "main" output unless a node explicitly supports others
- Conditional logic MUST use:
  - n8n-nodes-base.if
  - n8n-nodes-base.switch
- When branches rejoin, use n8n-nodes-base.merge

────────────────────────────────────────
MODIFICATION RULES
────────────────────────────────────────
- Existing node IDs MUST remain unchanged
- New nodes MUST have new unique UUIDs
- Preserve all existing connections unless modification requires changes
- Add new connections for new nodes
- Connect new nodes logically to existing flow

────────────────────────────────────────
NODE POSITIONING RULES
────────────────────────────────────────
- Use [x, y] coordinates
- Increment X by ~150–250 per sequential step from last node
- Use Y offsets (+/- 150–200) for parallel branches
- Avoid overlapping nodes

────────────────────────────────────────
INTEGRATION AUTO-DETECTION
────────────────────────────────────────
Infer nodes from keywords:
- "email", "send", "gmail" → n8n-nodes-base.gmail
- "google drive", "file", "folder", "copy", "download" → n8n-nodes-base.googleDrive
- "calendar", "event", "schedule", "meeting" → n8n-nodes-base.googleCalendar
- "wait", "delay" → n8n-nodes-base.wait
- "condition", "if", "else" → n8n-nodes-base.if
- "manual", "test" → n8n-nodes-base.manualTrigger
- "webhook", "api" → n8n-nodes-base.webhook

────────────────────────────────────────
PARAMETER RULES
────────────────────────────────────────
- Parameters MUST resemble real n8n node parameters
- Use expressions like:
  {{ $('Node Name').item.json.field }}
- Keep parameters minimal but valid
- Do NOT invent unsupported parameter names
- Common parameters:
  - Gmail: sendTo, subject, message, emailType
  - Google Drive: resource, operation, folderId, permissions
  - Google Calendar: calendar, start, end, summary, description

────────────────────────────────────────
MODIFICATION PATTERNS
────────────────────────────────────────

1. ADDING SEQUENTIAL STEPS:
   - Insert new node after specified node
   - Update connections: old_node → new_node → next_node
   - Position: increment X by ~200 from reference node

2. ADDING CONDITIONAL LOGIC:
   - Insert IF or Switch node
   - Create branches with different Y positions
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
FAILURE CONDITIONS (DO NOT DO THESE)
────────────────────────────────────────
- Returning non-JSON output
- Returning an unchanged workflow when a change is requested
- Regenerating the workflow from scratch
- Breaking n8n connection schema
- Removing nodes without explicit instruction
- Changing existing node IDs

────────────────────────────────────────
TASK
────────────────────────────────────────
Modify the existing workflow according to the user's instruction.
Preserve all existing elements unless explicitly told to remove them.
Output ONLY the complete modified workflow JSON. No explanations.
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
