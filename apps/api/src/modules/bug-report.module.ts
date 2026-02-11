import { Module } from '@sker/core';
import { DataSource } from '@sker/typeorm';
import { BugReportController } from '../controllers/bug-report.controller';
import { BugReport } from '../entities/bug-report.entity';
import { BugReportService } from '../services/bug-report.service';

const BUG_REPORT_ENTITIES = [BugReport];

@Module({
  providers: [
    { provide: DataSource, useClass: DataSource },
    { provide: BugReportService, useClass: BugReportService },
  ],
  features: [BugReportController],
})
export class BugReportModule {
  static readonly entities = BUG_REPORT_ENTITIES;
}
