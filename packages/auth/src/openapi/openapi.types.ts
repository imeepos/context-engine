/**
 * OpenAPI Schema Types
 */

export interface OpenAPISchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
  format?: string;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  items?: OpenAPISchema;
  enum?: unknown[];
  nullable?: boolean;
  description?: string;
  default?: unknown;

  // Composition
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];

  // Literals and constants
  const?: unknown;

  // Records/maps
  additionalProperties?: boolean | OpenAPISchema;

  // Tuples
  prefixItems?: OpenAPISchema[];
  minItems?: number;
  maxItems?: number;

  // String validation
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Number validation
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  // Never
  not?: OpenAPISchema;
}
