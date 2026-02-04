/**
 * @fileoverview Zod to JSON Schema 转换工具
 * @description 使用 Zod v4 原生 toJSONSchema 方法
 * @version 2.0
 */

import { z } from 'zod'
/**
 * 检查参数是否可选
 */
export function isOptionalParam(zodSchema: z.ZodTypeAny): boolean {
    return zodSchema instanceof z.ZodOptional || zodSchema instanceof z.ZodDefault
}

/**
 * Zod schema 转换为 JSON Schema
 * 使用 Zod v4 原生方法
 */
export function zodToJsonSchema(zodSchema: z.ZodTypeAny): any {
    // Zod v4 原生支持 toJSONSchema
    const schema = zodSchema.toJSONSchema()
    // 移除 $schema 字段以保持向后兼容
    if (schema && typeof schema === 'object' && '$schema' in schema) {
        const { $schema: _$schema, ...rest } = schema
        return rest
    }
    return schema
}
export function zodToParams(params: Record<string, z.ZodTypeAny> = {}): any {
    const properties: Record<string, any> = {}
    const required: string[] = []

    for (const [key, value] of Object.entries(params)) {
        properties[key] = zodToJsonSchema(value)
        if (!isOptionalParam(value)) {
            required.push(key)
        }
    }
    return {
        type: 'object',
        properties,
        required: required
    }
}
/**
 * Zod schema 转换为 JSON Schema（带 description）
 */
export function zodToJsonSchemaWithDescription(zodSchema: z.ZodTypeAny): any {
    const base = zodToJsonSchema(zodSchema)

    // 尝试获取 description
    const meta = zodSchema?.meta?.()
    if (meta?.description) {
        base.description = meta.description
    }

    return base
}
