/**
 * Product search.
 *
 * Postgres full-text search over the generated `fts` tsvector column (name +
 * description), which is backed by a GIN index — `ILIKE '%term%'` cannot use an index
 * and scans the whole table. `websearch` parsing lets shoppers type naturally
 * ("linen shirt", "polo -kids").
 *
 * If the column/index migration has not been applied yet, the first failing query
 * flips this module to the LIKE path for the rest of the session.
 */

let ftsAvailable = true;

export function searchIsIndexed() {
  return ftsAvailable;
}

/** The two builder methods this helper needs, so callers keep their own query type. */
interface SearchableQuery {
  textSearch(column: string, query: string, options?: { type?: 'plain' | 'phrase' | 'websearch'; config?: string }): unknown;
  or(filters: string): unknown;
}

/** Attach the search predicate to a products query. */
export function applyProductSearch<T extends SearchableQuery>(query: T, term: string): T {
  const cleaned = term.trim();
  if (!cleaned) return query;
  if (ftsAvailable) {
    return query.textSearch('fts', cleaned, { type: 'websearch', config: 'english' }) as T;
  }
  const safe = cleaned.replace(/[%,()]/g, '');
  return query.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`) as T;
}

function isMissingSearchIndex(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  // 42703 undefined_column, 42883 undefined_function, PGRST100/PGRST204 parse/schema errors
  return (
    error.code === '42703' ||
    error.code === '42883' ||
    error.code === 'PGRST100' ||
    error.code === 'PGRST204' ||
    /\bfts\b|tsquery|tsvector/i.test(error.message ?? '')
  );
}

/**
 * Call with a failed query error: returns true if the failure was the missing search
 * index (and switches to the fallback), so the caller can retry once.
 */
export function noteSearchError(error: { code?: string; message?: string } | null): boolean {
  if (ftsAvailable && isMissingSearchIndex(error)) {
    ftsAvailable = false;
    return true;
  }
  return false;
}
