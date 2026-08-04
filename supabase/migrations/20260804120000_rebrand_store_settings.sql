-- Rebrand the live store settings to Crownveil (the storefront footer, contact page,
-- invoices and SEO tags all read these rows).
UPDATE public.settings SET value = to_jsonb(v.value), updated_at = now()
FROM (VALUES
  ('store_name', 'crownveil'),
  ('store_description', 'Elevated menswear essentials — polos, shirts and tailored layers made for everyday wear.'),
  ('store_email', 'hello@crownveil.com'),
  ('store_logo', 'https://crownveil.com/logo.png'),
  ('site_title', 'crownveil — Modern Menswear'),
  ('site_description', 'Shop Crownveil menswear: premium polos, printed shirts and elevated everyday essentials.'),
  ('site_keywords', 'menswear, polo t-shirts, printed shirts, premium clothing, modern essentials, crownveil')
) AS v(key, value)
WHERE settings.key = v.key;
