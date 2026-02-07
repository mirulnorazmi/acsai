import { useState, useCallback } from 'react';
import { ChatMessage } from '@/types/workflow';
import { Node, Edge, MarkerType } from '@xyflow/react';
import { toast } from 'sonner';

interface GenerateApiResponse {
  workflow_id: string
  name: string
  steps: Array<{
    id: string
    type: string
    name: string
    parameters: Record<string, unknown>
    position?: [number, number]
  }>
  connections?: Record<string, any>
  // Complete n8n workflow structure
  workflow?: {
    name: string
    nodes: Array<{
      id: string
      type: string
      name: string
      parameters: Record<string, unknown>
      position: [number, number]
      typeVersion?: number
      webhookId?: string
      credentials?: Record<string, any>
    }>
    connections: Record<string, any>
    settings: Record<string, any>
  }
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
        body: JSON.stringify({ 
          prompt: content,
          currentWorkflow: currentWorkflow ? (() => {
            // Build connections object using Map to avoid TS strict mode issues
            type ConnectionValue = { main: Array<Array<{ node: string; type: string; index: number }>> };
            const connectionsMap = new Map<string, ConnectionValue>();
            
            currentWorkflow.edges.forEach(edge => {
              const sourceNode = currentWorkflow.nodes.find(n => n.id === edge.source);
              const sourceName = String(sourceNode?.data.label || edge.source);
              if (!connectionsMap.has(sourceName)) {
                connectionsMap.set(sourceName, { main: [[]] });
              }
              const targetNode = currentWorkflow.nodes.find(n => n.id === edge.target);
              const targetName = String(targetNode?.data.label || edge.target);
              connectionsMap.get(sourceName)!.main[0].push({
                node: targetName,
                type: 'main',
                index: 0
              });
            });

            // Convert Map to plain object
            const connections: Record<string, ConnectionValue> = {};
            connectionsMap.forEach((value, key) => {
              connections[key] = value;
            });

            return {
              name: 'Current Workflow',
              nodes: currentWorkflow.nodes.map(node => ({
                id: node.id,
                type: node.data.actionType || node.type,
                name: node.data.label,
                parameters: {},
                position: [node.position.x, node.position.y]
              })),
              connections
            };
          })() : undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.statusText}`);
      }

      const data: GenerateApiResponse = await response.json();

      // Use the complete workflow structure if available, otherwise fall back to steps
      const workflowNodes = data.workflow?.nodes || data.steps;
      const workflowConnections = data.workflow?.connections || data.connections || {};

      // Transform Response to Nodes & Edges
      const newNodes: Node<CustomNodeData>[] = workflowNodes.map((step, index) => ({
        id: step.id,
        type: 'default', // Using default for now as per builder page logic
        position: step.position 
          ? { x: step.position[0], y: step.position[1] } 
          : { x: 250, y: index * 100 + 50 },
        data: {
          label: step.name,
          actionType: step.type,
          status: 'pending',
        },
      }));

      // Transform n8n connections to React Flow edges
      const newEdges: Edge[] = [];
      
      // workflowConnections format:
      // {
      //   "Source Node Name": {
      //     "main": [
      //       [
      //         { "node": "Target Node Name", "type": "main", "index": 0 }
      //       ]
      //     ]
      //   }
      // }
      
      Object.entries(workflowConnections).forEach(([sourceName, outputs]: [string, any]) => {
        // Find the source node by name
        const sourceNode = workflowNodes.find(n => n.name === sourceName);
        if (!sourceNode) return;
        
        // Handle main output connections
        if (outputs.main && Array.isArray(outputs.main)) {
          outputs.main.forEach((outputGroup: any, outputIndex: number) => {
            if (Array.isArray(outputGroup)) {
              outputGroup.forEach((connection: any) => {
                // Find the target node by name
                const targetNode = workflowNodes.find(n => n.name === connection.node);
                if (targetNode) {
                  newEdges.push({
                    id: `e-${sourceNode.id}-${targetNode.id}-${outputIndex}`,
                    source: sourceNode.id,
                    target: targetNode.id,
                    animated: true,
                    markerEnd: {
                      type: MarkerType.ArrowClosed,
                    },
                  });
                }
              });
            }
          });
        }
      });

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
  }, [currentWorkflow]);

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
