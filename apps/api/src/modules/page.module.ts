import { Module } from '@sker/core';
import { PageRendererService } from '../services/page-renderer.service';

@Module({
  providers: [
    { provide: PageRendererService, useClass: PageRendererService }
  ],
  exports: [PageRendererService]
})
export class PageModule {}
