import { NextRequest, NextResponse } from 'next/server';
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
      return NextResponse.json({ error: 'Invalid initData' }, { status: 401 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Auth validation error:', error);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
