/**
 * Bulk product import — the spreadsheet contract.
 *
 * Everything in here is pure (no imports, no network) so the same parsing runs in the
 * admin preview and in `scripts/checks.ts`. The template the admin downloads is
 * generated from `TEMPLATE_COLUMNS`, so the sheet and the parser can never drift apart.
 */

export interface TemplateColumn {
  /** Field on the parsed row. */
  key: keyof ImportedProduct;
  /** Header text written into the sheet. */
  header: string;
  required?: boolean;
  help: string;
  example: string;
}

export interface SizeEntry {
  size: string;
  stock: number;
}

export interface ImportedProduct {
  name: string;
  category: string;
  sku: string;
  price: number;
  originalPrice: number | null;
  stock: number;
  sizes: SizeEntry[];
  description: string;
  images: string[];
  weight: string;
  care: string;
  fabric: string;
  fit: string;
  colour: string;
  pattern: string;
  sleeve: string;
  neck: string;
  occasion: string;
  origin: string;
  bestseller: boolean;
  newArrival: boolean;
  active: boolean;
}

/**
 * The sheet's columns, in order. Add a field here and it appears in the template, the
 * instructions tab and the parser at once.
 */
export const TEMPLATE_COLUMNS: TemplateColumn[] = [
  {
    key: 'name',
    header: 'Product Name',
    required: true,
    help: 'Shown on the product card and product page.',
    example: 'Heavyweight Cotton Tee',
  },
  {
    key: 'category',
    header: 'Category',
    required: true,
    help: 'Any category name. If it does not exist yet it is created automatically.',
    example: 'T-Shirts',
  },
  {
    key: 'sku',
    header: 'SKU',
    help: 'Your product code. Re-importing the same SKU updates that product instead of duplicating it. Leave blank and one is generated.',
    example: 'CV-TEE-001',
  },
  {
    key: 'price',
    header: 'Selling Price',
    required: true,
    help: 'What the customer pays, in rupees. Numbers only.',
    example: '1299',
  },
  {
    key: 'originalPrice',
    header: 'MRP',
    help: 'Original price. Shown struck through with the discount percentage. Leave blank for no discount.',
    example: '1999',
  },
  {
    key: 'stock',
    header: 'Stock',
    help: 'Total units. If you fill Sizes with counts, this is calculated from them instead.',
    example: '30',
  },
  {
    key: 'sizes',
    header: 'Sizes',
    help: 'Either "S:10, M:15, L:5" for per-size stock, or "S, M, L" to split the Stock column evenly. Leave blank for one-size products.',
    example: 'S:10, M:15, L:5',
  },
  {
    key: 'description',
    header: 'Description',
    help: 'Full product description shown on the product page.',
    example: '240 GSM combed cotton, garment dyed, relaxed fit.',
  },
  {
    key: 'images',
    header: 'Image URLs',
    help: 'Direct image links separated by commas. The first one is the main image; the second shows on hover.',
    example: 'https://example.com/front.jpg, https://example.com/back.jpg',
  },
  {
    key: 'weight',
    header: 'Weight',
    help: 'Optional, e.g. 240 GSM or 350 g.',
    example: '240 GSM',
  },
  {
    key: 'care',
    header: 'Care Instructions',
    help: 'Washing and care guidance.',
    example: 'Machine wash cold, do not bleach',
  },
  {
    key: 'fabric',
    header: 'Fabric',
    help: 'Listed under Product Specifications.',
    example: '100% Cotton',
  },
  {
    key: 'fit',
    header: 'Fit',
    help: 'Listed under Product Specifications.',
    example: 'Relaxed Fit',
  },
  {
    key: 'colour',
    header: 'Colour',
    help: 'Listed under Product Specifications.',
    example: 'Off White',
  },
  {
    key: 'pattern',
    header: 'Pattern',
    help: 'Listed under Product Specifications, e.g. Solid, Printed, Striped.',
    example: 'Cutwork',
  },
  {
    key: 'sleeve',
    header: 'Sleeve',
    help: 'Listed under Product Specifications, e.g. Half Sleeve, Full Sleeve.',
    example: 'Half Sleeve',
  },
  {
    key: 'neck',
    header: 'Collar / Neck',
    help: 'Listed under Product Specifications, e.g. Cuban Collar, Round Neck.',
    example: 'Cuban Collar',
  },
  {
    key: 'occasion',
    header: 'Occasion',
    help: 'Listed under Product Specifications, e.g. Casual Wear, Resort Wear.',
    example: 'Casual Wear',
  },
  {
    key: 'origin',
    header: 'Country of Origin',
    help: 'Listed under Product Specifications.',
    example: 'India',
  },
  {
    key: 'bestseller',
    header: 'Bestseller',
    help: 'Yes or No. Yes shows the Bestseller badge and lists it on the home page rail.',
    example: 'No',
  },
  {
    key: 'newArrival',
    header: 'New Arrival',
    help: 'Yes or No. Yes shows the "New in" badge.',
    example: 'Yes',
  },
  {
    key: 'active',
    header: 'Active',
    help: 'Yes or No. No keeps the product hidden from the storefront. Defaults to Yes.',
    example: 'Yes',
  },
];

