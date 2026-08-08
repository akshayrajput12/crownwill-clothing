import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  XCircle, Loader2, Layers, PackageCheck, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isTableMissing } from '@/lib/productSizes';
import {
  TEMPLATE_COLUMNS,
  ParsedSheet,
  generateSku,
  parseSheet,
  specsOf,
} from '@/lib/productImport';
import { formatPrice } from '@/utils/currency';

const TEMPLATE_FILE = 'crownveil-products-template.xlsx';
const SHEET_NAME = 'Products';
const BATCH_SIZE = 100;

interface ImportSummary {
  created: number;
  updated: number;
  categoriesCreated: string[];
  failed: Array<{ row: number; name: string; message: string }>;
}

/** Splits a list into chunks so one giant statement never hits a payload limit. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Bulk product import.
 *
 * The admin downloads a template generated from `TEMPLATE_COLUMNS`, fills it in Excel,
 * uploads it back, reviews a row-by-row preview and commits. Categories named in the
 * sheet that do not exist yet are created as part of the import, so a brand-new store
 * can be set up from one file.
 */
const ProductImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const validRows = useMemo(
    () => (parsed?.rows ?? []).filter((row) => row.errors.length === 0),
    [parsed]
  );

  /* ------------------------------------------------------------- template ---- */

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1 — the one they fill in: headers plus a worked example to copy.
    const headers = TEMPLATE_COLUMNS.map((column) => column.header);
    const example = TEMPLATE_COLUMNS.map((column) => column.example);
    const blankRow = TEMPLATE_COLUMNS.map(() => '');
    const sheet = XLSX.utils.aoa_to_sheet([headers, example, ...Array.from({ length: 20 }, () => blankRow)]);
    sheet['!cols'] = TEMPLATE_COLUMNS.map((column) => ({
      wch: Math.max(column.header.length + 4, Math.min(column.example.length + 4, 42)),
    }));
    sheet['!freeze'] = { xSplit: '0', ySplit: '1' };
    XLSX.utils.book_append_sheet(workbook, sheet, SHEET_NAME);

    // Sheet 2 — what each column means, so nobody has to guess.
    const guide = XLSX.utils.aoa_to_sheet([
      ['Column', 'Required', 'What to put in it', 'Example'],
      ...TEMPLATE_COLUMNS.map((column) => [
        column.header,
        column.required ? 'Yes' : 'Optional',
        column.help,
        column.example,
      ]),
      [],
      ['Notes', '', '', ''],
      ['', '', 'Fill one product per row on the "Products" tab. Delete the example row before uploading, or leave it — you can review every row before anything is saved.', ''],
      ['', '', 'A category that does not exist yet is created automatically when you import.', ''],
      ['', '', 'Re-uploading a sheet with the same SKUs updates those products instead of creating duplicates.', ''],
    ]);
    guide['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 90 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, guide, 'How to fill this in');

    XLSX.writeFile(workbook, TEMPLATE_FILE);
  };

  /* ---------------------------------------------------------------- upload ---- */

  const readFile = async (file: File) => {
    setFileName(file.name);
    setSummary(null);
    setParseError(null);
    setParsed(null);

    try {
      const workbook = XLSX.read(await file.arrayBuffer());
      // Prefer the sheet from our template; fall back to the first one for hand-made files.
      const sheetName = workbook.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : workbook.SheetNames[0];
      if (!sheetName) throw new Error('That file has no sheets in it.');

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
        defval: '',
      });
      if (rawRows.length === 0) throw new Error('That sheet has no rows below the header.');

      const result = parseSheet(rawRows);
      if (result.rows.length === 0) throw new Error('No filled-in rows found.');
      setParsed(result);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Could not read that file.');
    }
  };

  const reset = () => {
    setFileName(null);
    setParsed(null);
    setParseError(null);
    setSummary(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ---------------------------------------------------------------- import ---- */

  const runImport = async () => {
    if (!parsed || validRows.length === 0) return;

    setImporting(true);
    setProgress(5);
    const failed: ImportSummary['failed'] = [];

    try {
      /* 1. Categories — create the ones the sheet names but the store does not have. */
      const { data: existingCategories, error: categoryError } = await supabase
        .from('categories')
        .select('id,name');
      if (categoryError) throw categoryError;

      const categoryByName = new Map<string, string>(
        (existingCategories ?? []).map((category) => [category.name.trim().toLowerCase(), category.id])
      );

      const missing = parsed.categories.filter((name) => !categoryByName.has(name.toLowerCase()));
      if (missing.length > 0) {
        const { data: inserted, error } = await supabase
          .from('categories')
          .insert(missing.map((name) => ({ name, is_active: true })))
          .select('id,name');
        if (error) throw error;
        for (const category of inserted ?? []) {
          categoryByName.set(category.name.trim().toLowerCase(), category.id);
        }
      }
      setProgress(20);

      /* 2. Match rows to products that already exist, by SKU. */
      const sheetSkus = validRows.map((row) => row.product.sku).filter(Boolean);
      const existingBySku = new Map<string, string>();
      if (sheetSkus.length > 0) {
        for (const batch of chunk(sheetSkus, 200)) {
          const { data, error } = await supabase.from('products').select('id,sku').in('sku', batch);
          if (error) throw error;
          for (const product of data ?? []) {
            if (product.sku) existingBySku.set(product.sku.toUpperCase(), product.id);
          }
        }
      }

      // SKUs already taken, so generated ones never collide with the live catalogue.
      const { data: allSkus } = await supabase.from('products').select('sku');
      const takenSkus = new Set<string>((allSkus ?? []).map((row) => (row.sku ?? '').toUpperCase()).filter(Boolean));

      const toRow = (product: (typeof validRows)[number]['product'], sku: string) => ({
        name: product.name,
        sku,
        category_id: categoryByName.get(product.category.toLowerCase()) ?? null,
        description: product.description || null,
        price: product.price,
        original_price: product.originalPrice,
        stock_quantity: product.stock,
        images: product.images.length > 0 ? product.images : null,
        weight: product.weight || null,
        storage_instructions: product.care || null,
        nutritional_info: specsOf(product),
        is_bestseller: product.bestseller,
        new_arrival: product.newArrival,
        is_active: product.active,
        updated_at: new Date().toISOString(),
      });

      const inserts: Array<{ row: (typeof validRows)[number]; payload: ReturnType<typeof toRow> }> = [];
      const updates: Array<{ row: (typeof validRows)[number]; id: string; payload: ReturnType<typeof toRow> }> = [];

      for (const row of validRows) {
        const sku = row.product.sku
          ? row.product.sku.toUpperCase()
          : generateSku(row.product, takenSkus);
        const existingId = existingBySku.get(sku);
        const payload = toRow(row.product, sku);
        if (existingId) updates.push({ row, id: existingId, payload });
        else inserts.push({ row, payload });
      }
      setProgress(35);

      /* 3. Write products. Inserts batch; updates go one by one so a single bad row
            cannot take the rest of the sheet down with it. */
      const sizeRows: Array<{ product_id: string; size: string; stock_quantity: number; sort_order: number }> = [];
      const touchedProductIds: string[] = [];
      let created = 0;

      for (const batch of chunk(inserts, BATCH_SIZE)) {
        const { data, error } = await supabase
          .from('products')
          .insert(batch.map((item) => item.payload))
          .select('id,sku');

        if (error) {
          for (const item of batch) {
            failed.push({ row: item.row.rowNumber, name: item.row.product.name, message: error.message });
          }
          continue;
        }

        const idBySku = new Map((data ?? []).map((product) => [(product.sku ?? '').toUpperCase(), product.id]));
        for (const item of batch) {
          const id = idBySku.get(item.payload.sku.toUpperCase());
          if (!id) continue;
          created += 1;
          touchedProductIds.push(id);
          item.row.product.sizes.forEach((entry, index) => {
            sizeRows.push({ product_id: id, size: entry.size, stock_quantity: entry.stock, sort_order: index });
          });
        }
      }
      setProgress(60);

      let updated = 0;
      for (const item of updates) {
        const { error } = await supabase.from('products').update(item.payload).eq('id', item.id);
        if (error) {
          failed.push({ row: item.row.rowNumber, name: item.row.product.name, message: error.message });
          continue;
        }
        updated += 1;
        touchedProductIds.push(item.id);
        item.row.product.sizes.forEach((entry, index) => {
          sizeRows.push({ product_id: item.id, size: entry.size, stock_quantity: entry.stock, sort_order: index });
        });
      }
      setProgress(80);

      /* 4. Size grids: clear what these products had, then write the sheet's rows. Two
            statements for the whole import rather than two per product. */
      if (touchedProductIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_sizes')
          .delete()
          .in('product_id', touchedProductIds);

        if (deleteError && !isTableMissing(deleteError)) throw deleteError;

        if (!deleteError && sizeRows.length > 0) {
          for (const batch of chunk(sizeRows, BATCH_SIZE * 3)) {
            const { error } = await supabase
              .from('product_sizes')
              .upsert(batch, { onConflict: 'product_id,size' });
            if (error) throw error;
          }
        }
      }

      setProgress(100);
      setSummary({ created, updated, categoriesCreated: missing, failed });

      toast({
        title: 'Import finished',
        description: `${created} added, ${updated} updated${failed.length ? `, ${failed.length} failed` : ''}.`,
        variant: failed.length ? 'destructive' : undefined,
      });
    } catch (error) {
      console.error('Bulk import failed:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Something went wrong. Nothing further was saved.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  /* ------------------------------------------------------------------- UI ---- */

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/products')} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Import products from Excel</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add your whole catalogue in one go. Categories are created for you.
            </p>
          </div>
        </div>

        <Button onClick={downloadTemplate} variant="outline" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Download template
        </Button>
      </div>

      {/* Step 1 — template */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-black text-white text-xs flex items-center justify-center flex-shrink-0">1</span>
            Download the template and fill it in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            One product per row. Only the columns marked required have to be filled — everything else
            can stay blank. The file has a second tab explaining each column.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {TEMPLATE_COLUMNS.map((column) => (
              <div key={column.header} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium">{column.header}</span>
                  {column.required ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Optional</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{column.help}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-black text-white text-xs flex items-center justify-center flex-shrink-0">2</span>
            Upload your filled-in sheet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) readFile(file);
            }}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging ? 'border-brand-black bg-brand-cream/40' : 'border-muted-foreground/25'
            }`}
          >
            <FileSpreadsheet className="h-9 w-9 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              {fileName ?? 'Drop your .xlsx file here'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              .xlsx, .xls or .csv — nothing is saved until you review and confirm
            </p>

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                <Upload className="h-4 w-4 mr-2" />
                Choose file
              </Button>
              {fileName && (
                <Button variant="ghost" onClick={reset} disabled={importing}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) readFile(file);
              }}
            />
          </div>

          {parseError && (
            <p className="mt-4 text-sm text-destructive flex items-center gap-2">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {parseError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 3 — review + import */}
      {parsed && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-black text-white text-xs flex items-center justify-center flex-shrink-0">3</span>
              Review and import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Summary chips */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold">{parsed.validCount}</p>
                <p className="text-xs text-muted-foreground">Ready to import</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className={`text-2xl font-semibold ${parsed.errorCount ? 'text-destructive' : ''}`}>
                  {parsed.errorCount}
                </p>
                <p className="text-xs text-muted-foreground">Rows with errors</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold">{parsed.categories.length}</p>
                <p className="text-xs text-muted-foreground">Categories in sheet</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold">
                  {validRows.reduce((sum, row) => sum + row.product.sizes.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Size variants</p>
              </div>
            </div>

            {parsed.errorCount > 0 && (
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                Rows with errors are skipped. Fix them in Excel and upload again — the rest still import.
              </p>
            )}

            {/* Row preview. Horizontal scroll keeps this usable on a phone. */}
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium w-14">Row</th>
                    <th className="p-3 font-medium">Product</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Price</th>
                    <th className="p-3 font-medium">Sizes</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((row) => (
                    <tr key={row.rowNumber} className="border-t align-top">
                      <td className="p-3 text-muted-foreground">{row.rowNumber}</td>
                      <td className="p-3">
                        <p className="font-medium">{row.product.name || <span className="text-destructive">Missing name</span>}</p>
                        {row.product.sku && (
                          <p className="text-xs text-muted-foreground">{row.product.sku}</p>
                        )}
                      </td>
                      <td className="p-3">{row.product.category || '—'}</td>
                      <td className="p-3 whitespace-nowrap">
                        {formatPrice(row.product.price)}
                        {row.product.originalPrice ? (
                          <span className="text-xs text-muted-foreground line-through ml-1.5">
                            {formatPrice(row.product.originalPrice)}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3 text-xs">
                        {row.product.sizes.length > 0
                          ? row.product.sizes.map((size) => `${size.size} (${size.stock})`).join(', ')
                          : `One size · ${row.product.stock} in stock`}
                      </td>
                      <td className="p-3">
                        {row.errors.length > 0 ? (
                          <div className="space-y-1">
                            {row.errors.map((error) => (
                              <p key={error} className="text-xs text-destructive flex items-start gap-1">
                                <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                {error}
                              </p>
                            ))}
                          </div>
                        ) : row.warnings.length > 0 ? (
                          <div className="space-y-1">
                            {row.warnings.map((warning) => (
                              <p key={warning} className="text-xs text-amber-600 flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                {warning}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importing && <Progress value={progress} className="h-2" />}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={runImport}
                disabled={importing || validRows.length === 0}
                className="w-full sm:w-auto"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</>
                ) : (
                  <><PackageCheck className="h-4 w-4 mr-2" /> Import {validRows.length} product{validRows.length === 1 ? '' : 's'}</>
                )}
              </Button>
              <Button variant="outline" onClick={reset} disabled={importing} className="w-full sm:w-auto">
                Start over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Import complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold">{summary.created}</p>
                <p className="text-xs text-muted-foreground">Products added</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold">{summary.updated}</p>
                <p className="text-xs text-muted-foreground">Products updated</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-semibold">{summary.categoriesCreated.length}</p>
                <p className="text-xs text-muted-foreground">Categories created</p>
              </div>
            </div>

            {summary.categoriesCreated.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                {summary.categoriesCreated.map((name) => (
                  <Badge key={name} variant="secondary">{name}</Badge>
                ))}
              </div>
            )}

            {summary.failed.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                <p className="text-sm font-medium text-destructive">
                  {summary.failed.length} row{summary.failed.length === 1 ? '' : 's'} could not be saved
                </p>
                {summary.failed.map((failure) => (
                  <p key={`${failure.row}-${failure.message}`} className="text-xs text-muted-foreground">
                    Row {failure.row} ({failure.name}): {failure.message}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => navigate('/admin/products')} className="w-full sm:w-auto">
                View products
              </Button>
              <Button variant="outline" onClick={reset} className="w-full sm:w-auto">
                Import another file
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductImport;
