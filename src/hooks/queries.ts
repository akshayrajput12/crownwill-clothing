import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Storefront read model. Every list the home page and PDP need lives here so it is
 * fetched once per stale window and shared across components instead of each
 * section running its own useEffect fetch on mount.
 *
 * Column lists are explicit (never `select('*')`) so the wire payload stays small.
 */

const CARD_COLUMNS = 'id,name,price,original_price,images,sku,category_id,is_bestseller,new_arrival,created_at';

export const queryKeys = {
  categories: ['categories'] as const,
  newDrops: (limit: number) => ['products', 'new-drops', limit] as const,
  combos: ['combos'] as const,
  reviews: (page: number) => ['reviews', page] as const,
  product: (slug?: string) => ['product', slug] as const,
  relatedProducts: (categoryId?: string, excludeId?: string) => ['products', 'related', categoryId, excludeId] as const,
};

/** Categories drive the navbar, the category grid and the combo rail. Rarely change. */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id,name,description,image_url')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** New Drops rail. `limit` keeps the payload bounded — no full-table loads. */
export function useNewDrops(limit = 12) {
  return useQuery({
    queryKey: queryKeys.newDrops(limit),
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(CARD_COLUMNS)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface Combo {
  categoryId: string;
  name: string;
  image: string | null;
  variantCount: number;
  pickCount: number;
  bundlePrice: number;
}

/**
 * Combos are derived, not a separate table: each active category with at least two
 * products becomes a "pick any N" bundle priced off its cheapest pieces (rounded to
 * ₹99). One query, cached for 5 minutes.
 */
export function useCombos() {
  return useQuery({
    queryKey: queryKeys.combos,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Combo[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('id,price,images,category_id,categories(id,name,image_url)')
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (error) throw error;

      type ComboRow = {
        price: number;
        images: string[] | null;
        categories: { id: string; name: string; image_url: string | null } | null;
      };

      const byCategory = new Map<string, { name: string; image: string | null; prices: number[] }>();
      for (const row of (data ?? []) as unknown as ComboRow[]) {
        const category = row.categories;
        if (!category) continue;
        const entry = byCategory.get(category.id) ?? {
          name: category.name,
          image: category.image_url ?? row.images?.[0] ?? null,
          prices: [],
        };
        entry.prices.push(Number(row.price));
        byCategory.set(category.id, entry);
      }

      return [...byCategory.entries()]
        .filter(([, c]) => c.prices.length >= 2)
        .map(([categoryId, c]) => {
          const pickCount = c.prices.length >= 3 ? 3 : 2;
          const raw = c.prices.slice(0, pickCount).reduce((sum, p) => sum + p, 0) * 0.85;
          return {
            categoryId,
            name: c.name,
            image: c.image,
            variantCount: c.prices.length,
            pickCount,
            // round down to a ...99 price point
            bundlePrice: Math.max(99, Math.round(raw / 100) * 100 - 1),
          };
        });
    },
  });
}

export interface StoreReview {
  id: string;
  rating: number;
  comment: string | null;
  name: string;
  productName: string | null;
  productImage: string | null;
}

const REVIEWS_PER_PAGE = 10;

/** Verified customer reviews, 10 per page. `enabled` lets callers defer until visible. */
export function useReviews(page = 0, enabled = true) {
  return useQuery({
    queryKey: queryKeys.reviews(page),
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StoreReview[]> => {
      const from = page * REVIEWS_PER_PAGE;
      const { data, error } = await supabase
        .from('reviews')
        .select('id,rating,comment,created_at,profiles(full_name),products(name,images)')
        .not('comment', 'is', null)
        .gte('rating', 4)
        .order('created_at', { ascending: false })
        .range(from, from + REVIEWS_PER_PAGE - 1);
      if (error) throw error;

      type ReviewRow = {
        id: string;
        rating: number;
        comment: string | null;
        profiles: { full_name: string | null } | null;
        products: { name: string; images: string[] | null } | null;
      };

      return ((data ?? []) as unknown as ReviewRow[]).map((row) => ({
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        name: row.profiles?.full_name || 'Verified Buyer',
        productName: row.products?.name ?? null,
        productImage: row.products?.images?.[0] ?? null,
      }));
    },
  });
}

export interface ProductDetailResult {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  images: string[] | null;
  sku: string | null;
  category_id: string | null;
  stock_quantity: number | null;
  features: unknown;
  nutritional_info: unknown;
  marketing_info: unknown;
  storage_instructions: string | null;
  weight?: string | null;
  categories: { id: string; name: string } | null;
  product_sizes?: Array<{ size: string; stock_quantity: number; sku: string | null }>;
  reviews?: Array<{ rating: number }>;
}

/**
 * PDP payload in a single round trip: product + its size/inventory rows + review
 * aggregate. `slug` is either the SKU or the id.
 */
export function useProductDetail(slug?: string) {
  return useQuery({
    queryKey: queryKeys.product(slug),
    enabled: !!slug,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const columns =
        'id,name,description,price,original_price,images,sku,category_id,stock_quantity,features,' +
        'nutritional_info,marketing_info,storage_instructions,is_active,' +
        'categories(id,name),product_sizes(size,stock_quantity,sku),reviews(rating)';

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug!);
      const run = (cols: string) =>
        supabase
          .from('products')
          .select(cols)
          .eq('is_active', true)
          .or(isUuid ? `id.eq.${slug},sku.eq.${slug}` : `sku.eq.${slug}`)
          .maybeSingle();

      let { data, error } = await run(columns);
      // product_sizes ships in a migration; fall back so the PDP still renders before it runs.
      if (error) {
        ({ data, error } = await run(columns.replace(',product_sizes(size,stock_quantity,sku)', '')));
      }
      if (error) throw error;
      return data as unknown as ProductDetailResult | null;
    },
  });
}

/** Complementary pieces: same category first, then anything else active. */
export function useRelatedProducts(categoryId?: string, excludeId?: string, limit = 8) {
  return useQuery({
    queryKey: queryKeys.relatedProducts(categoryId, excludeId),
    enabled: !!excludeId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(CARD_COLUMNS)
        .eq('is_active', true)
        .neq('id', excludeId!)
        .limit(limit);
      if (categoryId) query = query.eq('category_id', categoryId);

      const { data, error } = await query;
      if (error) throw error;
      if ((data ?? []).length > 0) return data ?? [];

      // Nothing else in this category — widen so the rails are never empty.
      const { data: fallback } = await supabase
        .from('products')
        .select(CARD_COLUMNS)
        .eq('is_active', true)
        .neq('id', excludeId!)
        .limit(limit);
      return fallback ?? [];
    },
  });
}

/** Bestseller rail. */
export function useBestSellers(limit = 8) {
  return useQuery({
    queryKey: ['products', 'bestsellers', limit] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(CARD_COLUMNS)
        .eq('is_active', true)
        .eq('is_bestseller', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface StoreCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string | null;
  discount_value: number | null;
  min_order_amount: number | null;
  valid_until: string | null;
}

/** Live coupons — active and not yet expired. */
export function useCoupons(limit = 4) {
  return useQuery({
    queryKey: ['coupons', limit] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StoreCoupon[]> => {
      const { data, error } = await supabase
        .from('coupons')
        .select('id,code,description,discount_type,discount_value,min_order_amount,valid_until')
        .eq('is_active', true)
        .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as StoreCoupon[];
    },
  });
}

export interface StoreTestimonial {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  image: string | null;
  text: string;
  rating: number | null;
}

/** Curated testimonials managed in admin. */
export function useTestimonials(limit = 6) {
  return useQuery({
    queryKey: ['testimonials', limit] as const,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<StoreTestimonial[]> => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('id,name,role,company,image_url,text,rating')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role ?? null,
        company: row.company ?? null,
        image: row.image_url ?? null,
        text: row.text,
        rating: row.rating ?? null,
      }));
    },
  });
}
