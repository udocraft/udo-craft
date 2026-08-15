import 'dotenv/config';
import { Telegraf } from 'telegraf';
import express from 'express';
import { bot, setWebhook, deleteWebhook, handleWebhook } from '@/bot';
import { setupBotCommands } from '@/bot';

const PORT = parseInt(process.env.PORT || '3001', 10);
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set');
  process.exit(1);
}

async function start(): Promise<void> {
  console.log('🤖 Starting Telegram Bot...');
  
  await setupBotCommands();
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && WEBHOOK_URL) {
    console.log('Starting in webhook mode...');
    const success = await setWebhook(WEBHOOK_URL, WEBHOOK_SECRET);
    if (!success) {
      console.error('Failed to set webhook, exiting');
      process.exit(1);
    }

    const app = express();
    
    app.use(express.json());
    
    app.post('/api/telegram/webhook', async (req, res) => {
      try {
        await handleWebhook(req.body);
        res.sendStatus(200);
      } catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
      }
    });

    app.get('/health', (_, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.listen(PORT, () => {
      console.log(`🌐 Webhook server listening on port ${PORT}`);
      console.log(`📡 Webhook endpoint: ${WEBHOOK_URL}`);
    });
  } else {
    console.log('Starting in polling mode (development)...');
    await deleteWebhook();
    await bot.launch();
    console.log('🚀 Telegram bot started in polling mode');

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  }
}

start().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});