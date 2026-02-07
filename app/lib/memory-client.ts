/**
 * Memory API Client
 * TypeScript client for RAG context retrieval and memory management
 */

import type {
  GetContextResponse,
  StoreFactRequest,
  StoreFactResponse,
  DeleteMemoryResponse,
} from '@/types/memory';

export class MemoryClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string = '/api/memory', token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Set or update the authorization token
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * Get context/facts about an entity (for RAG)
   */
  async getContext(entity: string): Promise<GetContextResponse> {
    const params = new URLSearchParams({ entity });

    const response = await fetch(`${this.baseUrl}/context?${params}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to retrieve context');
    }

    return response.json();
  }

  /**
   * Store a new memory fact
   */
  async storeFact(data: StoreFactRequest): Promise<StoreFactResponse> {
    const response = await fetch(`${this.baseUrl}/facts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to store fact');
    }

    return response.json();
  }

  /**
   * Delete a memory fact
   */
  async deleteMemory(memoryId: string): Promise<DeleteMemoryResponse> {
    const response = await fetch(`${this.baseUrl}/entity/${memoryId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete memory');
    }

    return response.json();
  }

  /**
   * Get context and format for RAG prompt augmentation
   */
  async getRAGContext(entity: string): Promise<string> {
    try {
      const { facts } = await this.getContext(entity);
      
      if (facts.length === 0) {
        return '';
      }

      // Format facts for prompt injection
      return `\n\nContext about ${entity}:\n${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
    } catch (error) {
      console.error('Failed to get RAG context:', error);
      return ''; // Return empty string if no context available
    }
  }
}

/**
 * React Hook Example for Memory
 */
export function useMemoryExample() {
  const client = new MemoryClient('/api/memory', 'your-auth-token');

  const getEntityContext = async (entity: string) => {
    try {
      const context = await client.getContext(entity);
      console.log(`Found ${context.total} facts about ${entity}`);
      context.facts.forEach((fact, i) => {
        console.log(`  ${i + 1}. ${fact}`);
      });
      return context;
    } catch (error) {
      console.error('Failed to get context:', error);
      throw error;
    }
  };

  const addMemoryFact = async (subject: string, fact: string) => {
    try {
      const result = await client.storeFact({ subject, fact });
      console.log(`Stored fact: ${result.id} (${result.embedding_status})`);
      return result;
    } catch (error) {
      console.error('Failed to store fact:', error);
      throw error;
    }
  };

  const removeMemory = async (memoryId: string) => {
    try {
      const result = await client.deleteMemory(memoryId);
      console.log(`Deleted memory: ${result.id}`);
      return result;
    } catch (error) {
      console.error('Failed to delete memory:', error);
      throw error;
    }
  };

  const augmentPrompt = async (basePrompt: string, entity: string) => {
    try {
      const context = await client.getRAGContext(entity);
      return basePrompt + context;
    } catch (error) {
      console.error('Failed to augment prompt:', error);
      return basePrompt; // Return original prompt if context fails
    }
  };

  return {
    getEntityContext,
    addMemoryFact,
    removeMemory,
    augmentPrompt,
  };
}

/**
 * Helper function to augment AI prompts with memory context
 */
export async function augmentWithMemory(
  prompt: string,
  entities: string[],
  token: string
): Promise<string> {
  const client = new MemoryClient('/api/memory', token);
  
  let augmentedPrompt = prompt;
  
  for (const entity of entities) {
    const context = await client.getRAGContext(entity);
    if (context) {
      augmentedPrompt += context;
    }
  }
  
  return augmentedPrompt;
}
