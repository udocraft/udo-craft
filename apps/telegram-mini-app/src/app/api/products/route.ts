import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const limit = searchParams.get('limit');

    let query = supabase
      .from('products')
      .select(`
        *,
        product_color_variants (
          id,
          name,
          hex_code,
          images,
          sort_order,
          is_active,
          material:materials (name)
        ),
        print_zones (*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (slug) {
      query = query.eq('slug', slug);
    }
    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    if (slug) {
      const { data, error } = await query.maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ product: data });
    }

    const { data: products, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
