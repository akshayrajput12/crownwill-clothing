import { useEffect, useId, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildOutfit, OutfitCandidate, OutfitPick } from '@/lib/outfit';
import { isCouponLive } from '@/lib/coupons';

/**
 * Storefront read model. Every list the home page and PDP need lives here so it is
 * fetched once per stale window and shared across components instead of each
 * section running its own useEffect fetch on mount.
 *
 * Column lists are explicit (never `select('*')`) so the wire payload stays small.
 */

/**
 * Card payload. Includes `product_sizes` so a grid tile can offer size-accurate quick
 * add — an apparel cart line without a size is not fulfillable.
 */
const CARD_COLUMNS_BASE =
  'id,name,description,price,original_price,images,sku,category_id,stock_quantity,is_bestseller,new_arrival,created_at,categories(name)';
export const CARD_COLUMNS = `${CARD_COLUMNS_BASE},product_sizes(size,stock_quantity)`;

/**
 * `product_sizes` arrives in a migration. Until it is applied the join 400s, so the
 * first failure flips the whole session to the sizeless column list (same approach as
 * `lib/productSearch`) instead of every query paying for a retry.
 */
let sizesJoinAvailable = true;

/** Column list to select for product cards right now. */
export function cardColumns(): string {
  return sizesJoinAvailable ? CARD_COLUMNS : CARD_COLUMNS_BASE;
}

/** True when the failure was the missing join — caller may retry once, sizeless. */
export function noteSizesJoinError(error: { code?: string; message?: string } | null): boolean {
  if (!sizesJoinAvailable || !error) return false;
  const missing =
    error.code === 'PGRST200' ||
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /product_sizes/i.test(error.message ?? '');
  if (missing) sizesJoinAvailable = false;
  return missing;
}

async function selectCards<T>(
  run: (columns: string) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>
): Promise<T[]> {
  const first = await run(cardColumns());
  if (!first.error) return (first.data ?? []) as T[];
  if (!noteSizesJoinError(first.error)) throw first.error;

  const retry = await run(CARD_COLUMNS_BASE);
  if (retry.error) throw retry.error;
  return (retry.data ?? []) as T[];
}

export interface ProductCardRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  images: string[] | null;
  sku: string | null;
  category_id: string | null;
  stock_quantity: number | null;
  is_bestseller: boolean | null;
  new_arrival: boolean | null;
  created_at: string | null;
  categories: { name: string } | null;
  product_sizes?: Array<{ size: string; stock_quantity: number }>;
}

export const queryKeys = {
  categories: ['categories'] as const,
  newDrops: (limit: number) => ['products', 'new-drops', limit] as const,
  combos: ['combos'] as const,
  reviews: (page: number) => ['reviews', page] as const,
  product: (slug?: string) => ['product', slug] as const,
  relatedProducts: (categoryId?: string, excludeId?: string) => ['products', 'related', categoryId, excludeId] as const,
  outfit: (productId?: string) => ['products', 'outfit', productId] as const,
  productCoupons: (productId?: string) => ['coupons', 'product', productId] as const,
  productReviews: (productId?: string) => ['reviews', 'product', productId] as const,
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
    queryFn: () =>
      selectCards<ProductCardRow>((columns) =>
        supabase
          .from('products')
          .select(columns)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(limit)
      ),
  });
}

/**
 * Lower-cased names of every active product, for keyword matching on the client (the
 * curated category tiles). Names only, so the payload stays tiny, and cached for half an
 * hour since it only changes when the catalogue does.
 */
