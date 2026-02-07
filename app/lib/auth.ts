import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Extract user ID from Authorization header
 * Verifies JWT with Supabase Auth
 */
export async function extractUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  if (!token) {
    return null;
  }

  // Verify token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (user) {
    return user.id;
  }

  // Fallback for development/testing: Return a valid UUID if verification fails
  // unique-id-uuid-format: 8-4-4-4-12 hex digits
  if (process.env.NODE_ENV === 'development') {
    console.warn('Auth verification failed. Using fallback UUID for development.');
    // A specific UUID that is syntactically valid
    return '00000000-0000-0000-0000-000000000000';
  }

  return null;
}

/**
 * Mock semantic search for available tools
 * In production, this would query a vector database or tool registry
 */
export async function semanticSearchTools(prompt: string): Promise<string[]> {
  // Mock implementation - returns common tools
  // TODO: Implement real semantic search using embeddings
  
  const allTools = [
    'slack_invite',
    'email_send',
    'http_request',
    'database_query',
    'file_upload',
    'webhook_trigger',
    'data_transform',
    'conditional_branch',
    'loop_iterator',
    'delay_timer',
  ];

  // Simple keyword matching for demo purposes
  const lowerPrompt = prompt.toLowerCase();
  
  const relevantTools = allTools.filter(tool => {
    if (lowerPrompt.includes('slack') && tool.includes('slack')) return true;
    if (lowerPrompt.includes('email') && tool.includes('email')) return true;
    if (lowerPrompt.includes('http') && tool.includes('http')) return true;
    if (lowerPrompt.includes('database') && tool.includes('database')) return true;
    if (lowerPrompt.includes('webhook') && tool.includes('webhook')) return true;
    return false;
  });

  // Return relevant tools or default set
  return relevantTools.length > 0 
    ? relevantTools 
    : ['slack_invite', 'email_send', 'http_request'];
}

/**
 * Rate limiting check (mock implementation)
 * In production, use Redis or similar
 */
export async function checkRateLimit(userId: string): Promise<boolean> {
  // TODO: Implement real rate limiting
  // For now, always allow
  return true;
}
