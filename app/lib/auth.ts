import { NextRequest } from 'next/server';

/**
 * Extract user ID from Authorization header
 * For production, integrate with Supabase Auth
 */
export function extractUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  // TODO: Implement proper JWT verification with Supabase Auth
  // For now, we'll use a mock implementation
  // In production, use: supabase.auth.getUser(token)
  
  if (!token) {
    return null;
  }

  // Mock: Extract user ID from token (replace with real JWT verification)
  // For development, you can use a test UUID
  return 'mock-user-id-' + token.substring(0, 8);
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
