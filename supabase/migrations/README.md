# Supabase Migrations

This directory contains SQL migration files for the U:DO Craft database.
Files are named following the Supabase CLI convention: `YYYYMMDDHHMMSS_description.sql`.

## Applying Migrations

### Prerequisites

Install the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npm install -g supabase
```

Log in and link the project:

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

### Push all pending migrations

```bash
supabase db push
```

### Run a specific migration manually

```bash
psql "$DATABASE_URL" -f supabase/migrations/20240101000000_rls_policies.sql
```

### Check migration status

```bash
supabase migration list
```

## Migration Files

| File | Description |
|---|---|
| `20240101000000_rls_policies.sql` | RLS policies for `leads`, `order_items`, `products`, `messages`, `categories`, `materials`, `print_zones`, `print_type_pricing` |
| `20260417_cms_content.sql` | CMS content table |
| `20260417_cms_published.sql` | CMS published state |
| `20260418_product_images_v2.sql` | Product images v2 schema |
| `20260427000000_user_ai_quota.sql` | User AI quota tracking |
| `20260520000000_erp_core.sql` | ERP core (materials, recipes, production orders) |
| `20260520002000_erp_material_types.sql` | ERP material types and attributes |
| `20260520004000_erp_goods_flow.sql` | ERP goods flow (warehouses, receipts, transfers) |
| `20260523000000_customizer_shares.sql` | Customizer configuration sharing |
| `20260526000000_product_marketing_meta.sql` | Product marketing metadata |
| `20260527000000_admin_authz.sql` | Admin authorization foundation |
| `20260527001000_size_chart_image_url.sql` | Size chart image URLs |
| `20260527002000_order_items_price_fields.sql` | Order items price fields |
| `20260527003000_leads_visitor_tracking.sql` | Lead visitor tracking (visitor_id, session_id) |

## RLS Policy Summary

| Table | anon SELECT | authenticated SELECT | INSERT | UPDATE / DELETE |
|---|---|---|---|---|
| `leads` | ✗ | own leads only (by email) | ✓ (anon + auth) | service role only |
| `order_items` | ✗ | own lead's items only | ✓ (anon + auth) | service role only |
| `products` | ✓ | ✓ | service role only | service role only |
| `messages` | ✗ | own lead's messages only | ✓ (anon + auth) | service role only |
| `categories` | ✓ | ✓ | service role only | service role only |
| `materials` | ✓ | ✓ | service role only | service role only |
| `print_zones` | ✓ | ✓ | service role only | service role only |
| `print_type_pricing` | ✓ | ✓ | service role only | service role only |

> **Note:** The Supabase service role key bypasses all RLS policies by default.
> Admin operations in `apps/admin` use the service role key and are therefore unrestricted.
