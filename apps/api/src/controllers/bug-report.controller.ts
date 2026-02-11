import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Optional,
  Param,
  Post,
  Put,
  Query,
  RequirePermissions,
  UnauthorizedError,
} from '@sker/core';
import { z } from 'zod';
import { BugReportService } from '../services/bug-report.service';
import { AUTH_SESSION, type AuthSession } from '../auth/session.token';
import { errorResponse, successResponse } from '../utils/api-response';

const listBugsQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  source: z.enum(['ai', 'manual']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const createBugSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  source: z.enum(['ai', 'manual']).optional(),
  aiContext: z.record(z.string(), z.unknown()).optional(),
  stackTrace: z.string().optional(),
  environment: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string().min(1).max(30)).max(20).optional(),
});

const updateBugSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

@Controller('/bugs')
@Injectable({ providedIn: 'auto' })
export class BugReportController {
  constructor(
    @Inject(BugReportService) private bugReportService: BugReportService,
    @Optional(AUTH_SESSION) private session?: AuthSession
  ) {}

  @Post('/')
  async createBug(@Body(createBugSchema) body: z.infer<typeof createBugSchema>) {
    try {
      const created = await this.bugReportService.createBug({
        ...body,
        reporterId: this.session?.user.id,
      });
      return successResponse(201, created);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Get('/')
  @RequirePermissions({ roles: 'user' })
  async listBugs(@Query() query: Record<string, unknown>) {
    try {
      const validated = listBugsQuerySchema.parse(query);
      const result = await this.bugReportService.listBugs(validated);
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Get('/:id')
  @RequirePermissions({ roles: 'user' })
  async getBugDetail(@Param('id') id: string) {
    try {
      const result = await this.bugReportService.getBugDetail(id);
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  @Put('/:id')
  @RequirePermissions({ roles: 'user' })
  async updateBug(@Param('id') id: string, @Body(updateBugSchema) body: z.infer<typeof updateBugSchema>) {
    try {
      const session = this.requireSession();
      const result = await this.bugReportService.updateBug({
        id,
        actorId: session.user.id,
        ...body,
      });
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  private requireSession() {
    if (!this.session) {
      throw new UnauthorizedError();
    }
    return this.session;
  }
}
