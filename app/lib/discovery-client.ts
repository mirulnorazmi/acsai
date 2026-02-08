/**
 * Discovery API Client
 * TypeScript client for semantic search and tool management
 */

import type {
  SearchToolsResponse,
  RegisterToolRequest,
  RegisterToolResponse,
  ListToolsResponse,
} from '@/types/discovery';

export class DiscoveryClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string = '/api/x_discovery', token: string) {
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
   * Search for tools using natural language
   */
  async searchTools(
    query: string,
    options?: {
      limit?: number;
      threshold?: number;
    }
  ): Promise<SearchToolsResponse> {
    const params = new URLSearchParams({
      q: query,
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.threshold && { threshold: options.threshold.toString() }),
    });

    const response = await fetch(`${this.baseUrl}/search?${params}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to search tools');
    }

    return response.json();
  }

  /**
   * Get all registered tools
   */
  async listTools(): Promise<ListToolsResponse> {
    const response = await fetch(`${this.baseUrl}/tools`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch tools');
    }

    return response.json();
  }

  /**
   * Register a new tool (admin only)
   */
  async registerTool(data: RegisterToolRequest): Promise<RegisterToolResponse> {
    const response = await fetch(`${this.baseUrl}/tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to register tool');
    }

    return response.json();
  }
}

/**
 * React Hook Example for Discovery
 */
export function useDiscoveryExample() {
  const client = new DiscoveryClient('/api/x_discovery', 'your-auth-token');

  const searchTools = async (query: string) => {
    try {
      const results = await client.searchTools(query, {
        limit: 5,
        threshold: 0.5,
      });

      console.log(`Found ${results.total} tools matching "${query}"`);
      results.matches.forEach(match => {
        console.log(`  - ${match.name} (${match.platform}): ${match.similarity.toFixed(2)}`);
      });

      return results;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  };

  const getAllTools = async () => {
    try {
      const { tools, total } = await client.listTools();
      console.log(`Total tools: ${total}`);
      return tools;
    } catch (error) {
      console.error('Failed to fetch tools:', error);
      throw error;
    }
  };

  const registerNewTool = async (tool: RegisterToolRequest) => {
    try {
      const result = await client.registerTool(tool);
      console.log(`Registered tool: ${result.name} (${result.embedding_status})`);
      return result;
    } catch (error) {
      console.error('Failed to register tool:', error);
      throw error;
    }
  };

  return {
    searchTools,
    getAllTools,
    registerNewTool,
  };
}
