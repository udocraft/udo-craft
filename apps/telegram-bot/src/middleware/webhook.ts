import { MiddlewareFn } from 'telegraf';
import { BotContext } from '@/types';

export const webhookMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secretToken) {
    return next();
  }

  const update = ctx.update;
  const secretHeader = (update as { secret_token?: string }).secret_token;

  if (secretHeader && secretHeader !== secretToken) {
    console.warn('Invalid webhook secret token');
    return;
  }

  return next();
};