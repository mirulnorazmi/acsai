import type { N8NWorkflow, N8NConnection, N8NNode } from '@/types/learning';
import type { WorkflowStep } from '@/types/orchestrator';

/**
 * Translator Service
 * Adapter pattern for converting internal workflow format to external platforms.
 */

/**
 * Convert internal steps to n8n format
 */
export function convertToN8N(steps: WorkflowStep[]): N8NWorkflow {
  if (!steps || steps.length === 0) {
    return { nodes: [], connections: {} };
  }

  const nodes: N8NNode[] = [];
  const connections: Record<string, N8NConnection> = {};

  // Add Start Node (Trigger)
  const startNode: N8NNode = {
    parameters: {},
    name: 'Start',
    type: 'n8n-nodes-base.start',
    typeVersion: 1,
    position: [250, 300],
  };
  nodes.push(startNode);

  let previousNodeName = 'Start';
  let x = 450;
  let y = 300;

  // Map each step to n8n node
  steps.forEach((step, index) => {
    const nodeName = step.id || `Step ${index + 1}`;
    const nodeType = mapToN8NType(step.tool);

    const node: N8NNode = {
      parameters: mapToN8NParameters(step),
      name: nodeName,
      type: nodeType,
      typeVersion: 1,
      position: [x, y],
    };

    nodes.push(node);

    // Create connection from previous node
    if (previousNodeName) {
      if (!connections[previousNodeName]) {
        connections[previousNodeName] = { main: [] };
      }
      connections[previousNodeName].main.push([{
        node: nodeName,
        type: 'main',
        index: 0,
      }]);
    }

    previousNodeName = nodeName;
    x += 200; // Layout spacing
  });

  return { nodes, connections };
}

/**
 * Map internal tool type to n8n node type
 */
function mapToN8NType(tool?: string): string {
  switch (tool) {
    case 'slack_send_message':
    case 'slack_invite':
      return 'n8n-nodes-base.slack';
    case 'email_send':
      return 'n8n-nodes-base.emailSend';
    case 'http_request':
      return 'n8n-nodes-base.httpRequest';
    case 'database_query':
      return 'n8n-nodes-base.postgres';
    case 'delay_timer':
      return 'n8n-nodes-base.wait';
    default:
      return 'n8n-nodes-base.noOp'; // Fallback for unknown tools
  }
}

/**
 * Map internal config to n8n parameters
 */
function mapToN8NParameters(step: WorkflowStep): Record<string, any> {
  const config = step.config || {};
  const params: Record<string, any> = {};

  switch (step.tool) {
    case 'slack_send_message':
      params.channel = config.channel || '';
      params.text = config.message || '';
      params.authentication = 'oAuth2'; // Default assumption
      break;

    case 'email_send':
      params.toEmail = config.to || '';
      params.subject = config.subject || '';
      params.text = config.body || '';
      break;

    case 'http_request':
      params.url = config.url || '';
      params.method = (config.method || 'GET').toUpperCase();
      // headers and query params would need flattening
      break;
      
    case 'database_query':
      params.operation = 'executeQuery';
      params.query = config.query || '';
      break;

    case 'delay_timer':
      params.amount = config.duration ? config.duration / 1000 : 1; // Convert ms to seconds
      params.unit = 'seconds';
      break;

    default:
      // Pass raw config for NoOp or custom nodes
      Object.assign(params, config);
  }

  return params;
}

/**
 * Convert internal workflow to Zapier format (Placeholder)
 */
export function convertToZapier(steps: WorkflowStep[]): any {
  throw new Error('Zapier export is not yet implemented.');
}
