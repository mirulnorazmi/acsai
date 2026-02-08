import type { EmbeddingResult } from '@/types/discovery';
import OpenAI from 'openai';

/**
 * Embedding Service
 * Generates vector embeddings using OpenAI for semantic search
 */
const apiKey = process.env.OPENAI_API_KEY || '';

// Only initialize OpenAI on the server side
// Client-side code should call API endpoints instead
const getOpenAIClient = () => {
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
};

const openai = typeof window === 'undefined' ? getOpenAIClient() : null;

/**
 * Validate that OpenAI is properly configured
 * Call this before making API calls
 */
export function validateOpenAIConfig() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment variable. Please set it in your .env.local file');
  }
}

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embedding for a text string
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  validateOpenAIConfig();

  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  if (!openai) {
    throw new Error('OpenAI client not available in this context');
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
      encoding_format: 'float',
    });

    const embedding = response.data[0]?.embedding;

    if (!embedding) {
      throw new Error('No embedding returned from OpenAI');
    }

    // Validate dimensions
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`
      );
    }

    return {
      embedding,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
    };
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<EmbeddingResult[]> {
  validateOpenAIConfig();

  if (!texts || texts.length === 0) {
    throw new Error('Texts array cannot be empty');
  }

  // Filter out empty strings
  const validTexts = texts.filter(t => t && t.trim().length > 0);

  if (validTexts.length === 0) {
    throw new Error('No valid texts provided');
  }
  if (!openai) {
    throw new Error('OpenAI client not available in this context');
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: validTexts.map(t => t.trim()),
      encoding_format: 'float',
    });

    return response.data.map(item => ({
      embedding: item.embedding,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
    }));
  } catch (error) {
    console.error('Batch embedding generation error:', error);
    throw new Error('Failed to generate embeddings in batch');
  }
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns a value between 0 and 1 (1 = identical, 0 = completely different)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return similarity;
}

/**
 * Format embedding for PostgreSQL vector type
 */
export function formatEmbeddingForPostgres(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
