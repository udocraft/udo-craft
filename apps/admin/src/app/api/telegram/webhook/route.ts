import { timingSafeEqual } from "node:crypto";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function tg(method: string, body: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendMessage(chatId: string, text: string, extra?: object) {
  return tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

async function editMessage(chatId: string, messageId: number, text: string, extra?: object) {
  return tg("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", ...extra });
}

async function sendPhoto(chatId: string, photo: string, caption: string, extra?: object) {
  return tg("sendPhoto", { chat_id: chatId, photo, caption, parse_mode: "HTML", ...extra });
}

async function getChatState(chatId: string): Promise<{ state: string; data: Record<string, unknown> }> {
  const { data } = await db().from("tg_chat_states").select("state, data").eq("chat_id", chatId).maybeSingle();
  return data || { state: "idle", data: {} };
}

async function setChatState(chatId: string, state: string, data: Record<string, unknown> = {}) {
  await db().from("tg_chat_states").upsert(
    { chat_id: chatId, state, data },
    { onConflict: "chat_id" }
  );
}

// ── Menus ─────────────────────────────────────────────────────────────

function mainMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🛍 Каталог товарів", callback_data: "catalog" }],
        [{ text: "📦 Статус замовлення", callback_data: "order_status" }],
        [{ text: "💬 Написати менеджеру", callback_data: "contact_manager" }],
        [{ text: "⚡ Mini App", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://tg.u-do-craft.store"}` }],
      ],
    },
  };
}

async function showMainMenu(chatId: string) {
  await sendMessage(
    chatId,
    `👋 Привіт! Я бот <b>UDO Craft</b> — виробництво мерчу та корпоративного одягу.\n\nОберіть дію:`,
    mainMenu()
  );
  await setChatState(chatId, "idle");
}

// ── Handlers ──────────────────────────────────────────────────────────

async function handleCatalog(chatId: string, page = 0) {
  const pageSize = 5;
  const { data: products, count } = await db()
    .from("products")
    .select("id, name, slug, base_price_cents", { count: "exact", head: false })
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (!products?.length) {
    return sendMessage(chatId, "Наразі немає доступних товарів.");
  }

  const totalPages = Math.ceil((count || 0) / pageSize);
  const keyboard = products.map(p => ([{
    text: `${p.name} — ₴${((p.base_price_cents || 0) / 100).toFixed(0)}`,
    callback_data: `product_${p.slug}`,
  }]));

  const navRow = [];
  if (page > 0) navRow.push({ text: "⬅️ Назад", callback_data: `catalog_page_${page - 1}` });
  if (page < totalPages - 1) navRow.push({ text: "Далі ➡️", callback_data: `catalog_page_${page + 1}` });
  if (navRow.length) keyboard.push(navRow);

  keyboard.push([{ text: "🔙 Головне меню", callback_data: "back_main" }]);

  await sendMessage(
    chatId,
    `🛍 <b>Каталог товарів</b>\nСторінка ${page + 1} з ${totalPages}\n\nОберіть товар:`,
    { reply_markup: { inline_keyboard: keyboard } }
  );
  await setChatState(chatId, "catalog", { page });
}

