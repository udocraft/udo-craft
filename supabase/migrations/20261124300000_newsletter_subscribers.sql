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

-- Staff only. auth.role() = 'authenticated' would include every storefront
-- customer, who could then read all subscriber emails.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Newsletter admin read" ON newsletter_subscribers;
  DROP POLICY IF EXISTS "Newsletter staff read" ON newsletter_subscribers;
  IF to_regprocedure('public.is_staff_member()') IS NOT NULL THEN
    CREATE POLICY "Newsletter staff read" ON newsletter_subscribers
      FOR SELECT TO authenticated USING (public.is_staff_member());
  END IF;
END $$;
-- Inserts go through the service role in /api/newsletter only.
