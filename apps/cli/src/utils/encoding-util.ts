/**
 * Encoding fix utility for strings returned by node-winautomation
 * Uses iconv-lite for robust encoding conversion
 */

import * as iconv from 'iconv-lite'

/**
 * Try to fix garbled Chinese text
 *
 * The issue: Windows UI Automation API returns strings where:
 * - Some Chinese characters are replaced with Greek/Cyrillic letters (e.g., ϵͳ instead of 系统)
 * - These characters have code points > 0xFF, so byte-level decoding fails
 *
 * Solution: Treat the string as possibly misencoded UTF-8 bytes interpreted as Latin-1
 */
export function fixEncoding(str: string | undefined): string | undefined {
  if (!str || str.length === 0) {
    return str
  }

  // If string contains only ASCII, return as-is
  const hasNonASCII = /[^\x00-\x7F]/.test(str)
  if (!hasNonASCII) {
    return str
  }

  // Strategy: Reinterpret string as Latin-1 bytes, then decode as UTF-8
  const fixed = tryLatin1Recode(str)
  if (fixed) {
    return fixed
  }

  return str
}

/**
 * Try to recode string by treating it as Latin-1 bytes
 * then decoding as UTF-8
 */
function tryLatin1Recode(str: string): string | null {
  try {
    // Extract bytes from string (treating each char as a Latin-1 byte)
    const bytes = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i)
      if (code > 0xFF) {
        // Character outside Latin-1 range - can't use this method
        return null
      }
      bytes[i] = code
    }

    // Decode bytes as UTF-8
    const decoder = new TextDecoder('utf-8')
    const decoded = decoder.decode(bytes)

    // Verify result contains valid Chinese
    if (isValidChinese(decoded)) {
      return decoded
    }

    return null
  } catch {
    return null
  }
}

/**
 * Check if string contains valid Chinese characters
 */
function isValidChinese(str: string): boolean {
  // CJK Unified Ideographs range
  const hasChinese = /[\u4E00-\u9FFF\u3400-\u4DBF]/u.test(str)
  if (!hasChinese) {
    return false
  }

  // Check for too many control characters
  const controlChars = (str.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g) || []).length
  if (controlChars > str.length * 0.2) {
    return false
  }

  return true
}

/**
 * Sanitize string by removing invalid characters
 */
export function sanitizeString(str: string | undefined): string | undefined {
  if (!str) {
    return str
  }

  let result = str
  result = result.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')

  return result
}
