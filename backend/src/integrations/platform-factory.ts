
import { IntegrationProvider } from '../db/entities/integrationaccount.entity';

import { DeliveryPlatformAdapter } from './adapters/delivery-platform.adapter';
import { UberEatsAdapter } from './adapters/uber-eats.adapter';
import { DeliveryHeroAdapter } from './adapters/delivery-hero.adapter';

export class PlatformFactory {
  private adapters = new Map<
    IntegrationProvider,
    DeliveryPlatformAdapter
  >([
    [
      IntegrationProvider.UBER_EATS,
      new UberEatsAdapter(),
    ],
    [
      IntegrationProvider.DELIVERY_HERO,
      new DeliveryHeroAdapter(),
    ],
  ]);

  getAdapter(
    provider: IntegrationProvider
  ): DeliveryPlatformAdapter {
    const adapter =
      this.adapters.get(
        provider
      );

    if (!adapter) {
      throw new Error(
        `Adapter not found: ${provider}`
      );
    }

    return adapter;
  }
}

