
import { IntegrationAccount } from '../../db/entities/integrationaccount.entity';
import { CreatePlatformOrderDto } from '../dto/create-platform-order.dto';
import { PlatformOrderDto } from '../dto/platform-order.dto';

export interface DeliveryPlatformAdapter {
  readonly provider: string;

  createOrder(
    account: IntegrationAccount,
    order: CreatePlatformOrderDto
  ): Promise<PlatformOrderDto>;

  acceptOrder(
    account: IntegrationAccount,
    externalOrderId: string
  ): Promise<void>;

  markReady(
    account: IntegrationAccount,
    externalOrderId: string
  ): Promise<void>;

  cancelOrder(
    account: IntegrationAccount,
    externalOrderId: string,
    reason?: string
  ): Promise<void>;

  getOrder(
    account: IntegrationAccount,
    externalOrderId: string
  ): Promise<PlatformOrderDto>;

  syncProducts(
    account: IntegrationAccount
  ): Promise<void>;

  verifyWebhook(
    account: IntegrationAccount,
    signature: string,
    payload: string
  ): Promise<boolean>;

  refreshToken(
    account: IntegrationAccount
  ): Promise<IntegrationAccount>;
}

