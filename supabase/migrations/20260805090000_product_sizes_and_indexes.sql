-- Per-size inventory + storefront query indexes.
--
-- Sizes used to be stuffed into products.marketing_info->'sizes' (a JSON blob on an
-- unrelated column), which the storefront never read. This normalises them into a
-- pivot table with a foreign key, a uniqueness guarantee per (product, size) and the
-- indexes the PDP/admin lookups need.

CREATE TABLE IF NOT EXISTS public.product_sizes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size           TEXT NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  sku            TEXT,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT product_sizes_unique_size UNIQUE (product_id, size)
);

CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON public.product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_size       ON public.product_sizes(size);
CREATE INDEX IF NOT EXISTS idx_product_sizes_in_stock   ON public.product_sizes(product_id) WHERE stock_quantity > 0;

ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_sizes_select_all" ON public.product_sizes;
CREATE POLICY "product_sizes_select_all" ON public.product_sizes FOR SELECT USING (true);

DROP POLICY IF EXISTS "product_sizes_all_admin" ON public.product_sizes;
CREATE POLICY "product_sizes_all_admin" ON public.product_sizes FOR ALL USING (public.is_admin());

-- Carry over anything already saved under marketing_info->'sizes' so existing
-- products keep their size grid.
INSERT INTO public.product_sizes (product_id, size, stock_quantity, sku, sort_order)
SELECT
  p.id,
  upper(trim(s.value->>'size')),
  COALESCE((s.value->>'stock')::int, (s.value->>'stock_quantity')::int, 0),
  NULLIF(s.value->>'sku', ''),
  s.ordinality - 1
FROM public.products p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(p.marketing_info->'sizes') = 'array'
       THEN p.marketing_info->'sizes' ELSE '[]'::jsonb END
) WITH ORDINALITY AS s(value, ordinality)
WHERE COALESCE(trim(s.value->>'size'), '') <> ''
ON CONFLICT (product_id, size) DO NOTHING;

-- The blob is no longer the source of truth.
UPDATE public.products
SET marketing_info = marketing_info - 'sizes'
WHERE marketing_info ? 'sizes';

-- Product listing / filter indexes (category grid, new drops, price filters, search).
CREATE INDEX IF NOT EXISTS idx_products_active_created  ON public.products(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category_active ON public.products(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_price           ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_bestseller      ON public.products(is_bestseller) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_sku             ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id       ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_categories_active_name   ON public.categories(is_active, name);

-- Full-text search over name + description, so search stops relying on ILIKE '%term%'.
-- A generated column keeps the vector in sync and lets PostgREST filter on it directly
-- (supabase .textSearch('fts', ...)).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_fts ON public.products USING gin (fts);
