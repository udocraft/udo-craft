import { Telegraf, session } from 'telegraf';
import { BotContext } from '@/types';
import { sessionMiddleware } from '@/middleware/session';
import { webhookMiddleware } from '@/middleware/webhook';
import { handleStart, handleHelp, handleContact, handleStatus, handleWebAppData, handleCallbackQuery } from './commands';
import { handleTextMessage } from './messages';
import { BOT_COMMANDS } from '@/types';

const bot = new Telegraf<BotContext>(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(session({ default: () => ({ state: 'idle', data: {} }) }));
bot.use(sessionMiddleware);
bot.use(webhookMiddleware);

bot.telegram.setMyCommands(BOT_COMMANDS);

bot.command('start', handleStart);
bot.command('help', handleHelp);
bot.command('contact', handleContact);
bot.command('status', handleStatus);

bot.on('message', async (ctx, next) => {
  const msg = ctx.message;
  if (msg && 'web_app_data' in msg) {
    await handleWebAppData(ctx);
    return;
  }
  if (msg && 'text' in msg) {
    await handleTextMessage(ctx);
    return;
  }
  await next();
});

bot.on('callback_query', handleCallbackQuery);

bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
  try {
    ctx.reply('❌ Виникла помилка. Спробуйте пізніше або напишіть /start');
  } catch {
    // ignore
  }
});

export { bot };

export async function handleWebhook(body: unknown): Promise<void> {
  await bot.handleUpdate(body as BotContext['update']);
}

export async function setWebhook(url: string, secretToken?: string): Promise<boolean> {
  try {
    await bot.telegram.setWebhook(url, {
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query', 'chat_member'],
      drop_pending_updates: true,
    });
    console.log('Webhook set successfully:', url);
    return true;
  } catch (error) {
    console.error('Failed to set webhook:', error);
    return false;
  }
}

export async function deleteWebhook(): Promise<boolean> {
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    console.log('Webhook deleted');
    return true;
  } catch (error) {
    console.error('Failed to delete webhook:', error);
    return false;
  }
}