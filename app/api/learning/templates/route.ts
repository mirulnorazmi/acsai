import { NextRequest, NextResponse } from 'next/server';
import { supabase, validateSupabaseConfig } from '@/lib/supabase';
import { GetTemplatesSchema } from '@/lib/validations/learning';
import { extractUserId } from '@/lib/auth';

/**
 * GET /api/learning/templates
 * Retrieve successful "Few-Shot" examples for a given category (Gold Standard)
 */
export async function GET(request: NextRequest) {
  try {
    validateSupabaseConfig();

    // 1. Extract and validate user
    const userId = await extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    // 2. Extract and validate query params
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    
    const validation = GetTemplatesSchema.safeParse({ category, limit });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: 'Invalid query parameters',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { category: searchCategory, limit: fetchLimit } = validation.data;

    // 3. Query gold standard workflows
    let query = supabase
      .from('x_workflows')
      .select('id, name, description, steps, is_gold_standard')
      .eq('is_gold_standard', true)
      .eq('is_deleted', false)
      .limit(fetchLimit || 10);

    if (searchCategory) {
      // Simple text search for category in name or description
      query = query.or(`name.ilike.%${searchCategory}%,description.ilike.%${searchCategory}%`);
    }

    const { data: templates, error: fetchError } = await query;

    if (fetchError) {
      console.error('Database error:', fetchError);
      return NextResponse.json(
        {
          error: 'Database Error',
          message: 'Failed to retrieve templates',
        },
        { status: 500 }
      );
    }

    // 4. Return results (or empty if none)
    if (!templates || templates.length === 0) {
      // Optionally return empty list instead of 404 for better UX
      return NextResponse.json({
        templates: [],
        total: 0,
      });
    }

    // 5. Format response
    // Get average rating for each (optional enhancement, but for now just return templates)
    
    return NextResponse.json({
      templates: templates,
      total: templates.length,
    });
  } catch (error) {
    console.error('Error retrieving templates:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while retrieving templates',
      },
      { status: 500 }
    );
  }
}
