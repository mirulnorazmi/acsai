/**
 * Execution Engine API Client
 * TypeScript client for triggering and monitoring workflow executions
 */

import type {
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
  ExecutionStatusResponse,
  HealingEventsResponse,
} from '@/types/execution';

export class ExecutionClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string = '/api/execute', token: string) {
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
   * Execute a workflow (async, fire-and-forget)
   */
  async executeWorkflow(
    workflowId: string,
    data?: ExecuteWorkflowRequest
  ): Promise<ExecuteWorkflowResponse> {
    const response = await fetch(`${this.baseUrl}/${workflowId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(data || {}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to execute workflow');
    }

    return response.json();
  }

  /**
   * Get x_execution status (for polling)
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionStatusResponse> {
    const response = await fetch(`${this.baseUrl}/${executionId}/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch x_execution status');
    }

    return response.json();
  }

  /**
   * Get self-healing events for an x_execution
   */
  async getHealingEvents(executionId: string): Promise<HealingEventsResponse> {
    const response = await fetch(`${this.baseUrl}/${executionId}/healing-events`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch healing events');
    }

    return response.json();
  }

  /**
   * Poll x_execution status until completion
   * Returns a promise that resolves when x_execution completes or fails
   */
  async pollUntilComplete(
    executionId: string,
    options: {
      intervalMs?: number;
      timeoutMs?: number;
      onProgress?: (status: ExecutionStatusResponse) => void;
    } = {}
  ): Promise<ExecutionStatusResponse> {
    const { intervalMs = 2000, timeoutMs = 300000, onProgress } = options;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getExecutionStatus(executionId);

          // Call progress callback if provided
          if (onProgress) {
            onProgress(status);
          }

          // Check if completed
          if (status.status === 'completed') {
            resolve(status);
            return;
          }

          // Check if failed
          if (status.status === 'failed') {
            reject(new Error(status.error_message || 'Execution failed'));
            return;
          }

          // Check timeout
          if (Date.now() - startTime > timeoutMs) {
            reject(new Error('Polling timeout exceeded'));
            return;
          }

          // Continue polling
          setTimeout(poll, intervalMs);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Execute workflow and wait for completion
   * Convenience method that combines execute + poll
   */
  async executeAndWait(
    workflowId: string,
    data?: ExecuteWorkflowRequest,
    options?: {
      intervalMs?: number;
      timeoutMs?: number;
      onProgress?: (status: ExecutionStatusResponse) => void;
    }
  ): Promise<ExecutionStatusResponse> {
    const { execution_id } = await this.executeWorkflow(workflowId, data);
    return this.pollUntilComplete(execution_id, options);
  }
}

/**
 * React Hook Example for Execution
 */
export function useExecutionExample() {
  const client = new ExecutionClient('/api/execute', 'your-auth-token');

  const executeWorkflow = async (workflowId: string, inputs?: Record<string, any>) => {
    try {
      // Start x_execution
      const { execution_id } = await client.executeWorkflow(workflowId, {
        input_variables: inputs,
      });

      console.log('Execution started:', execution_id);

      // Poll for completion
      const result = await client.pollUntilComplete(execution_id, {
        intervalMs: 2000,
        onProgress: (status) => {
          console.log(`Progress: ${status.current_step_index}/${status.total_steps}`);
          console.log('Latest logs:', status.logs.slice(-3));
        },
      });

      console.log('Execution completed:', result);

      // Check for self-healing events
      const healingEvents = await client.getHealingEvents(execution_id);
      if (healingEvents.events.length > 0) {
        console.log('🔧 Self-healing events:', healingEvents.events);
      }

      return result;
    } catch (error) {
      console.error('Execution failed:', error);
      throw error;
    }
  };

  return { executeWorkflow };
}
