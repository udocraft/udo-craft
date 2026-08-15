import { Markup } from 'telegraf';
import { BotContext } from '@/types';
import { getTelegramSettings, getLeadByTgChatId, verifyWebAppData, createLead, linkTelegramToLead, getLeadById } from '@/services';
import { getMiniAppUrl, getStartPayload } from '@/utils/miniapp';

export async function handleStart(ctx: BotContext): Promise<void> {
  const chatId = String(ctx.chat?.id);
  const user = ctx.from;
  const payload = getStartPayload(ctx);

  const settings = await getTelegramSettings();

  let existingLead = await getLeadByTgChatId(chatId);

  if (payload?.lead_id) {
    existingLead = await getLeadById(payload.lead_id);
    if (existingLead && !existingLead.tg_chat_id) {
      await linkTelegramToLead(existingLead.id, chatId, user?.username);
    }
  }

  if (!existingLead && user) {
    existingLead = await createLead({
      status: 'new',
      customer_data: {
        name: `${user.first_name} ${user.last_name || ''}`.trim(),
        email: `${user.id}@tg.user`,
        phone: '',
        source: 'telegram_bot',
        source_details: payload?.source || 'start_command',
      },
      tg_chat_id: chatId,
      tg_username: user.username,
    });
  }

  const miniAppUrl = getMiniAppUrl(payload);
  const welcomeText = `${settings.welcome_message}

${existingLead ? '🎉 Ви вже зареєстровані!' : '🎉 Ласкаво просимо до UDO Craft!'}

Натисніть кнопку нижче, щоб відкрити Mini App та оформити замовлення:`;

  await ctx.reply(welcomeText, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.webApp('🛍 Відкрити Mini App', miniAppUrl)],
      [Markup.button.callback('📞 Зв\'язатися з менеджером', 'contact_manager')],
      [Markup.button.callback('📋 Статус замовлення', 'check_status')],
    ]),
  });
}

export async function handleHelp(ctx: BotContext): Promise<void> {
  const settings = await getTelegramSettings();
  await ctx.reply(
    `${settings.manager_contact}

<b>Доступні команди:</b>
/start — 🚀 Запустити бота та відкрити Mini App
/help — ❓ Ця довідка
/contact — 📞 Зв'язатися з менеджером
/status — 📋 Перевірити статус замовлення`,
    { parse_mode: 'HTML' }
  );
}

export async function handleContact(ctx: BotContext): Promise<void> {
  const settings = await getTelegramSettings();
  await ctx.reply(
    `${settings.manager_contact}

💡 Напишіть ваше повідомлення сюди — ми передамо його менеджеру.`,
    { parse_mode: 'HTML' }
  );
  ctx.session.state = 'manager_chat';
}

export async function handleStatus(ctx: BotContext): Promise<void> {
  const chatId = String(ctx.chat?.id);
  const lead = await getLeadByTgChatId(chatId);

  if (!lead) {
    await ctx.reply('📭 У вас поки немає активних замовлень. Натисніть /start щоб створити нове.');
    return;
  }

  const statusLabels: Record<string, string> = {
    draft: '📝 Чернетка',
    new: '🆕 Нове',
    in_progress: '⚙️ В роботі',
    production: '🏭 Виробництво',
    completed: '✅ Готове',
    archived: '📦 Архів',
  };

  await ctx.reply(
    `📋 <b>Ваше замовлення #${lead.id.slice(0, 8)}</b>\n\n` +
    `Статус: ${statusLabels[lead.status] || lead.status}\n` +
    `Сума: ${(lead.total_amount_cents || 0) / 100} грн\n` +
    `Дата: ${new Date(lead.created_at).toLocaleDateString('uk-UA')}\n\n` +
    `Напишіть /contact якщо маєте питання.`,
    { parse_mode: 'HTML' }
  );

  ctx.session.state = 'manager_chat';
  ctx.session.data = { lead_id: lead.id };
}

export async function handleWebAppData(ctx: BotContext): Promise<void> {
  const webAppData = ctx.message?.web_app_data;
  if (!webAppData) return;

  const verified = await verifyWebAppData(webAppData.data);
  if (!verified) {
    await ctx.reply('❌ Помилка верифікації даних. Спробуйте ще раз.');
    return;
  }

  const chatId = String(ctx.chat?.id);
  const user = verified.user;

  let lead = await getLeadByTgChatId(chatId);
  
  if (!lead) {
    lead = await createLead({
      status: 'new',
      customer_data: {
        name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
        email: `${user?.id || 'unknown'}@tg.user`,
        phone: '',
        source: 'telegram_mini_app',
        source_details: 'web_app_order',
      },
      tg_chat_id: chatId,
      tg_username: user?.username,
    });
  } else if (!lead.tg_chat_id) {
    await linkTelegramToLead(lead.id, chatId, user?.username);
  }

  await ctx.reply('✅ Замовлення отримано! Менеджер зв\'яжеться з вами найближчим часом.');
}

export async function handleCallbackQuery(ctx: BotContext): Promise<void> {
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery || !('data' in callbackQuery)) return;
  
  const data = callbackQuery.data;
  await ctx.answerCbQuery();

  switch (data) {
    case 'contact_manager':
      await handleContact(ctx);
      break;
    case 'check_status':
      await handleStatus(ctx);
      break;
    default:
      break;
  }
}