import { AppError } from '@sker/core';
import { ZodError } from 'zod';

export function successResponse(status: number, data: unknown): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: { 'content-type': 'application/json' },
    }
  );
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.issues,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 422,
        headers: { 'content-type': 'application/json' },
      }
    );
  }

  if (AppError.isAppError(error)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          meta: error.meta,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: error.statusCode,
        headers: { 'content-type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unexpected error',
      },
      timestamp: new Date().toISOString(),
    }),
    {
      status: 500,
      headers: { 'content-type': 'application/json' },
    }
  );
}
