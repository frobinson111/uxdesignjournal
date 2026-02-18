-- Lead Capture Popup Schema
-- Add popup configuration and lead collection tables

-- 1. Popup Configs Table
CREATE TABLE IF NOT EXISTS popup_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  image_url TEXT,
  image_caption VARCHAR(500),
  pdf_url TEXT NOT NULL,
  pdf_title VARCHAR(500) NOT NULL,
  button_text VARCHAR(100) DEFAULT 'Get Download Link',
  delay_seconds INTEGER DEFAULT 10,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_popup_configs_active ON popup_configs(active);

-- 2. Popup Leads Table
CREATE TABLE IF NOT EXISTS popup_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  popup_config_id UUID REFERENCES popup_configs(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_popup_leads_email ON popup_leads(email);
CREATE INDEX IF NOT EXISTS idx_popup_leads_popup_config_id ON popup_leads(popup_config_id);
CREATE INDEX IF NOT EXISTS idx_popup_leads_created_at ON popup_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_popup_leads_status ON popup_leads(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_popup_configs_updated_at ON popup_configs;
CREATE TRIGGER update_popup_configs_updated_at BEFORE UPDATE ON popup_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_popup_leads_updated_at ON popup_leads;
CREATE TRIGGER update_popup_leads_updated_at BEFORE UPDATE ON popup_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed a default popup config
INSERT INTO popup_configs (
  name,
  title,
  description,
  image_url,
  image_caption,
  pdf_url,
  pdf_title,
  button_text,
  delay_seconds,
  active
) VALUES (
  'UX Design Starter Guide',
  'Free UX Design Resources',
  'Download our comprehensive guide to getting started in UX design. Learn the fundamentals, best practices, and career tips from industry experts.',
  'https://placehold.co/600x400/4A5568/FFFFFF/png?text=UX+Guide',
  'Your complete guide to UX design fundamentals',
  'https://example.com/downloads/ux-design-guide.pdf',
  'The Complete UX Design Starter Guide',
  'Send Me the Guide',
  15,
  false
) ON CONFLICT DO NOTHING;

SELECT 'Popup schema created successfully!' as status;
