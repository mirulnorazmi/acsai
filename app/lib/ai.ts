import OpenAI from 'openai';

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

/**
 * Generate a workflow from a natural language prompt
 */
export async function generateWorkflowFromPrompt(
  prompt: string,
  availableTools: string[]
): Promise<any> {
  validateOpenAIConfig();
  
  if (!openai) {
    throw new Error('OpenAI client not available in this context');
  }

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
 * Generate an n8n-compatible workflow JSON from a natural language prompt
 * Uses OpenAI to create deployable n8n workflows
 * NOTE: This should only be called from server-side code (API routes)
 */
export async function generateN8nWorkflowJSON(
  prompt: string,
  availableTools: string[] = []
): Promise<any> {
  validateOpenAIConfig();
  
  if (!openai) {
    throw new Error('OpenAI client not available in this context. This function must be called from server-side code only.');
  }

  const systemPrompt = `You are an expert n8n workflow JSON generator. Your task is to convert natural language descriptions into valid, deployable n8n workflow JSON.

${availableTools.length > 0 ? `Available integrations:\n${availableTools.join('\n')}` : ''}

CRITICAL RULES:
1. Generate ONLY valid n8n workflow JSON - no explanations, markdown, or comments
2. Include all required n8n workflow properties: name, nodes, connections, and settings only
3. Each node MUST have: id (unique string), name, type (n8n-nodes-base.*), typeVersion, position, parameters
4. Use realistic credentials placeholders for Google services (Gmail, Drive, Calendar)
5. Create logical node connections based on the workflow description
6. Include proper node positioning (use [x, y] coordinates, increment by ~150px)
7. Refer to the SAMPLE NODES and WORKFLOW STRUCTURE below for accurate formatting

SAMPLE NODES:

[
  {
    "parameters": {
      "sendTo": "={{  $('Webhook').item.json.email }}",
      "subject": "Welcome to NetHR Team!",
      "emailType": "text",
      "message": "Welcome to the team ",
      "options": {}
    },
    "type": "n8n-nodes-base.gmail",
    "typeVersion": 2.2,
    "position": [
      -352,
      144
    ],
    "id": "1af727fb-11f4-43af-8788-24a1ee3c0f7a",
    "name": "Send a message",
    "webhookId": "61663597-03d2-493b-a758-c7b5986cc57d",
    "credentials": {
      "gmailOAuth2": {
        "id": "cLkHUCavHIfZLAq8",
        "name": "Gmail account"
      }
    }
  },
  {
    "parameters": {
      "resource": "folder",
      "operation": "share",
      "folderNoRootId": {
        "__rl": true,
        "value": "1va0Hp4SOsPdWn8AYGLZNNNRRmz6ociCY",
        "mode": "list",
        "cachedResultName": "Deriv Ai (Team 8)",
        "cachedResultUrl": "https://drive.google.com/drive/folders/1va0Hp4SOsPdWn8AYGLZNNNRRmz6ociCY"
      },
      "permissionsUi": {
        "permissionsValues": {
          "role": "writer",
          "type": "user",
          "emailAddress": "={{ $('Webhook').item.json.email }}"
        }
      },
      "options": {}
    },
    "type": "n8n-nodes-base.googleDrive",
    "typeVersion": 3,
    "position": [
      0,
      176
    ],
    "id": "9918e1a7-403d-4a82-8e60-aae7989d78b2",
    "name": "Share folder",
    "credentials": {
      "googleDriveOAuth2Api": {
        "id": "tsgEwLwHg5ZaPGME",
        "name": "Google Drive account"
      }
    }
  },
  {
    "parameters": {
      "calendar": {
        "__rl": true,
        "value": "e36f78c3281200772d5225bf42e2ce45ef3584f2e4c720a84bb4c4c1cb54d2ca@group.calendar.google.com",
        "mode": "list",
        "cachedResultName": "nethr"
      },
      "end": "={{ \n  $now\n    .plus(1, 'month')\n    .startOf('month')\n    .plus(\n      $now.plus(1, 'month').startOf('month').weekday > 5\n        ? 8 - $now.plus(1, 'month').startOf('month').weekday\n        : 0,\n      'days'\n    )\n}}",
      "useDefaultReminders": false,
      "additionalFields": {
        "conferenceDataUi": {
          "conferenceDataValues": {
            "conferenceSolution": "hangoutsMeet"
          }
        },
        "description": "Onboarding Employee (Office Tour, Access cards, etc. )"
      }
    },
    "type": "n8n-nodes-base.googleCalendar",
    "typeVersion": 1.3,
    "position": [
      0,
      0
    ],
    "id": "9aaba679-fc15-41c0-ae3e-0841aec43fd8",
    "name": "Create an event",
    "credentials": {
      "googleCalendarOAuth2Api": {
        "id": "IxPF391uFXZdyXSx",
        "name": "Google Calendar account"
      }
    }
  },
  {
    "parameters": {
      "content": "### Sample Input\n[\n  \n{\n  \n  \n\"full name\": \n\"Ahmad Ameerul Rasyid\",\n  \n  \n\"email\": \n\"ahmadameerulrasyid@graduate.utm.my\"\n  \n}\n]"
    },
    "type": "n8n-nodes-base.stickyNote",
    "typeVersion": 1,
    "position": [
      -640,
      -64
    ],
    "id": "288694ee-f18f-4044-883b-bf6ac089a628",
    "name": "Sticky Note"
  },
  {
    "parameters": {
      "path": "onboarding_newcomers_googlesuite",
      "options": {}
    },
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 2.1,
    "position": [
      -576,
      144
    ],
    "id": "3696eb20-2a03-4206-9060-5768a2c269e6",
    "name": "Webhook",
    "webhookId": "9bcbfddc-ca66-4bf4-bccd-7c6183076469"
  }
]



WORKFLOW STRUCTURE:
{
  "name": "Workflow name from prompt",
  "nodes": [
    {
      "id": "node-1",
      "name": "Trigger Node",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [0, 0],
      "parameters": { ... },
      "credentials": { ... }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [{ "node": "Next Node Name", "type": "main", "index": 0 }]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "availableInMCP": false
  }
}

Node Type Guidelines:
- Start with: n8n-nodes-base.webhook (HTTP triggers)
- Email: n8n-nodes-base.gmail (requires gmailOAuth2)
- Google Drive: n8n-nodes-base.googleDrive (requires googleDriveOAuth2Api)
- Google Calendar: n8n-nodes-base.googleCalendar (requires googleCalendarOAuth2Api)
- Delays: n8n-nodes-base.wait
- Conditions: n8n-nodes-base.if
- Data processing: n8n-nodes-base.set
- End: n8n-nodes-base.respondToWebhook or leave open for async

Auto-detect from keywords:
- "email", "send", "gmail" → Gmail node
- "drive", "google drive", "save", "document" → Google Drive node
- "calendar", "event", "schedule", "meeting" → Google Calendar node
- "wait", "delay", "pause" → Wait node

Return ONLY the complete, valid JSON object. No markdown formatting.`;

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
    throw new Error('No response from OpenAI for n8n workflow generation');
  }

  console.log('Generated n8n workflow:', content);

  return JSON.parse(content);
}

/**
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
