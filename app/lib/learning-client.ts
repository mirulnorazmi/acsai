/**
 * Learning API Client
 * TypeScript client for workflow export, RLHF feedback, and template retrieval
 */

import type {
  ExportWorkflowRequest,
  ExportWorkflowResponse,
  RecordFeedbackRequest,
  RecordFeedbackResponse,
  GetTemplatesResponse,
  TemplateWorkflow,
} from '@/types/learning';

export class LearningClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string = '/api', token: string) {
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
   * Export a workflow to external platform format
   */
  async exportWorkflow(workflowId: string, platform: 'n8n' | 'zapier'): Promise<ExportWorkflowResponse> {
    const response = await fetch(`${this.baseUrl}/export/${workflowId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ target_platform: platform }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to export workflow');
    }

    return response.json();
  }

  /**
   * Record RLHF feedback for an execution
   */
  async recordFeedback(data: RecordFeedbackRequest): Promise<RecordFeedbackResponse> {
    const response = await fetch(`${this.baseUrl}/learning/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to record feedback');
    }

    return response.json();
  }

  /**
   * Get filtered templates (Gold Standard workflows)
   */
  async getTemplates(category?: string, limit: number = 10): Promise<GetTemplatesResponse> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (limit) params.append('limit', limit.toString());

    const response = await fetch(`${this.baseUrl}/learning/templates?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to retrieve templates');
    }

    return response.json();
  }
}

/**
 * React Hook Example for Learning
 */
export function useLearningExample() {
  const client = new LearningClient('/api', 'your-auth-token');

  const exportToN8N = async (workflowId: string) => {
    try {
      const result = await client.exportWorkflow(workflowId, 'n8n');
      console.log(`Exported workflow: ${result.workflow_name} to ${result.platform}`);
      // Download JSON logic here
      const checkJson = JSON.stringify(result.json_content, null, 2);
      console.log(checkJson);
      return result;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  };

  const submitFeedback = async (executionId: string, rating: number, comment?: string) => {
    try {
      const result = await client.recordFeedback({
        execution_id: executionId,
        rating,
        comment,
      });
      console.log(`Feedback recorded! Gold Standard: ${result.is_gold_standard}`);
      return result;
    } catch (error) {
      console.error('Feedback failed:', error);
      throw error;
    }
  };

  const loadTemplates = async (category?: string) => {
    try {
      const { templates } = await client.getTemplates(category);
      console.log(`Found ${templates.length} templates`);
      return templates;
    } catch (error) {
      console.error('Failed to load templates:', error);
      throw error;
    }
  };

  return {
    exportToN8N,
    submitFeedback,
    loadTemplates,
  };
}
