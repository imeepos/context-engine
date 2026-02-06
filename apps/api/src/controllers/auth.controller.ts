import { Body, Controller, Get, Inject, Injectable, Post, Put, REQUEST } from '@sker/core';
import { z } from 'zod';
import { AuthError, AuthService } from '../services/auth.service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(64).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updatePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

@Controller('/auth')
@Injectable({ providedIn: 'auto' })
export class AuthController {
  constructor(
    @Inject(AuthService) private authService: AuthService,
    @Inject(REQUEST) private request: Request
  ) {}

  @Get('/status')
  getStatus() {
    return {
      service: 'auth',
      status: 'ready',
    };
  }

  @Post('/register')
  async register(@Body(registerSchema) body: z.infer<typeof registerSchema>) {
    try {
      const result = await this.authService.register(body);
      return this.successResponse(201, result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Post('/login')
  async login(@Body(loginSchema) body: z.infer<typeof loginSchema>) {
    try {
      const result = await this.authService.login(body);
      return this.successResponse(200, result);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Post('/logout')
  async logout() {
    try {
      const token = this.extractBearerToken();
      await this.authService.logout(token);
      return this.successResponse(200, { loggedOut: true });
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Put('/password')
  async updatePassword(@Body(updatePasswordSchema) body: z.infer<typeof updatePasswordSchema>) {
    try {
      const token = this.extractBearerToken();
      await this.authService.updatePassword({
        token,
        oldPassword: body.oldPassword,
        newPassword: body.newPassword,
      });
      return this.successResponse(200, { updated: true });
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  private extractBearerToken() {
    const authHeader = this.request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError(401, 'auth.missing_token', 'Missing or invalid authorization header');
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new AuthError(401, 'auth.missing_token', 'Missing or invalid authorization header');
    }
    return token;
  }

  private successResponse(status: number, data: unknown) {
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

  private errorResponse(error: unknown) {
    const knownError = error instanceof AuthError
      ? error
      : new AuthError(500, 'auth.internal_error', error instanceof Error ? error.message : 'Unexpected error');

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: knownError.code,
          message: knownError.message,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: knownError.status,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
