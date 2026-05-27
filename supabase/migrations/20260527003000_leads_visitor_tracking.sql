-- Add visitor_id and session_id to leads table for conversion tracking
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS visitor_id TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_visitor_id ON leads(visitor_id);
CREATE INDEX IF NOT EXISTS idx_leads_session_id ON leads(session_id);
