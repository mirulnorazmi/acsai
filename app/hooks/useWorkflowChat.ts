import { useState, useCallback } from 'react';
import { ChatMessage } from '@/types/workflow';
import { Node, Edge } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useWorkflowChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Hi! I'm your AI workflow assistant powered by Gemini. I can help you create automated workflows from plain English descriptions.

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
      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Add the new user message
      conversationHistory.push({
        role: 'user',
        content,
      });

      const { data, error } = await supabase.functions.invoke('generate-workflow', {
        body: { messages: conversationHistory },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        if (data.error.includes('Rate limits')) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (data.error.includes('Payment required')) {
          toast.error('AI credits exhausted. Please add more credits to continue.');
        } else {
          toast.error(data.error);
        }
        throw new Error(data.error);
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'I apologize, but I encountered an issue generating the response. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update workflow if one was generated
      if (data.workflow && data.workflow.nodes && data.workflow.nodes.length > 0) {
        setCurrentWorkflow(data.workflow);
        toast.success('Workflow generated! Review it in the canvas.');
      }
    } catch (error) {
      console.error('Error generating workflow:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearWorkflow = useCallback(() => {
    setCurrentWorkflow(null);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: `👋 Hi! I'm your AI workflow assistant powered by Gemini. I can help you create automated workflows from plain English descriptions.

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
