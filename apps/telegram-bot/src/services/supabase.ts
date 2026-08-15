import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Lead, Message, TgChatState, AppSettingsTelegram, WebAppInitData, StartPayload } from '@/types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseAdmin;
}

export const supabase = getSupabaseAdmin();

export async function getChatState(chatId: string): Promise<TgChatState | null> {
  const { data, error } = await supabase
    .from('tg_chat_states')
    .select('*')
    .eq('chat_id', chatId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching chat state:', error);
    return null;
  }
  return data;
}

export async function setChatState(
  chatId: string,
  state: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase.from('tg_chat_states').upsert({
    chat_id: chatId,
    state,
    data,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Error setting chat state:', error);
  }
}

export async function clearChatState(chatId: string): Promise<void> {
  const { error } = await supabase.from('tg_chat_states').delete().eq('chat_id', chatId);
  if (error) {
    console.error('Error clearing chat state:', error);
  }
}

export async function getLeadByTgChatId(chatId: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('tg_chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching lead by tg_chat_id:', error);
    return null;
  }
  return data;
}

export async function getLeadById(leadId: string): Promise<Lead | null> {
  const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).maybeSingle();

  if (error) {
    console.error('Error fetching lead by id:', error);
    return null;
  }
  return data;
}

export async function createLead(
  leadData: Omit<Lead, 'id' | 'created_at'>
): Promise<Lead | null> {
  const { data, error } = await supabase.from('leads').insert({
    ...leadData,
    total_amount_cents: leadData.total_amount_cents || 0,
  }).select().single();

  if (error) {
    console.error('Error creating lead:', error);
    return null;
  }
  return data;
}

export async function updateLead(
  leadId: string,
  updates: Partial<Lead>
): Promise<Lead | null> {
  const { data, error } = await supabase.from('leads').update(updates).eq('id', leadId).select().single();
  if (error) {
    console.error('Error updating lead:', error);
    return null;
  }
  return data;
}

export async function createMessage(
  messageData: Omit<Message, 'id' | 'created_at'>
): Promise<Message | null> {
  const { data, error } = await supabase.from('messages').insert(messageData).select().single();
  if (error) {
    console.error('Error creating message:', error);
    return null;
  }
  return data;
}

export async function getMessagesByLeadId(leadId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  return data || [];
}

export async function getTelegramSettings(): Promise<AppSettingsTelegram> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'telegram_bot')
    .single();

  if (error || !data) {
    return {
      welcome_message: '👋 Привіт! Я бот UDO Craft — виробництво мерчу та корпоративного одягу.',
      manager_contact: 'Напишіть ваше запитання — менеджер відповість найближчим часом.',
    };
  }
  return data.value as AppSettingsTelegram;
}

export async function verifyWebAppData(initData: string): Promise<WebAppInitData | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN!;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const crypto = await import('crypto');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (hash !== calculatedHash) {
    return null;
  }

  const authDate = parseInt(params.get('auth_date') || '0', 10);
  if (Date.now() / 1000 - authDate > 86400) {
    return null;
  }

  const userParam = params.get('user');
  const user = userParam ? JSON.parse(userParam) : undefined;

  return {
    query_id: params.get('query_id') || undefined,
    user,
    auth_date: authDate,
    hash,
    start_param: params.get('start_param') || undefined,
  };
}

export async function linkTelegramToLead(
  leadId: string,
  tgChatId: string,
  tgUsername?: string
): Promise<void> {
  await supabase
    .from('leads')
    .update({ tg_chat_id: tgChatId, tg_username: tgUsername })
    .eq('id', leadId);
}