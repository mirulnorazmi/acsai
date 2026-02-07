import { useState, useCallback } from 'react';
import { ChatMessage } from '@/types/workflow';
import { Node, Edge, MarkerType } from '@xyflow/react';
import { toast } from 'sonner';

interface GenerateApiResponse {
  workflow_id: string
  name: string
  steps: Array<{
    id: string
    action: string
    name: string
    params: Record<string, unknown>
  }>
}

type CustomNodeData = {
  label: string
  actionType: string
  status?: "pending" | "success" | "error"
}

export function useWorkflowChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Hi! I'm your AI workflow assistant powered by Gemini. I can help you create automated x_workflows from plain English descriptions.

Try describing a business process you'd like to automate, such as:
• "Automate employee onboarding"
• "Create an invoice approval workflow"
• "Set up customer support ticket routing"
• "Build a lead nurturing sequence"

What would you like to build today?`,
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get token from localStorage
      const token = localStorage.getItem("auth_token");

      // Use the Next.js API route instead of Supabase Edge Function
      const response = await fetch('/api/orchestrator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ prompt: content }), // Use the latest message as prompt
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.statusText}`);
      }

      const data: GenerateApiResponse = await response.json();

      // Transform Response to Nodes & Edges
      const newNodes: Node<CustomNodeData>[] = data.steps.map((step, index) => ({
        id: step.id,
        type: 'default', // Using default for now as per builder page logic
        position: { x: 250, y: index * 100 + 50 },
        data: {
          label: step.name,
          actionType: step.action,
          status: 'pending',
        },
      }));

      const newEdges: Edge[] = [];
      for (let i = 0; i < data.steps.length - 1; i++) {
        const current = data.steps[i];
        const next = data.steps[i + 1];
        newEdges.push({
          id: `e-${current.id}-${next.id}`,
          source: current.id,
          target: next.id,
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've generated a workflow for "${data.name}". You can see the visual representation on the canvas.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update workflow state
      if (newNodes.length > 0) {
        setCurrentWorkflow({ nodes: newNodes, edges: newEdges });
        toast.success(`Workflow "${data.name}" generated!`);
      }

    } catch (error) {
      console.error('Error generating workflow:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to generate workflow');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearWorkflow = useCallback(() => {
    setCurrentWorkflow(null);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: `👋 Hi! I'm your AI workflow assistant powered by Gemini. I can help you create automated x_workflows from plain English descriptions.

Try describing a business process you'd like to automate, such as:
• "Automate employee onboarding"
• "Create an invoice approval workflow"
• "Set up customer support ticket routing"
• "Build a lead nurturing sequence"

What would you like to build today?`,
      timestamp: new Date(),
    }]);
    setCurrentWorkflow(null);
  }, []);

  return {
    messages,
    isLoading,
    currentWorkflow,
    sendMessage,
    setCurrentWorkflow,
    clearWorkflow,
    resetChat,
  };
}
