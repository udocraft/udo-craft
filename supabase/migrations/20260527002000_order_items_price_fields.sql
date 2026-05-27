-- Add unit_price_cents and print_cost_cents to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER,
ADD COLUMN IF NOT EXISTS print_cost_cents INTEGER;
