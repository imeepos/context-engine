/**
 * Enhanced Zod to OpenAPI Schema Converter
 *
 * Compatible with Zod v4
 */

import { z } from 'zod';
import type { OpenAPISchema } from './openapi.types';

/**
 * Get description from Zod schema definition
 */
function getDescription(schema: z.ZodTypeAny): string | undefined {
  return (schema._def as { description?: string })?.description;
}

/**
 * Apply description to schema if present
 */
function applyDescription(result: OpenAPISchema, schema: z.ZodTypeAny): OpenAPISchema {
  const description = getDescription(schema);
  if (description) {
    result.description = description;
  }
  return result;
}

/**
 * Get Zod type name from schema
 */
function getZodTypeName(schema: z.ZodTypeAny): string {
  // Use _zod.typeName or fallback to constructor name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = schema._def as any;
  return def.typeName || schema.constructor.name;
}

/**
 * Convert Zod schema to OpenAPI schema
 */
export const zodToOpenAPI = (schema: z.ZodTypeAny): OpenAPISchema => {
  let result: OpenAPISchema = {};
  const typeName = getZodTypeName(schema);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = schema._def as any;

  // ZodObject - object types
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, OpenAPISchema> = {};
    const required: string[] = [];

    for (const key in shape) {
      const field = shape[key];
      properties[key] = zodToOpenAPI(field);
      if (!field.isOptional()) {
        required.push(key);
      }
    }

    result = { type: 'object', properties };
    if (required.length > 0) {
      result.required = required;
    }
  }

  // ZodString - string types
  else if (schema instanceof z.ZodString) {
    result = { type: 'string' };

    // Extract string checks for validation
    const checks = def.checks || [];
    for (const check of checks) {
      switch (check.kind) {
        case 'min':
          result.minLength = check.value;
          break;
        case 'max':
          result.maxLength = check.value;
          break;
        case 'email':
          result.format = 'email';
          break;
        case 'url':
          result.format = 'uri';
          break;
        case 'uuid':
          result.format = 'uuid';
          break;
        case 'datetime':
          result.format = 'date-time';
          break;
        case 'regex':
          if (check.regex) {
            result.pattern = check.regex.source;
          }
          break;
      }
    }
  }

  // ZodNumber - number types
  else if (schema instanceof z.ZodNumber) {
    result = { type: 'number' };

    // Check for integer
    const checks = def.checks || [];
    for (const check of checks) {
      switch (check.kind) {
        case 'int':
          result.type = 'integer';
          break;
        case 'min':
          if (check.inclusive === false) {
            result.exclusiveMinimum = check.value;
          } else {
            result.minimum = check.value;
          }
          break;
        case 'max':
          if (check.inclusive === false) {
            result.exclusiveMaximum = check.value;
          } else {
            result.maximum = check.value;
          }
          break;
        case 'multipleOf':
          result.multipleOf = check.value;
          break;
      }
    }
  }

  // ZodBoolean
  else if (schema instanceof z.ZodBoolean) {
    result = { type: 'boolean' };
  }

  // ZodDate
  else if (schema instanceof z.ZodDate) {
    result = { type: 'string', format: 'date-time' };
  }

  // ZodArray
  else if (schema instanceof z.ZodArray) {
    const itemSchema = zodToOpenAPI(schema.element as z.ZodTypeAny);
    result = { type: 'array', items: itemSchema };

    // Array length constraints
    if (def.minLength !== undefined) {
      result.minItems = def.minLength.value;
    }
    if (def.maxLength !== undefined) {
      result.maxItems = def.maxLength.value;
    }
  }

  // ZodEnum - string enums
  else if (schema instanceof z.ZodEnum) {
    result = {
      type: 'string',
      enum: schema.options,
    };
  }

  // ZodLiteral - literal values
  else if (schema instanceof z.ZodLiteral) {
    // Zod v4 uses 'values', Zod v3 uses 'value'
    const value = def.value !== undefined ? def.value : def.values;
    const type = typeof value;

    if (type === 'string') {
      result = { type: 'string', const: value };
    } else if (type === 'number') {
      result = { type: Number.isInteger(value as number) ? 'integer' : 'number', const: value };
    } else if (type === 'boolean') {
      result = { type: 'boolean', const: value };
    } else {
      result = { const: value };
    }
  }

  // ZodUnion - union types
  else if (schema instanceof z.ZodUnion) {
    const options = (def.options || []).map((opt: z.ZodTypeAny) => zodToOpenAPI(opt));
    result = { oneOf: options };
  }

  // ZodDiscriminatedUnion - discriminated unions
  else if (typeName === 'ZodDiscriminatedUnion') {
    let opts: z.ZodTypeAny[] = [];
    if (def.options instanceof Map) {
      opts = Array.from(def.options.values());
    } else if (Array.isArray(def.options)) {
      opts = def.options;
    } else if (def.optionsMap instanceof Map) {
      opts = Array.from(def.optionsMap.values());
    }
    result = { oneOf: opts.map(zodToOpenAPI) };
  }

  // ZodIntersection - intersection types
  else if (schema instanceof z.ZodIntersection) {
    const left = zodToOpenAPI(def.left as z.ZodTypeAny);
    const right = zodToOpenAPI(def.right as z.ZodTypeAny);
    result = { allOf: [left, right] };
  }

  // ZodRecord - dictionary/map types
  else if (schema instanceof z.ZodRecord) {
    const valueSchema = zodToOpenAPI(def.valueType as z.ZodTypeAny);
    result = {
      type: 'object',
      additionalProperties: valueSchema,
    };
  }

  // ZodTuple - tuple types
  else if (schema instanceof z.ZodTuple) {
    const items = (def.items || []).map((item: z.ZodTypeAny) => zodToOpenAPI(item));
    result = {
      type: 'array',
      prefixItems: items,
      minItems: items.length,
      maxItems: items.length,
    };
  }

  // ZodOptional - optional wrapper
  else if (schema instanceof z.ZodOptional) {
    result = zodToOpenAPI(schema.unwrap() as z.ZodTypeAny);
  }

  // ZodNullable - nullable wrapper
  else if (schema instanceof z.ZodNullable) {
    const inner = zodToOpenAPI(schema.unwrap() as z.ZodTypeAny);
    result = { ...inner, nullable: true };
  }

  // ZodDefault - default value wrapper
  else if (schema instanceof z.ZodDefault) {
    const innerType = def.innerType || def.type;
    if (innerType) {
      result = zodToOpenAPI(innerType);
    }
    if (typeof def.defaultValue === 'function') {
      result.default = def.defaultValue();
    }
  }

  // ZodEffects - transformed/refined types (check by typeName)
  else if (typeName === 'ZodEffects' || typeName === 'ZodPipeline') {
    const innerSchema = def.schema || def.innerType || def.in;
    if (innerSchema) {
      result = zodToOpenAPI(innerSchema);
    }
  }

  // ZodNull
  else if (schema instanceof z.ZodNull) {
    result = { type: 'null' };
  }

  // ZodUndefined - treated as optional
  else if (schema instanceof z.ZodUndefined) {
    result = {};
  }

  // ZodAny - any type
  else if (schema instanceof z.ZodAny) {
    result = {}; // No constraints
  }

  // ZodUnknown - unknown type
  else if (schema instanceof z.ZodUnknown) {
    result = {}; // No constraints
  }

  // ZodVoid - void type
  else if (schema instanceof z.ZodVoid) {
    result = {};
  }

  // ZodNever - never type
  else if (schema instanceof z.ZodNever) {
    result = { not: {} }; // OpenAPI way to express "never"
  }

  // ZodPromise - unwrap promise
  else if (schema instanceof z.ZodPromise) {
    const innerType = def.type;
    if (innerType && typeof innerType !== 'string') {
      result = zodToOpenAPI(innerType);
    }
  }

  // ZodLazy - lazy evaluation
  else if (schema instanceof z.ZodLazy) {
    if (typeof def.getter === 'function') {
      result = zodToOpenAPI(def.getter());
    }
  }

  // ZodBranded - branded types (check by typeName)
  else if (typeName === 'ZodBranded') {
    const innerType = def.type;
    if (innerType) {
      result = zodToOpenAPI(innerType);
    }
  }

  // ZodNativeEnum - native enums (check by typeName)
  else if (typeName === 'ZodNativeEnum') {
    if (def.values) {
      const enumValues = Object.values(def.values);
      const isNumberEnum = enumValues.every(v => typeof v === 'number');
      result = {
        type: isNumberEnum ? 'integer' : 'string',
        enum: enumValues,
      };
    }
  }

  // Fallback for unhandled types
  else {
    result = {};
  }

  return applyDescription(result, schema);
};
