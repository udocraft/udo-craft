import { Context } from 'telegraf';
import { Message, Update, User, Chat, CallbackQuery } from 'telegraf/types';

export interface SessionData {
  state: string;
  data: Record<string, unknown>;
  step?: string;
}

export interface BotContext extends Context {
  session: SessionData;
  webhookReplyEnvelope?: {
    secret_token?: string;
  };
}

export interface TgChatState {
  chat_id: string;
  state: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  status: string;
  customer_data: {
    name: string;
    email: string;
    phone: string;
    social_channel?: string;
    company?: string;
    topic?: string;
    source?: string;
    source_details?: string;
    delivery?: string;
    delivery_details?: string;
    deadline?: string;
    comment?: string;
  };
  total_amount_cents?: number;
  visitor_id?: string | null;
  session_id?: string | null;
  tg_chat_id?: string | null;
  tg_username?: string | null;
  created_at: string;
}

export interface AppSettingsTelegram {
  welcome_message: string;
  manager_contact: string;
}

export interface WebAppInitData {
  query_id?: string;
  user?: User;
  receiver?: Chat;
  chat?: Chat;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
}

export interface StartPayload {
  source?: string;
  lead_id?: string;
  product_id?: string;
  variant_id?: string;
}

export interface BotCommand {
  command: string;
  description: string;
}

export const BOT_COMMANDS: BotCommand[] = [
  { command: 'start', description: '🚀 Запустити бота та відкрити Mini App' },
  { command: 'help', description: '❓ Допомога та контакти менеджера' },
  { command: 'contact', description: '📞 Зв\'язатися з менеджером' },
  { command: 'status', description: '📋 Статус вашого замовлення' },
];

export type ChatState =
  | 'idle'
  | 'awaiting_name'
  | 'awaiting_phone'
  | 'awaiting_email'
  | 'awaiting_company'
  | 'awaiting_topic'
  | 'awaiting_message'
  | 'manager_chat';

export type TgMessage = Message;
export type TgUpdate = Update;
export type TgUser = User;
export type TgChat = Chat;
export type TgCallbackQuery = CallbackQuery;