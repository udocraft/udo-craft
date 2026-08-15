import { BotContext } from '@/types';
import { getChatState, setChatState, clearChatState, createMessage, getLeadByTgChatId, getTelegramSettings, createLead } from '@/services';

export async function handleTextMessage(ctx: BotContext): Promise<void> {
  const chatId = String(ctx.chat?.id);
  const text = ctx.message?.text?.trim();

  if (!text) return;

  const sessionState = ctx.session.state;

  if (sessionState === 'manager_chat') {
    await handleManagerChat(ctx, chatId, text, ctx.session.data);
    return;
  }

  if (sessionState.startsWith('awaiting_')) {
    await handleLeadCreationFlow(ctx, chatId, text, sessionState, ctx.session.data);
    return;
  }

  if (text.startsWith('/')) {
    return;
  }

  await ctx.reply(
    '🤔 Не зрозумів ваше повідомлення.\n\n' +
    'Використовуйте кнопки нижче або команди:\n' +
    '/start — головне меню\n' +
    '/help — довідка\n' +
    '/contact — зв\'язатися з менеджером\n' +
    '/status — статус замовлення',
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛍 Відкрити каталог', web_app: { url: process.env.NEXT_PUBLIC_MINI_APP_URL || 'https://t.me/udo_craft_bot/app' } }],
          [{ text: '📞 Менеджер', callback_data: 'contact_manager' }],
        ],
      },
    }
  );
}

async function handleManagerChat(ctx: BotContext, chatId: string, text: string, data: Record<string, unknown>): Promise<void> {
  const leadId = data.lead_id as string;

  if (!leadId) {
    const lead = await getLeadByTgChatId(chatId);
    if (!lead) {
      await ctx.reply('❌ Не знайдено вашого замовлення. Напишіть /start');
      await clearChatState(chatId);
      return;
    }
    await setChatState(chatId, 'manager_chat', { lead_id: lead.id });
  }

  await createMessage({
    lead_id: leadId!,
    content: text,
    is_from_client: true,
    channel: 'telegram',
    attachments: [],
  });

  await ctx.reply('✅ Повідомлення надіслано менеджеру. Очікуйте відповідь.');

  await setChatState(chatId, 'idle', {});
}

async function handleLeadCreationFlow(
  ctx: BotContext,
  chatId: string,
  text: string,
  state: string,
  data: Record<string, unknown>
): Promise<void> {
  const steps: Record<string, { next: string; field: string; prompt: string; validate?: (v: string) => boolean }> = {
    awaiting_name: { next: 'awaiting_phone', field: 'name', prompt: '📞 Ваш номер телефону?' },
    awaiting_phone: { next: 'awaiting_email', field: 'phone', prompt: '📧 Ваш email?' },
    awaiting_email: { next: 'awaiting_company', field: 'email', prompt: '🏢 Назва компанії (або "-" якщо приватна особа)?', validate: (v) => v.includes('@') },
    awaiting_company: { next: 'awaiting_topic', field: 'company', prompt: '📋 Тема звернення (коротко)?' },
    awaiting_topic: { next: 'awaiting_message', field: 'topic', prompt: '💬 Детально опишіть ваше запитання або завдання:' },
    awaiting_message: { next: 'idle', field: 'message', prompt: '' },
  };

  const currentStep = steps[state];
  if (!currentStep) {
    await clearChatState(chatId);
    return;
  }

  if (currentStep.validate && !currentStep.validate(text)) {
    await ctx.reply(`❌ Некоректні дані. ${currentStep.prompt}`);
    return;
  }

  const newData = { ...data, [currentStep.field]: text };

  if (currentStep.next === 'idle') {
    await createLeadFromFlow(ctx, chatId, newData);
    await clearChatState(chatId);
  } else {
    await setChatState(chatId, currentStep.next, newData);
    await ctx.reply(currentStep.prompt, { parse_mode: 'HTML' });
  }
}

async function createLeadFromFlow(ctx: BotContext, chatId: string, data: Record<string, unknown>): Promise<void> {
  const lead = await createLead({
    status: 'new',
    customer_data: {
      name: String(data.name || ''),
      email: String(data.email || ''),
      phone: String(data.phone || ''),
      company: data.company ? String(data.company) : undefined,
      topic: String(data.topic || ''),
      source: 'telegram_bot',
      source_details: 'Bot conversation flow',
    },
    tg_chat_id: chatId,
    tg_username: ctx.from?.username,
  });

  if (lead) {
    await createMessage({
      lead_id: lead.id,
      content: String(data.message || 'Заявка через бота'),
      is_from_client: true,
      channel: 'telegram',
      attachments: [],
    });

    const settings = await getTelegramSettings();

    await ctx.reply(
      `✅ <b>Заявку створено!</b> #${lead.id.slice(0, 8)}\n\n` +
      `Менеджер зв'яжеться з вами протягом 15 хвилин.\n\n` +
      settings.manager_contact,
      { parse_mode: 'HTML' }
    );

    await setChatState(chatId, 'manager_chat', { lead_id: lead.id });
  } else {
    await ctx.reply('❌ Помилка створення заявки. Спробуйте ще раз або напишіть /start');
  }
}