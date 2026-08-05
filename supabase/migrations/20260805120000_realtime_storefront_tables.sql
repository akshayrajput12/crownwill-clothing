-- Publish catalogue tables to Realtime.
--
-- The storefront subscribes to postgres_changes on these tables so a price, stock,
-- coupon or testimonial edit in admin reaches open shopper tabs without a reload.
-- Without membership in the `supabase_realtime` publication the subscription connects
-- and then simply never receives an event, which looks like a client bug.
--
-- Idempotent: re-running is a no-op.

DO $$
DECLARE
  target TEXT;
BEGIN
  -- Nothing to do if the Supabase realtime publication does not exist (self-hosted
  -- installs without the realtime extension).
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'supabase_realtime publication not found — skipping';
    RETURN;
  END IF;

  FOR target IN
    SELECT unnest(ARRAY[
      'products',
      'product_sizes',
      'coupons',
      'product_coupons',
      'categories',
      'testimonials',
      'reviews'
    ])
  LOOP
    -- Skip tables this deployment does not have, and tables already published.
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = target
    ) THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = target
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target);
  END LOOP;
END
$$;
