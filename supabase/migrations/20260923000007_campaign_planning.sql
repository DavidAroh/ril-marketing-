ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS objective text NOT NULL DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_audience text NOT NULL DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funnel_stage text NOT NULL DEFAULT 'awareness';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget numeric;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget_currency text NOT NULL DEFAULT 'NGN';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS channels text[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_budget_nonnegative') THEN
    ALTER TABLE campaigns ADD CONSTRAINT campaigns_budget_nonnegative CHECK (budget IS NULL OR budget >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_funnel_stage_valid') THEN
    ALTER TABLE campaigns ADD CONSTRAINT campaigns_funnel_stage_valid CHECK (funnel_stage IN ('awareness', 'engagement', 'lead_capture', 'nurturing', 'conversion', 'retention'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_budget_currency_valid') THEN
    ALTER TABLE campaigns ADD CONSTRAINT campaigns_budget_currency_valid CHECK (budget_currency IN ('NGN', 'USD', 'GBP', 'EUR'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS campaigns_funnel_stage_idx ON campaigns(organization_id, funnel_stage);
