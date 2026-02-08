/**
 * Memory Module Type Definitions
 * Types for RAG (Retrieval-Augmented Generation) and entity memory
 */

/**
 * Entity Memory Record
 */
export interface EntityMemory {
  id: string;
  user_id: string;
  subject: string; // Entity name (person, project, etc.)
  fact: string; // The actual information
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

/**
 * Memory Fact (simplified for responses)
 */
export interface MemoryFact {
  id: string;
  fact: string;
  created_at: string;
}

/**
 * API Request/Response Types
 */

// GET /api/memory/context
export interface GetContextRequest {
  entity: string; // Entity name to search for
}

export interface GetContextResponse {
  entity: string;
  facts: string[];
  total: number;
}

// POST /api/memory/facts
export interface StoreFactRequest {
  subject: string; // Entity name
  fact: string; // The fact to store
}

export interface StoreFactResponse {
  status: 'stored';
  id: string;
  embedding_status: 'generated' | 'pending' | 'failed';
}

// DELETE /api/memory/entity/[id]
export interface DeleteMemoryResponse {
  status: 'deleted';
  id: string;
}

/**
 * Vector Search Result
 */
export interface MemorySearchResult {
  id: string;
  subject: string;
  fact: string;
  similarity: number;
  created_at: string;
}

/**
 * RAG Context
 * Context retrieved for augmenting prompts
 */
export interface RAGContext {
  entity: string;
  facts: string[];
  relevance_scores?: number[];
}
