import { Module } from '@sker/core';
import { MarketplaceController } from '../controllers/marketplace.controller';
import { MarketplaceService } from '../services/marketplace.service';

@Module({
  providers: [{ provide: MarketplaceService, useClass: MarketplaceService }],
  features: [MarketplaceController],
})
export class MarketplaceModule {}
