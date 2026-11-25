-- Print zones: support any number of sides (front, back, neck_inner, sleeve_left, sleeve_right, ...)
-- Not applied automatically. Review, then apply with `supabase db push`.

-- 1. side: enum -> text (data preserved)
ALTER TABLE print_zones ALTER COLUMN side TYPE text USING side::text;

-- 2. new columns
ALTER TABLE print_zones ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE print_zones ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE print_zones ADD COLUMN IF NOT EXISTS width_mm numeric;
ALTER TABLE print_zones ADD COLUMN IF NOT EXISTS height_mm numeric;
ALTER TABLE print_zones ADD COLUMN IF NOT EXISTS print_area_id uuid REFERENCES print_areas(id) ON DELETE SET NULL;

-- 3. one zone per product+side: drop older duplicates first, keep the newest row
DELETE FROM print_zones a
USING print_zones b
WHERE a.product_id = b.product_id
  AND a.side = b.side
  AND (a.created_at, a.id) < (b.created_at, b.id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'print_zones_product_side_key') THEN
    ALTER TABLE print_zones ADD CONSTRAINT print_zones_product_side_key UNIQUE (product_id, side);
  END IF;
END $$;
