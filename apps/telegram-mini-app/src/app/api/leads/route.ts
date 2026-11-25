import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { isValid } from '@tma.js/init-data-node';

// Mirrors discountPctForQty in packages/shared/src/orders.ts (this app does not
// depend on the shared package). Keep the two in sync.
const DEFAULT_DISCOUNT_GRID = [
  { qty: 10, discount_pct: 5 },
  { qty: 50, discount_pct: 12 },
  { qty: 100, discount_pct: 15 },
];
function discountPctForQty(grid: unknown, quantity: number): number {
  const own = Array.isArray(grid)
    ? grid
        .map((t) => ({ qty: Number(t?.qty), discount_pct: Number(t?.discount_pct) }))
        .filter((t) => t.qty > 0 && t.discount_pct >= 0 && t.discount_pct < 100)
    : [];
  const tiers = (own.length ? own : DEFAULT_DISCOUNT_GRID).sort((a, b) => b.qty - a.qty);
  return tiers.find((t) => quantity >= t.qty)?.discount_pct ?? 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { initData, ...leadData } = body;

    if (!initData) {
      return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const isValidInitData = isValid(initData, botToken);
    if (!isValidInitData) {
      return NextResponse.json({ error: 'Invalid Telegram authentication' }, { status: 401 });
    }

    const tgUser = new URLSearchParams(initData).get('user');
    const tgChatId = tgUser ? String(JSON.parse(tgUser).id) : null;
    if (!tgChatId) {
      return NextResponse.json({ error: 'Could not identify user' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Prices come from the catalogue, never from the client.
    const rawItems: Record<string, unknown>[] = Array.isArray(leadData.orderItems) ? leadData.orderItems : [];
    const productIds = [...new Set(rawItems.map((item) => String(item.product_id ?? '')))].filter(Boolean);
    const { data: products, error: productsError } = productIds.length
      ? await supabase.from('products').select('id, base_price_cents, discount_grid').in('id', productIds)
      : { data: [], error: null };
    if (productsError) {
      console.error('Product price lookup error:', productsError);
      return NextResponse.json({ error: 'Could not verify prices' }, { status: 500 });
    }
    const productById = new Map((products ?? []).map((p) => [String(p.id), p]));
    const orderItems = [];
    for (const item of rawItems) {
      const product = productById.get(String(item.product_id ?? ''));
      const quantity = Number(item.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) {
        return NextResponse.json({ error: 'Invalid order item' }, { status: 400 });
      }
      const unit = Math.round(product.base_price_cents * (1 - discountPctForQty(product.discount_grid, quantity) / 100));
      orderItems.push({
        product_id: product.id,
        size: String(item.size ?? ''),
        color: String(item.color ?? ''),
        quantity,
        unit_price_cents: unit,
        print_cost_cents: 0,
      });
    }
    const totalAmountCents = orderItems.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        status: 'new',
        source: 'telegram',
        total_amount_cents: totalAmountCents,
        customer_data: leadData.customerData || {},
        tg_chat_id: tgChatId,
      })
      .select()
      .single();

    if (error) {
      console.error('Lead creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems.map((item) => ({ ...item, lead_id: lead.id })));
      if (itemsError) {
        console.error('Order items insert error:', itemsError);
        await supabase.from('leads').delete().eq('id', lead.id);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Lead submission error:', error);
    return NextResponse.json({ error: 'Failed to submit lead' }, { status: 500 });
  }
}