/* ------------------------------------------------------------------ parsing ---- */

const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).trim();

/** Header matching ignores case, spaces and punctuation, so "MRP " and "mrp" both land. */
export function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const HEADER_LOOKUP = new Map<string, TemplateColumn>(
  TEMPLATE_COLUMNS.map((column) => [normaliseHeader(column.header), column])
);

/** Extra spellings we accept, so a hand-made sheet still imports. */
const HEADER_ALIASES: Record<string, keyof ImportedProduct> = {
  title: 'name',
  productname: 'name',
  product: 'name',
  categoryname: 'category',
  price: 'price',
  sellingprice: 'price',
  saleprice: 'price',
  mrp: 'originalPrice',
  originalprice: 'originalPrice',
  compareatprice: 'originalPrice',
  stock: 'stock',
  quantity: 'stock',
  stockquantity: 'stock',
  size: 'sizes',
  images: 'images',
  imageurl: 'images',
  imageurls: 'images',
  photo: 'images',
  photos: 'images',
  care: 'care',
  careinstructions: 'care',
  material: 'fabric',
  colour: 'colour',
  color: 'colour',
  collar: 'neck',
  neck: 'neck',
  collarneck: 'neck',
  sleevelength: 'sleeve',
  countryoforigin: 'origin',
  isactive: 'active',
  published: 'active',
  isbestseller: 'bestseller',
  newarrival: 'newArrival',
  isnew: 'newArrival',
};

/** Maps a sheet header to a field, or null when the column is not ours. */
export function matchColumn(header: string): keyof ImportedProduct | null {
  const key = normaliseHeader(header);
  return HEADER_LOOKUP.get(key)?.key ?? HEADER_ALIASES[key] ?? null;
}

/** "Yes"/"true"/"1"/"y" → true. Blank → undefined so a default can apply. */
export function parseBoolean(value: unknown): boolean | undefined {
  const raw = text(value).toLowerCase();
  if (!raw) return undefined;
  if (['yes', 'y', 'true', '1', 'active', 'live'].includes(raw)) return true;
  if (['no', 'n', 'false', '0', 'inactive', 'draft'].includes(raw)) return false;
  return undefined;
}

