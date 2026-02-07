/**
 * Learning Module Type Definitions
 * Types for translation and RLHF feedback
 */

/**
 * Supported Export Platforms
 */
export type ExportPlatform = 'n8n' | 'zapier';

/**
 * Feedback Rating (1-5)
 */
export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

/**
 * API Request/Response Types
 */

// POST /api/export/[id]
export interface ExportWorkflowRequest {
  target_platform: ExportPlatform;
}

export interface ExportWorkflowResponse {
  platform: ExportPlatform;
  json_content: Record<string, any>; // Platform-specific JSON
  workflow_name: string;
}

// POST /api/learning/feedback
export interface RecordFeedbackRequest {
  execution_id: string;
  rating: number; // 1-5
  comment?: string;
}

export interface RecordFeedbackResponse {
  status: 'recorded';
  execution_id: string;
  is_gold_standard?: boolean;
}

// GET /api/learning/templates
export interface GetTemplatesRequest {
  category?: string;
  limit?: number;
}

export interface TemplateWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: any[]; // JSON
  is_gold_standard: boolean;
  rating_avg?: number;
}

export interface GetTemplatesResponse {
  templates: TemplateWorkflow[];
  total: number;
}

/**
 * n8n Workflow Types (Simplified)
 */
export interface N8NNode {
  parameters: Record<string, any>;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  id?: string;
}

export interface N8NConnection {
  main: Array<Array<{
    node: string;
    type: string;
    index: number;
  }>>;
}

export interface N8NWorkflow {
  nodes: N8NNode[];
  connections: Record<string, N8NConnection>;
  meta?: Record<string, any>;
}
