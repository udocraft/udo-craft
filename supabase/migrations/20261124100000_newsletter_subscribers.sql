-- Newsletter sign-ups from the storefront footer (first-order discount offer).
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  locale TEXT,
  source TEXT NOT NULL DEFAULT 'footer',
  discount_pct INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key
  ON newsletter_subscribers (email); -- route lowercases before insert

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Newsletter admin read" ON newsletter_subscribers;
  CREATE POLICY "Newsletter admin read" ON newsletter_subscribers
    FOR SELECT USING (auth.role() = 'authenticated');
END $$;
-- Inserts go through the service role in /api/newsletter only.
