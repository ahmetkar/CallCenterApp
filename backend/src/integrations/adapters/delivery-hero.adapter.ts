
import { IntegrationAccount } from '../../db/entities/integrationaccount.entity';
import { DeliveryPlatformAdapter } from './delivery-platform.adapter';
import { CreatePlatformOrderDto } from '../dto/create-platform-order.dto';
import { PlatformOrderDto } from '../dto/platform-order.dto';

export class DeliveryHeroAdapter
  implements DeliveryPlatformAdapter
{
  readonly provider =
    'DeliveryHero';

  async createOrder(
    account: IntegrationAccount,
    order: CreatePlatformOrderDto
  ): Promise<PlatformOrderDto> {
    throw new Error(
      'Not implemented'
    );
  }

  async acceptOrder(
    account: IntegrationAccount,
    externalOrderId: string
  ): Promise<void> {
    throw new Error(
      'Not implemented'
    );
  }

  async markReady(
    account: IntegrationAccount,
    externalOrderId: string
  ): Promise<void> {
    throw new Error(
      'Not implemented'
    );
  }

  async cancelOrder(
    account: IntegrationAccount,
    externalOrderId: string,
    reason?: string
  ): Promise<void> {
    throw new Error(
      'Not implemented'
    );
  }

  async getOrder(
    account: IntegrationAccount,
    externalOrderId: string
  ): Promise<PlatformOrderDto> {
    throw new Error(
      'Not implemented'
    );
  }

  async syncProducts(
    account: IntegrationAccount
  ): Promise<void> {
    throw new Error(
      'Not implemented'
    );
  }

  async verifyWebhook(
    account: IntegrationAccount,
    signature: string,
    payload: string
  ): Promise<boolean> {
    throw new Error(
      'Not implemented'
    );
  }

  async refreshToken(
    account: IntegrationAccount
  ): Promise<IntegrationAccount> {
    throw new Error(
      'Not implemented'
    );
  }
}

