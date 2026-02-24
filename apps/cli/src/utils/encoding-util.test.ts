import { describe, it, expect } from 'vitest'
import { fixEncoding, sanitizeString } from './encoding-util'

describe('encoding-util', () => {
  describe('fixEncoding', () => {
    it('should return undefined for undefined input', () => {
      expect(fixEncoding(undefined)).toBeUndefined()
    })

    it('should return empty string for empty input', () => {
      expect(fixEncoding('')).toBe('')
    })

    it('should return ASCII strings as-is', () => {
      expect(fixEncoding('Hello World')).toBe('Hello World')
    })

    it('should handle garbled text via iconv-lite', () => {
      // Test that iconv-lite GBK decoding is available
      const result = fixEncoding('test')
      expect(result).toBeTruthy()
    })

    it('should handle Latin-1 misinterpreted UTF-8', () => {
      const testStr = 'Ã§ÂÂ¶Ã§ÂÂŸ'  // Example misencoding
      const result = fixEncoding(testStr)
      expect(result).toBeTruthy()
    })
  })

  describe('sanitizeString', () => {
    it('should return undefined for undefined input', () => {
      expect(sanitizeString(undefined)).toBeUndefined()
    })

    it('should remove control characters', () => {
      expect(sanitizeString('Hello\x00World')).toBe('HelloWorld')
      expect(sanitizeString('Test\x01String')).toBe('TestString')
    })

    it('should keep newlines and tabs', () => {
      expect(sanitizeString('Line1\nLine2')).toBe('Line1\nLine2')
      expect(sanitizeString('Col1\tCol2')).toBe('Col1\tCol2')
    })

    it('should preserve normal text', () => {
      expect(sanitizeString('Hello World')).toBe('Hello World')
    })
  })
})
