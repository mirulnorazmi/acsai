/**
 * Discovery Module Type Definitions
 * Types for semantic search and tool registry
 */

/**
 * Tool/Action in the library
 */
export interface ActionTool {
  id: string;
  name: string;
  platform: string;
  description: string;
  schema: Record<string, any>; // JSON Schema
  embedding?: number[];
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Search Match Result
 */
export interface SearchMatch {
  id: string;
  name: string;
  platform: string;
  description: string;
  schema: Record<string, any>;
  similarity: number;
}

/**
 * Tool Summary (for listing)
 */
export interface ToolSummary {
  id: string;
  name: string;
  platform: string;
  description: string;
}

/**
 * API Request/Response Types
 */

// GET /api/x_discovery/search
export interface SearchToolsRequest {
  q: string; // Query string
  limit?: number; // Max results (default 5)
  threshold?: number; // Similarity threshold (default 0.5)
}

export interface SearchToolsResponse {
  query: string;
  matches: SearchMatch[];
  total: number;
}

// POST /api/x_discovery/tools
export interface RegisterToolRequest {
  name: string;
  platform: string;
  description: string;
  schema: Record<string, any>; // JSON Schema
}

export interface RegisterToolResponse {
  id: string;
  name: string;
  embedding_status: 'generated' | 'pending' | 'failed';
}

// GET /api/x_discovery/tools
export interface ListToolsResponse {
  tools: ToolSummary[];
  total: number;
}

/**
 * Embedding Generation
 */
export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

/**
 * Platform Types
 */
export type ToolPlatform = 
  | 'slack'
  | 'email'
  | 'http'
  | 'database'
  | 'webhook'
  | 'file'
  | 'calendar'
  | 'crm'
  | 'analytics'
  | 'other';

export const TOOL_PLATFORMS: ToolPlatform[] = [
  'slack',
  'email',
  'http',
  'database',
  'webhook',
  'file',
  'calendar',
  'crm',
  'analytics',
  'other',
];
