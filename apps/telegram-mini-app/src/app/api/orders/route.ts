import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValid } from '@tma.js/init-data-node';

export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json();

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

    // Get user from initData
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const chatId = user?.id ? String(user.id) : null;

    if (!chatId) {
      return NextResponse.json({ error: 'Could not identify user' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: orders, error } = await supabase
      .from('leads')
      .select('*')
      .eq('tg_chat_id', chatId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
