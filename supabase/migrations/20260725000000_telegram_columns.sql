-- Telegram bot integration columns for leads and messages

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS tg_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS tg_username TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_tg_chat_id ON leads(tg_chat_id);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Telegram bot conversation states
CREATE TABLE IF NOT EXISTS tg_chat_states (
  chat_id TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'idle',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tg_chat_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tg_chat_states admin all" ON tg_chat_states
  FOR ALL USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_tg_chat_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tg_chat_states_updated_at ON tg_chat_states;
CREATE TRIGGER update_tg_chat_states_updated_at BEFORE UPDATE ON tg_chat_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- App settings seed for telegram
INSERT INTO app_settings (key, value) VALUES
  ('telegram_bot', '{"welcome_message": "👋 Привіт! Я бот UDO Craft — виробництво мерчу та корпоративного одягу.", "manager_contact": "Напишіть ваше запитання — менеджер відповість найближчим часом."}')
ON CONFLICT (key) DO NOTHING;
