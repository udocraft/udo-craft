import { MiddlewareFn } from 'telegraf';
import { BotContext } from '@/types';
import { getChatState, setChatState, clearChatState } from '@/services';

export const sessionMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const chatId = String(ctx.chat?.id);

  if (!chatId) {
    return next();
  }

  const storedState = await getChatState(chatId);

  ctx.session = {
    state: storedState?.state || 'idle',
    data: (storedState?.data as Record<string, unknown>) || {},
    step: storedState?.data?.step as string | undefined,
  };

  await next();

  if (ctx.session.state === 'idle' && Object.keys(ctx.session.data).length === 0) {
    await clearChatState(chatId);
  } else {
    await setChatState(chatId, ctx.session.state, ctx.session.data);
  }
};