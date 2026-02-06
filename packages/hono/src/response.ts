import { AppError } from '@sker/core';
import { ZodError } from 'zod';

export function defaultResponseSerializer(result: unknown): Response {
  if (result instanceof Response) {
    return result;
  }

  return jsonResponse(
    {
      success: true,
      data: result,
    },
    200
  );
}

export function defaultErrorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.issues,
        },
        timestamp: new Date().toISOString(),
      },
      422
    );
  }

  if (AppError.isAppError(error)) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          meta: error.meta,
        },
        timestamp: new Date().toISOString(),
      },
      error.statusCode
    );
  }

  return jsonResponse(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unexpected error',
      },
      timestamp: new Date().toISOString(),
    },
    500
  );
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}
