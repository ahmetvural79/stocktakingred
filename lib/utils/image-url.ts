/**
 * Normalize image URL
 * Removes double https:// prefix and ensures proper URL format
 */
export function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null

  // Remove any whitespace
  let normalized = url.trim()

  // Remove multiple https:// prefixes (handle cases like https://https://https://...)
  while (normalized.match(/^https:\/\/https:\/\//i)) {
    normalized = normalized.replace(/^https:\/\//i, '')
  }

  // Remove multiple http:// prefixes
  while (normalized.match(/^http:\/\/http:\/\//i)) {
    normalized = normalized.replace(/^http:\/\//i, '')
  }

  // Ensure it starts with https:// (prefer HTTPS)
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`
  }

  // Remove trailing slash (but keep it if it's just the domain)
  if (normalized.length > 0 && normalized.endsWith('/') && normalized.split('/').length > 4) {
    normalized = normalized.replace(/\/$/, '')
  }

  return normalized
}

