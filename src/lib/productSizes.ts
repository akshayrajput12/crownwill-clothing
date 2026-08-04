import { supabase } from '@/integrations/supabase/client';

/**
 * Per-size inventory lives in the `product_sizes` pivot table (migration
 * 20260805090000). Both the admin form and the PDP go through here so the shape is
 * parsed identically on both sides.
 *
 * Until that migration is applied, reads/writes fall back to the legacy
 * `products.marketing_info.sizes` blob so nothing breaks mid-deploy.
 */

export interface SizeVariant {
  size: string;
  stock: number;
  sku: string;
}

export const SIZE_PRESETS = ['S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', 'FREE SIZE'];

/** Presets first (in the order above), then anything custom, alphabetically. */
export function sortSizes<T extends { size: string }>(sizes: T[]): T[] {
  const rank = (s: string) => {
    const i = SIZE_PRESETS.indexOf(s.toUpperCase());
    return i === -1 ? SIZE_PRESETS.length : i;
  };
  return [...sizes].sort((a, b) => rank(a.size) - rank(b.size) || a.size.localeCompare(b.size));
}

/** Normalises either source shape into SizeVariant[]. */
export function parseSizes(rows: unknown): SizeVariant[] {
  if (!Array.isArray(rows)) return [];
  const parsed = (rows as Array<Record<string, unknown>>)
    .map((row) => ({
      size: String(row?.size ?? '').trim().toUpperCase(),
      stock: Number(row?.stock_quantity ?? row?.stock ?? 0) || 0,
      sku: String(row?.sku ?? ''),
    }))
    .filter((row) => row.size.length > 0);
  return sortSizes(parsed);
}

export function isTableMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  // PGRST205: relation not found in the API schema cache; 42P01: undefined_table
  return error.code === 'PGRST205' || error.code === '42P01' || /product_sizes/i.test(error.message ?? '');
}

/** Read the size grid for a product. */
export async function fetchProductSizes(productId: string): Promise<SizeVariant[]> {
  const { data, error } = await supabase
    .from('product_sizes')
    .select('size,stock_quantity,sku')
    .eq('product_id', productId)
    .order('sort_order');

  if (!error) return parseSizes(data);
  if (!isTableMissing(error)) throw error;

  const { data: legacy } = await supabase
    .from('products')
    .select('marketing_info')
    .eq('id', productId)
    .maybeSingle();
  return parseSizes((legacy?.marketing_info as { sizes?: unknown } | null)?.sizes);
}

/**
 * Replace a product's size grid. Deletes rows the admin removed, upserts the rest —
 * one statement each, so it stays a single round trip per operation.
 */
export async function saveProductSizes(productId: string, sizes: SizeVariant[]): Promise<void> {
  const clean = sortSizes(
    sizes
      .map((s) => ({ size: s.size.trim().toUpperCase(), stock: Math.max(0, Number(s.stock) || 0), sku: s.sku?.trim() ?? '' }))
      .filter((s) => s.size.length > 0)
  );

  const keep = clean.map((s) => s.size);
  const deleteQuery = supabase.from('product_sizes').delete().eq('product_id', productId);
  const { error: deleteError } = keep.length
    ? await deleteQuery.not('size', 'in', `(${keep.map((s) => `"${s}"`).join(',')})`)
    : await deleteQuery;

  if (deleteError) {
    if (!isTableMissing(deleteError)) throw deleteError;
    // Pre-migration: keep the legacy blob updated instead.
    const { data: current } = await supabase
      .from('products')
      .select('marketing_info')
      .eq('id', productId)
      .maybeSingle();
    const marketing_info = { ...((current?.marketing_info as Record<string, unknown>) ?? {}), sizes: clean };
    const { error } = await supabase.from('products').update({ marketing_info }).eq('id', productId);
    if (error) throw error;
    return;
  }

  if (clean.length === 0) return;

  const { error: upsertError } = await supabase.from('product_sizes').upsert(
    clean.map((s, index) => ({
      product_id: productId,
      size: s.size,
      stock_quantity: s.stock,
      sku: s.sku || null,
      sort_order: index,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'product_id,size' }
  );
  if (upsertError) throw upsertError;
}

/** Total stock across sizes — what the products.stock_quantity column should reflect. */
export function totalStock(sizes: SizeVariant[]): number {
  return sizes.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
}
