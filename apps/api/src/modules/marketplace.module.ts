import { Module } from '@sker/core';
import { DataSource } from '@sker/typeorm';
import { MarketplaceController } from '../controllers/marketplace.controller';
import { PluginInstall } from '../entities/plugin-install.entity';
import { PluginReview } from '../entities/plugin-review.entity';
import { PluginVersion } from '../entities/plugin-version.entity';
import { Plugin } from '../entities/plugin.entity';
import { MarketplaceService } from '../services/marketplace.service';

const MARKETPLACE_ENTITIES = [Plugin, PluginVersion, PluginInstall, PluginReview];

@Module({
  providers: [
    { provide: DataSource, useClass: DataSource },
    { provide: MarketplaceService, useClass: MarketplaceService },
  ],
  features: [MarketplaceController],
})
export class MarketplaceModule {
  static readonly entities = MARKETPLACE_ENTITIES;
}
