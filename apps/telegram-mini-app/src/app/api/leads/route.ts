import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { isValid } from '@tma.js/init-data-node';

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

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        status: 'new',
        source: 'telegram',
        total_amount_cents: leadData.totalAmountCents || 0,
        customer_data: leadData.customerData || {},
        tg_chat_id: tgChatId,
      })
      .select()
      .single();

    if (error) {
      console.error('Lead creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orderItems = Array.isArray(leadData.orderItems) ? leadData.orderItems : [];
    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems.map((item: Record<string, unknown>) => ({
          lead_id: lead.id,
          product_id: item.product_id,
          size: String(item.size ?? ''),
          color: String(item.color ?? ''),
          quantity: Number(item.quantity),
          unit_price_cents: Number(item.unit_price_cents),
        })));
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
