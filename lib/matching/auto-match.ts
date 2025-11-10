/**
 * Automatic matching functions for count items and ERP items
 */

interface CountItem {
  id: string
  product_name: string | null
  quantity: number
  quantity_unit: string
}

interface ERPItem {
  id: string
  product_code: string
  product_name: string
  stock_qty: number
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = []

  for (let i = 0; i <= m; i++) {
    dp[i] = [i]
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        )
      }
    }
  }

  return dp[m][n]
}

/**
 * Calculate similarity score between 0 and 1
 */
function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1.0

  const distance = levenshteinDistance(
    str1.toLowerCase().trim(),
    str2.toLowerCase().trim()
  )
  return 1 - distance / maxLength
}

/**
 * Normalize product name for better matching
 */
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
}

/**
 * Auto-match count items with ERP items
 */
export function autoMatch(
  countItems: CountItem[],
  erpItems: ERPItem[],
  threshold: number = 0.7
): Array<{
  countItemId: string
  erpItemId: string
  score: number
  difference: number
}> {
  const matches: Array<{
    countItemId: string
    erpItemId: string
    score: number
    difference: number
  }> = []

  for (const countItem of countItems) {
    if (!countItem.product_name) continue

    const normalizedCountName = normalizeProductName(countItem.product_name)
    let bestMatch: {
      erpItem: ERPItem
      score: number
    } | null = null

    for (const erpItem of erpItems) {
      const normalizedERPName = normalizeProductName(erpItem.product_name)
      const score = calculateSimilarity(normalizedCountName, normalizedERPName)

      if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          erpItem,
          score,
        }
      }
    }

    if (bestMatch) {
      matches.push({
        countItemId: countItem.id,
        erpItemId: bestMatch.erpItem.id,
        score: Math.round(bestMatch.score * 100) / 100,
        difference: countItem.quantity - bestMatch.erpItem.stock_qty,
      })
    }
  }

  return matches
}

/**
 * Batch create match results in database
 */
export async function createMatchResults(
  supabase: any,
  matches: Array<{
    countItemId: string
    erpItemId: string
    score: number
    difference: number
  }>
) {
  const matchResults = matches.map((match) => ({
    count_item_id: match.countItemId,
    erp_item_id: match.erpItemId,
    matched_score: match.score,
    difference: match.difference,
    status: 'pending' as const,
  }))

  const { data, error } = await supabase.from('match_results').insert(matchResults).select()

  if (error) {
    throw error
  }

  return data
}

