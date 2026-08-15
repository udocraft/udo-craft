import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    const supabase = await createClient();

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        status: 'new',
        source: 'telegram',
        total_amount_cents: leadData.totalAmountCents || 0,
        customer_data: leadData.customerData || {},
        tg_chat_id: leadData.tgChatId || null,
        order_items: leadData.orderItems || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Lead creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Lead submission error:', error);
    return NextResponse.json({ error: 'Failed to submit lead' }, { status: 500 });
  }
}