export function useCatalogueKeywords() {
  return useQuery({
    queryKey: ['catalogue-keywords'] as const,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('name')
        .eq('is_active', true)
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((row) => (row.name ?? '').toLowerCase());
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

/** "Similar products": same category, newest first, widening only if the category is thin. */
export function useRelatedProducts(categoryId?: string, excludeId?: string, limit = 8) {
  return useQuery({
    queryKey: queryKeys.relatedProducts(categoryId, excludeId),
    enabled: !!excludeId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const inCategory = await selectCards<ProductCardRow>((columns) => {
        const query = supabase
          .from('products')
          .select(columns)
          .eq('is_active', true)
          .neq('id', excludeId!)
          .order('created_at', { ascending: false })
          .limit(limit);
        return categoryId ? query.eq('category_id', categoryId) : query;
      });
      if (inCategory.length > 0) return inCategory;

      // Nothing else in this category — widen so the rail is never empty.
      return selectCards<ProductCardRow>((columns) =>
        supabase
          .from('products')
          .select(columns)
          .eq('is_active', true)
          .neq('id', excludeId!)
          .order('created_at', { ascending: false })
          .limit(limit)
      );
    },
  });
}

/**
 * Complete-the-outfit rail.
 *
 * Deliberately queries *away* from the anchor's own category — an outfit needs a
 * different wardrobe slot. The pool is capped and the ranking runs client-side in
 * `buildOutfit`, so there is one round trip and the scoring stays testable.
 */
export function useCompleteTheOutfit(anchor?: OutfitCandidate | null, limit = 4) {
  return useQuery({
    queryKey: queryKeys.outfit(anchor?.id),
    enabled: !!anchor?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Array<OutfitPick<ProductCardRow>>> => {
      const pool = await selectCards<ProductCardRow>((columns) => {
        const query = supabase
          .from('products')
          .select(columns)
          .eq('is_active', true)
          .neq('id', anchor!.id)
          .order('is_bestseller', { ascending: false })
          .limit(60);
        // Same category can never complete a look, so do not even fetch it.
        return anchor!.categoryId ? query.neq('category_id', anchor!.categoryId) : query;
      });

      const candidates = pool.map((row) => ({
        ...row,
        categoryId: row.category_id,
        categoryName: row.categories?.name ?? null,
        inStock: (row.stock_quantity ?? 0) > 0 || (row.product_sizes ?? []).some((s) => s.stock_quantity > 0),
        isBestseller: !!row.is_bestseller,
        isNewArrival: !!row.new_arrival,
      }));

      return buildOutfit(anchor!, candidates, limit);
    },
  });
}

/** Bestseller rail. */
export function useBestSellers(limit = 8) {
  return useQuery({
    queryKey: ['products', 'bestsellers', limit] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      selectCards<ProductCardRow>((columns) =>
        supabase
          .from('products')
          .select(columns)
          .eq('is_active', true)
          .eq('is_bestseller', true)
          .order('created_at', { ascending: false })
          .limit(limit)
      ),
  });
}

export interface StoreCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string | null;
  discount_value: number | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  used_count: number | null;
  is_active: boolean | null;
}

const COUPON_COLUMNS =
  'id,code,description,discount_type,discount_value,min_order_amount,max_discount_amount,valid_from,valid_until,usage_limit,used_count,is_active';

/** Live coupons — active, in-window and not exhausted. */
export function useCoupons(limit = 4) {
  return useQuery({
    queryKey: ['coupons', limit] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StoreCoupon[]> => {
      const { data, error } = await supabase
        .from('coupons')
        .select(COUPON_COLUMNS)
        .eq('is_active', true)
        .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(limit * 3);
      if (error) throw error;
      // Usage limits are not expressible as a PostgREST filter (column vs column), so
      // the exhausted ones are dropped here.
      return ((data ?? []) as unknown as StoreCoupon[]).filter((c) => isCouponLive(c)).slice(0, limit);
    },
  });
}

/**
 * Offers to show on a product page: codes the admin assigned to this product
 * (product_coupons) plus store-wide codes, deduped. Replaces the hardcoded
 * "Get Flat 5% OFF / BYNG5" card the PDP used to print for every product.
 */
export function useProductCoupons(productId?: string, limit = 3) {
  return useQuery({
    queryKey: queryKeys.productCoupons(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StoreCoupon[]> => {
      const [assigned, storewide] = await Promise.all([
        supabase
          .from('product_coupons')
          .select(`coupons(${COUPON_COLUMNS})`)
          .eq('product_id', productId!),
        supabase
          .from('coupons')
          .select(COUPON_COLUMNS)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(limit * 3),
      ]);

      const fromAssignment = ((assigned.data ?? []) as Array<{ coupons: StoreCoupon | null }>)
        .map((row) => row.coupons)
        .filter((coupon): coupon is StoreCoupon => !!coupon);

      const seen = new Set<string>();
      // Product-specific codes first: they are the more relevant offer.
      return [...fromAssignment, ...((storewide.data ?? []) as unknown as StoreCoupon[])]
        .filter((coupon) => isCouponLive(coupon))
        .filter((coupon) => (seen.has(coupon.id) ? false : seen.add(coupon.id)))
        .slice(0, limit);
    },
  });
}

export interface ProductReview {
  id: string;
  rating: number;
  comment: string | null;
  name: string;
  createdAt: string | null;
}

/** Real reviews for the PDP — the page used to load ratings only and show no words. */
export function useProductReviews(productId?: string, limit = 6) {
  return useQuery({
    queryKey: queryKeys.productReviews(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ProductReview[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id,rating,comment,created_at,profiles(full_name)')
        .eq('product_id', productId!)
        .not('comment', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;

      type Row = {
        id: string;
        rating: number;
        comment: string | null;
        created_at: string | null;
        profiles: { full_name: string | null } | null;
      };

      return ((data ?? []) as unknown as Row[]).map((row) => ({
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        name: row.profiles?.full_name || 'Verified Buyer',
        createdAt: row.created_at,
      }));
    },
  });
}

/** Tables whose changes should be reflected in the storefront without a reload. */
const REALTIME_TABLES = ['products', 'product_sizes', 'coupons', 'product_coupons', 'categories', 'testimonials', 'reviews'] as const;

/**
 * Live storefront. Postgres changes on catalogue tables invalidate the cached queries,
 * so a price edit, a stock change or a new coupon in admin shows up on open tabs
 * instead of waiting for the stale window.
 *
 * Bursts are collapsed into one invalidation — a bulk admin save fires a change per row.
 *
 * ponytail: invalidates by table→key prefix, not per-row patching. Move to targeted
 * `setQueryData` only if refetch volume ever becomes a problem.
 */
export function useStorefrontRealtime(onChange?: () => void) {
  const queryClient = useQueryClient();
  // Kept in a ref so an inline callback does not re-subscribe the websocket every render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // One topic per mount: the app root and the listing page both subscribe, and reusing a
  // topic name would have them fight over the same channel.
  const topic = useId();

  useEffect(() => {
    let debounce: number | undefined;

    const channel = supabase.channel(`storefront-changes:${topic}`);

    for (const table of REALTIME_TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        window.clearTimeout(debounce);
        debounce = window.setTimeout(() => {
          queryClient.invalidateQueries();
          onChangeRef.current?.();
        }, 400);
      });
    }

    channel.subscribe();

    return () => {
      window.clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [queryClient, topic]);
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
