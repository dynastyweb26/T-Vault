-- Job reference/facility fields and carrier EIN for invoices

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pickup_facility text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS delivery_facility text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rate_con_number text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS bol_number text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fuel_surcharge numeric;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS accessorial_charges numeric;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS commodity text;

ALTER TABLE users ADD COLUMN IF NOT EXISTS ein text;