/** Tolerates "₹1,299", "1299.00" and Excel's numeric cells. Returns null when unusable. */
export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = text(value).replace(/[₹,\s]/g, '');
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Splits on commas, newlines, semicolons and pipes. */
export function parseList(value: unknown): string[] {
  return text(value)
    .split(/[,;\n|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Spreads `total` over `count` buckets, remainder to the earliest ones. */
export function distributeStock(total: number, count: number): number[] {
  if (count <= 0) return [];
  const safeTotal = Math.max(0, Math.floor(total));
  const base = Math.floor(safeTotal / count);
  const remainder = safeTotal % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

/**
 * "S:10, M:15" → per-size stock. "S, M, L" → the row's total split evenly, so the units
 * the admin typed in the Stock column are the units that end up in the catalogue.
 */
export function parseSizeSpec(value: unknown, totalStock = 0): SizeEntry[] {
  const parts = parseList(value);
  if (parts.length === 0) return [];

  const withCounts = parts
    .map((part) => {
      const [rawSize, rawStock] = part.split(':');
      return { size: rawSize.trim().toUpperCase(), stock: rawStock === undefined ? null : parseNumber(rawStock) };
    })
    .filter((entry) => entry.size.length > 0);

  if (withCounts.length === 0) return [];

  const anyExplicit = withCounts.some((entry) => entry.stock !== null);
  if (anyExplicit) {
    return withCounts.map((entry) => ({ size: entry.size, stock: Math.max(0, Math.floor(entry.stock ?? 0)) }));
  }

  const spread = distributeStock(totalStock, withCounts.length);
  return withCounts.map((entry, index) => ({ size: entry.size, stock: spread[index] }));
}

export interface ParsedRow {
  /** 1-based row number as it appears in Excel (header is row 1). */
  rowNumber: number;
  product: ImportedProduct;
  errors: string[];
  warnings: string[];
}

/** Reads one sheet row (already keyed by header) into a product, collecting problems. */
export function parseRow(raw: Record<string, unknown>, rowNumber: number): ParsedRow {
  const cell: Partial<Record<keyof ImportedProduct, unknown>> = {};
  for (const [header, value] of Object.entries(raw)) {
    const key = matchColumn(header);
    if (key && cell[key] === undefined) cell[key] = value;
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  const name = text(cell.name);
  if (!name) errors.push('Product Name is required');

  const category = text(cell.category);
  if (!category) errors.push('Category is required');

  const price = parseNumber(cell.price);
  if (price === null) errors.push('Selling Price is required and must be a number');
  else if (price < 0) errors.push('Selling Price cannot be negative');

  const originalPrice = parseNumber(cell.originalPrice);
  if (originalPrice !== null && price !== null && originalPrice < price) {
    warnings.push('MRP is below the selling price, so no discount will show');
  }

  const stockValue = parseNumber(cell.stock);
  const sizes = parseSizeSpec(cell.sizes, stockValue ?? 0);
  // Per-size counts are the source of truth; the Stock column is only a fallback.
  const stock = sizes.length > 0 ? sizes.reduce((sum, entry) => sum + entry.stock, 0) : Math.max(0, stockValue ?? 0);

  if (sizes.length > 0 && stockValue !== null && stock !== stockValue) {
    warnings.push(`Stock set to ${stock} from the per-size counts`);
  }
  if (sizes.length === 0 && stock === 0) {
    warnings.push('No stock — this product will show as sold out');
  }

  const images = parseList(cell.images);
  if (images.length === 0) warnings.push('No images — a placeholder will be shown');

  return {
    rowNumber,
    errors,
    warnings,
    product: {
      name,
      category,
      sku: text(cell.sku),
      price: price ?? 0,
      originalPrice,
      stock,
      sizes,
      description: text(cell.description),
      images,
      weight: text(cell.weight),
      care: text(cell.care),
      fabric: text(cell.fabric),
      fit: text(cell.fit),
      colour: text(cell.colour),
      pattern: text(cell.pattern),
      sleeve: text(cell.sleeve),
      neck: text(cell.neck),
      occasion: text(cell.occasion),
      origin: text(cell.origin),
      bestseller: parseBoolean(cell.bestseller) ?? false,
      newArrival: parseBoolean(cell.newArrival) ?? false,
      active: parseBoolean(cell.active) ?? true,
    },
  };
}

export interface ParsedSheet {
  rows: ParsedRow[];
  /** Every distinct category named in the sheet, in first-seen order. */
  categories: string[];
  validCount: number;
  errorCount: number;
}

/** Parses the whole sheet and flags duplicate SKUs within it. */
export function parseSheet(rawRows: Array<Record<string, unknown>>): ParsedSheet {
  const rows = rawRows
    // Excel hands back trailing blank rows; drop anything with no content at all.
    .map((raw, index) => ({ raw, rowNumber: index + 2 }))
    .filter(({ raw }) => Object.values(raw).some((value) => text(value).length > 0))
    .map(({ raw, rowNumber }) => parseRow(raw, rowNumber));

  const seenSkus = new Map<string, number>();
  for (const row of rows) {
    const sku = row.product.sku.toUpperCase();
    if (!sku) continue;
    const firstSeen = seenSkus.get(sku);
    if (firstSeen) row.errors.push(`Duplicate SKU — already used on row ${firstSeen}`);
    else seenSkus.set(sku, row.rowNumber);
  }

  const categories: string[] = [];
  for (const row of rows) {
    const category = row.product.category;
    if (category && !categories.some((existing) => existing.toLowerCase() === category.toLowerCase())) {
      categories.push(category);
    }
  }

  const errorCount = rows.filter((row) => row.errors.length > 0).length;
  return { rows, categories, validCount: rows.length - errorCount, errorCount };
}

/** Specification pairs for the product page, skipping blanks. */
export function specsOf(product: ImportedProduct): Record<string, string> {
  const specs: Record<string, string> = {};
  if (product.fabric) specs.fabric = product.fabric;
  if (product.fit) specs.fit = product.fit;
  if (product.colour) specs.colour = product.colour;
  if (product.pattern) specs.pattern = product.pattern;
  if (product.sleeve) specs.sleeve = product.sleeve;
  if (product.neck) specs.collar = product.neck;
  if (product.occasion) specs.occasion = product.occasion;
  if (product.origin) specs.origin = product.origin;
  return specs;
}

/**
 * SKU for rows that left it blank: category initials + a slug of the name, so it stays
 * readable in the URL (the storefront routes on SKU) and stable across re-imports.
 */
export function generateSku(product: ImportedProduct, existing: Set<string>): string {
  const prefix = product.category
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 3) || 'CV';

  const slug = product.name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);

  const base = `${prefix}-${slug}` || 'CV-ITEM';
  let candidate = base;
  let counter = 2;
  while (existing.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  existing.add(candidate);
  return candidate;
}
