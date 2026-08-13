
import {
  IntegrationProvider,
} from '../db/entities/integrationaccount.entity';

import { IntegrationAccountRepository } from '../db/repositories/integrationaccount.repository';

import { PlatformFactory } from '../integrations/platform-factory';

export class IntegrationService {
  private integrations =
    new IntegrationAccountRepository();

  private factory =
    new PlatformFactory();

  async listIntegrations(
    restaurantId: number
  ) {
    return this.integrations.findByRestaurant(
      restaurantId
    );
  }

  async getIntegration(
    restaurantId: number,
    provider: IntegrationProvider
  ) {
    const account =
      await this.integrations.findByProvider(
        restaurantId,
        provider
      );

    if (!account) {
      throw new Error(
        'Entegrasyon hesabı bulunamadı'
      );
    }

    return account;
  }

  async refreshIntegrationToken(
    restaurantId: number,
    provider: IntegrationProvider
  ) {
    const account =
      await this.getIntegration(
        restaurantId,
        provider
      );

    const adapter =
      this.factory.getAdapter(
        provider
      );

    return adapter.refreshToken(
      account
    );
  }

  async syncMenu(
    restaurantId: number,
    provider: IntegrationProvider
  ) {
    const account =
      await this.getIntegration(
        restaurantId,
        provider
      );

    const adapter =
      this.factory.getAdapter(
        provider
      );

    await adapter.syncProducts(
      account
    );

    return {
      success: true,
      provider,
      restaurantId,
    };
  }

  async activateIntegration(
    accountId: number
  ) {
    return this.integrations.activate(
      accountId
    );
  }

  async deactivateIntegration(
    accountId: number
  ) {
    return this.integrations.deactivate(
      accountId
    );
  }

  async refreshExpiredTokens() {
    const accounts =
      await this.integrations.getExpiredTokens();

    for (const account of accounts) {
      try {
        const adapter =
          this.factory.getAdapter(
            account.provider
          );

        await adapter.refreshToken(
          account
        );
      } catch (err) {
        console.error(
          'Token refresh failed',
          account.id,
          err
        );
      }
    }
  }
}

