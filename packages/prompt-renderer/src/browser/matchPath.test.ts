import { describe, it, expect } from 'vitest'

/**
 * 路由匹配函数 - 支持通配符
 * @param pathname 实际路径
 * @param pattern 路由模式
 * @returns 匹配的参数对象，如果不匹配则返回 null
 */
function matchPath(pathname: string, pattern: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)

  // 检查是否有通配符
  const hasWildcard = patternParts[patternParts.length - 1] === '*'

  if (hasWildcard) {
    // 通配符模式：路径部分数量必须 >= 模式部分数量 - 1
    if (pathParts.length < patternParts.length - 1) {
      return null
    }
  } else {
    // 精确模式：路径部分数量必须完全相等
    if (patternParts.length !== pathParts.length) {
      return null
    }
  }

  const params: Record<string, string> = {}

  // 匹配非通配符部分
  const compareLength = hasWildcard ? patternParts.length - 1 : patternParts.length

  for (let i = 0; i < compareLength; i++) {
    const patternPart = patternParts[i]
    const pathPart = pathParts[i]

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = pathPart
    } else if (patternPart !== pathPart) {
      return null
    }
  }

  // 如果有通配符，将剩余路径部分作为 '*' 参数
  if (hasWildcard && pathParts.length > compareLength) {
    params['*'] = pathParts.slice(compareLength).join('/')
  } else if (hasWildcard) {
    params['*'] = ''
  }

  return params
}

describe('matchPath with wildcard support', () => {
  describe('exact matching (no wildcard)', () => {
    it('should match exact paths', () => {
      const result = matchPath('/tasks', '/tasks')
      expect(result).toEqual({})
    })

    it('should match paths with parameters', () => {
      const result = matchPath('/tasks/123', '/tasks/:id')
      expect(result).toEqual({ id: '123' })
    })

    it('should not match if length differs', () => {
      const result = matchPath('/tasks/123/edit', '/tasks/:id')
      expect(result).toBeNull()
    })

    it('should not match if static parts differ', () => {
      const result = matchPath('/users/123', '/tasks/:id')
      expect(result).toBeNull()
    })
  })

  describe('wildcard matching', () => {
    it('should match plugin route with exact path', () => {
      const result = matchPath('/plugin/foo', '/plugin/:id/*')
      expect(result).toEqual({ id: 'foo', '*': '' })
    })

    it('should match plugin route with sub-path', () => {
      const result = matchPath('/plugin/foo/bar', '/plugin/:id/*')
      expect(result).toEqual({ id: 'foo', '*': 'bar' })
    })

    it('should match plugin route with deep sub-path', () => {
      const result = matchPath('/plugin/foo/bar/baz/qux', '/plugin/:id/*')
      expect(result).toEqual({ id: 'foo', '*': 'bar/baz/qux' })
    })

    it('should not match if path is shorter than required', () => {
      const result = matchPath('/plugin', '/plugin/:id/*')
      expect(result).toBeNull()
    })

    it('should match wildcard at root', () => {
      const result = matchPath('/anything/here', '/*')
      expect(result).toEqual({ '*': 'anything/here' })
    })

    it('should match empty wildcard', () => {
      const result = matchPath('/', '/*')
      expect(result).toEqual({ '*': '' })
    })
  })

  describe('edge cases', () => {
    it('should handle empty paths', () => {
      const result = matchPath('/', '/')
      expect(result).toEqual({})
    })

    it('should handle multiple parameters', () => {
      const result = matchPath('/users/123/posts/456', '/users/:userId/posts/:postId')
      expect(result).toEqual({ userId: '123', postId: '456' })
    })

    it('should handle parameters with wildcard', () => {
      const result = matchPath('/api/v1/users/123/data', '/api/:version/users/:id/*')
      expect(result).toEqual({ version: 'v1', id: '123', '*': 'data' })
    })
  })
})
