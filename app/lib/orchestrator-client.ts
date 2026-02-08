/**
 * Orchestrator API Client
 * TypeScript client for interacting with the Orchestrator API
 */

import type {
  GenerateWorkflowRequest,
  GenerateWorkflowResponse,
  GetWorkflowResponse,
  UpdateWorkflowRequest,
  UpdateWorkflowResponse,
  ModifyWorkflowRequest,
  ModifyWorkflowResponse,
  DeleteWorkflowResponse,
  ErrorResponse,
} from '@/types/orchestrator';

export class OrchestratorClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string = '/api/orchestrator', token: string) {
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
   * Generate a new workflow from a natural language prompt
   */
  async generateWorkflow(
    data: GenerateWorkflowRequest
  ): Promise<GenerateWorkflowResponse> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to generate workflow');
    }

    return response.json();
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(id: string): Promise<GetWorkflowResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to fetch workflow');
    }

    return response.json();
  }

  /**
   * Update a workflow's steps (manual update)
   */
  async updateWorkflow(
    id: string,
    data: UpdateWorkflowRequest
  ): Promise<UpdateWorkflowResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to update workflow');
    }

    return response.json();
  }

  /**
   * Modify a workflow using natural language instruction
   */
  async modifyWorkflow(
    id: string,
    data: ModifyWorkflowRequest
  ): Promise<ModifyWorkflowResponse> {
    const response = await fetch(`${this.baseUrl}/${id}/modify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to modify workflow');
    }

    return response.json();
  }

  /**
   * Delete a workflow (soft delete)
   */
  async deleteWorkflow(id: string): Promise<DeleteWorkflowResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to delete workflow');
    }

    return response.json();
  }
}

/**
 * Example usage in a React component
 */
export function useOrchestratorExample() {
  const client = new OrchestratorClient('/api/orchestrator', 'your-auth-token');

  const createWorkflow = async () => {
    try {
      const result = await client.generateWorkflow({
        prompt: 'Send a Slack invite and email to new users',
      });
      console.log('Created workflow:', result);
      return result;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  };

  const loadWorkflow = async (id: string) => {
    try {
      const workflow = await client.getWorkflow(id);
      console.log('Loaded workflow:', workflow);
      return workflow;
    } catch (error) {
      console.error('Error loading workflow:', error);
      throw error;
    }
  };

  const updateWorkflowSteps = async (id: string, steps: any[]) => {
    try {
      const result = await client.updateWorkflow(id, { steps });
      console.log('Updated workflow:', result);
      return result;
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  };

  const modifyWithAI = async (id: string, instruction: string, version: number) => {
    try {
      const result = await client.modifyWorkflow(id, {
        instruction,
        current_version: version,
      });
      console.log('Modified workflow:', result);
      return result;
    } catch (error) {
      console.error('Error modifying workflow:', error);
      throw error;
    }
  };

  const removeWorkflow = async (id: string) => {
    try {
      const result = await client.deleteWorkflow(id);
      console.log('Deleted workflow:', result);
      return result;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  };

  return {
    createWorkflow,
    loadWorkflow,
    updateWorkflowSteps,
    modifyWithAI,
    removeWorkflow,
  };
}
