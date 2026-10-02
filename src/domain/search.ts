export const MAX_SEARCH_LENGTH = 80;

/**
 * Reduces user search text to letters, digits, spaces, hyphens, apostrophes and periods.
 * Used by every ProductRepository so adapters behave identically and no filter syntax can be injected.
 * Returns null when nothing searchable remains.
 */
export function normalizeSearchTerm(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s'.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}