async function handleProductInfo(chatId: string, slug: string) {
  const { data: product } = await db()
    .from("products")
    .select("name, description, base_price_cents, available_sizes, marketing_meta, images")
    .eq("slug", slug)
    .maybeSingle();

  if (!product) {
    return sendMessage(chatId, "Товар не знайдено.");
  }

  const price = `₴${((product.base_price_cents || 0) / 100).toFixed(0)}`;
  const sizes = product.available_sizes?.join(", ") || "S, M, L, XL";
  const minOrder = product.marketing_meta?.min_order_qty || 10;
  const deliveryNote = product.marketing_meta?.delivery_note || "7–14 днів";

  const text = [
    `<b>${product.name}</b>`,
    ``,
    product.description || "",
    ``,
    `💰 Ціна: ${price}`,
    `📏 Розміри: ${sizes}`,
    `📦 Мін. замовлення: від ${minOrder} шт.`,
    `🚚 Терміни: ${deliveryNote}`,
  ].join("\n");

  await sendPhoto(
    chatId,
    product.images?.front || "https://via.placeholder.com/400",
    text,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛍 Замовити через Mini App", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://tg.u-do-craft.store"}/products/${slug}` }],
          [{ text: "💬 Питати менеджера", callback_data: "contact_manager" }],
          [{ text: "🔙 Назад до каталогу", callback_data: "catalog_back" }],
        ],
      },
    }
  );
}

async function handleOrderStatus(chatId: string) {
  const { data: leads } = await db()
    .from("leads")
    .select("id, status, total_amount_cents, created_at, order_items")
    .eq("tg_chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!leads?.length) {
    return sendMessage(
      chatId,
      "📦 У вас ще немає замовлень через нашого бота.\n\nБажаєте переглянути каталог?",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🛍 Каталог товарів", callback_data: "catalog" }],
            [{ text: "🔙 Головне меню", callback_data: "back_main" }],
          ],
        },
      }
    );
  }

  const statusEmoji: Record<string, string> = {
    draft: "📝", new: "🆕", in_progress: "🔄", production: "🏭", completed: "✅", archived: "📦",
  };
  const statusLabels: Record<string, string> = {
    draft: "Чернетка", new: "Новий", in_progress: "В роботі", production: "У виробництві", completed: "Готово", archived: "Архів",
  };

  const lines = leads.map((l, i) =>
    `${i + 1}. ${statusEmoji[l.status] || "📄"} <b>${statusLabels[l.status] || l.status}</b>\n`
    + `   💰 ${((l.total_amount_cents || 0) / 100).toFixed(0)} грн\n`
    + `   📅 ${new Date(l.created_at).toLocaleDateString("uk-UA")}`
  );

  await sendMessage(
    chatId,
    `📦 <b>Ваші замовлення</b>\n\n${lines.join("\n\n")}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Головне меню", callback_data: "back_main" }],
        ],
      },
    }
  );
}

async function handleContactManager(chatId: string, from: { id: number; first_name?: string; last_name?: string; username?: string }) {
  await sendMessage(
    chatId,
    `✍️ Напишіть ваше запитання або опишіть, що вам потрібно — менеджер відповість найближчим часом.\n\n<i>Ви також можете надіслати фото або файл.</i>`
  );
  await setChatState(chatId, "awaiting_message", { from });
  await upsertLead(chatId, from, "");
}

async function handleCatalogBack(chatId: string) {
  const state = await getChatState(chatId);
  await handleCatalog(chatId, (state.data?.page as number) || 0);
}

// ── Lead management ───────────────────────────────────────────────────

async function upsertLead(
  chatId: string,
  from: { id?: number; first_name?: string; last_name?: string; username?: string } | undefined,
  firstMessage: string
): Promise<{ id: string; isNew: boolean } | null> {
  const supabase = db();
  const name = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || from?.username || "Telegram User";
  const username = from?.username ? `@${from.username}` : null;

  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("tg_chat_id", chatId)
    .maybeSingle();

  if (existing) return { id: existing.id, isNew: false };

  const { data: newLead, error } = await supabase
    .from("leads")
    .insert({
      status: "new",
      source: "telegram",
      tg_chat_id: chatId,
      total_amount_cents: 0,
      customer_data: {
        name,
        email: username
          ? `${username.replace("@", "")}@telegram.placeholder`
          : `tg_${chatId}@telegram.placeholder`,
        phone: null,
        company: null,
        message: firstMessage,
        tg_username: username,
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create lead:", error);
    return null;
  }

  return { id: newLead.id, isNew: true };
}

// ── POST handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedSecret) {
    if (!secret) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const secretBuf = Buffer.from(secret, "utf8");
    const expectedBuf = Buffer.from(expectedSecret, "utf8");
    const maxLen = Math.max(secretBuf.length, expectedBuf.length);
    const a = Buffer.alloc(maxLen); secretBuf.copy(a);
    const b = Buffer.alloc(maxLen); expectedBuf.copy(b);
    if (!timingSafeEqual(a, b)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let update: Record<string, unknown>;
  try { update = await request.json(); }
  catch { return NextResponse.json({ ok: true }); }

  // ── Callback Query ──────────────────────────────────────────────
  if (update.callback_query) {
    const cq = update.callback_query as {
      id: string; data: string;
      from: { id: number; first_name?: string; last_name?: string; username?: string };
      message: { chat: { id: number }; message_id?: number };
    };
    const chatId = String(cq.message.chat.id);
    await tg("answerCallbackQuery", { callback_query_id: cq.id, cache_time: 1 });

    switch (cq.data) {
      case "back_main":
        await showMainMenu(chatId);
        break;
      case "catalog":
      case "catalog_back":
        await handleCatalog(chatId);
        break;
      case "order_status":
        await handleOrderStatus(chatId);
        break;
      case "contact_manager":
        await handleContactManager(chatId, cq.from);
        break;
      default:
        if (cq.data.startsWith("catalog_page_")) {
          const page = parseInt(cq.data.replace("catalog_page_", ""), 10);
          await handleCatalog(chatId, page);
        } else if (cq.data.startsWith("product_")) {
          const slug = cq.data.replace("product_", "");
          await handleProductInfo(chatId, slug);
        } else {
          await sendMessage(chatId, "Невідома команда. Спробуйте ще раз.", mainMenu());
        }
    }

    return NextResponse.json({ ok: true });
  }

  // ── Regular Message ─────────────────────────────────────────────
  const message = update.message as {
    chat: { id: number };
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
    text?: string; caption?: string; photo?: { file_id: string }[];
  } | undefined;

  if (!message) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text = message.text || message.caption || "";
  const from = message.from;

  // /start command
  if (text === "/start" || text.startsWith("/start ")) {
    await showMainMenu(chatId);
    return NextResponse.json({ ok: true });
  }

  // Check conversation state
  const state = await getChatState(chatId);

  // If awaiting message from user (contact manager flow)
  if (state.state === "awaiting_message") {
    // Handle photo attachments
    let attachments: string[] = [];
    if (message.photo?.length) {
      const fileId = message.photo[message.photo.length - 1].file_id;
      const fileInfo = await tg("getFile", { file_id: fileId });
      if ((fileInfo as { result?: { file_path?: string } }).result?.file_path) {
        const token = process.env.TELEGRAM_BOT_TOKEN!;
        attachments = [`https://api.telegram.org/file/bot${token}/${(fileInfo as { result: { file_path: string } }).result.file_path}`];
      }
    }

    const lead = await upsertLead(chatId, from, text);
    if (lead) {
      const { error: msgErr } = await db().from("messages").insert({
        lead_id: lead.id, body: text, sender: "client", channel: "telegram", attachments,
      });
      if (msgErr) console.error("Failed to insert message:", msgErr);
    }

    await sendMessage(
      chatId,
      `✅ Дякуємо! Ваше повідомлення отримано. Менеджер відповість найближчим часом.\n\n<i>Ви можете продовжувати писати — всі повідомлення ми бачимо.</i>`,
      mainMenu()
    );
    await setChatState(chatId, "idle");

    return NextResponse.json({ ok: true });
  }

  // Default: treat any message as a contact attempt
  const lead = await upsertLead(chatId, from, text);
  if (!lead) return NextResponse.json({ ok: true });

  let attachments: string[] = [];
  if (message.photo?.length) {
    const fileId = message.photo[message.photo.length - 1].file_id;
    const fileInfo = await tg("getFile", { file_id: fileId });
    if ((fileInfo as { result?: { file_path?: string } }).result?.file_path) {
      const token = process.env.TELEGRAM_BOT_TOKEN!;
      attachments = [`https://api.telegram.org/file/bot${token}/${(fileInfo as { result: { file_path: string } }).result.file_path}`];
    }
  }

  const { error: msgErr } = await db().from("messages").insert({
    lead_id: lead.id, body: text, sender: "client", channel: "telegram", attachments,
  });
  if (msgErr) console.error("Failed to insert message:", msgErr);

  if (lead.isNew) {
    await sendMessage(
      chatId,
      `✅ Дякуємо! Ваше повідомлення отримано. Менеджер відповість найближчим часом.\n\n<i>Ви можете продовжувати писати — всі повідомлення ми бачимо.</i>`,
      mainMenu()
    );
  }

  return NextResponse.json({ ok: true });
}
