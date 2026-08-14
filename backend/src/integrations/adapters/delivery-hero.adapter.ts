import axios, {
  AxiosInstance,
  AxiosRequestConfig,
} from 'axios';
import crypto from 'crypto';

import { IntegrationAccount } from '../../db/entities/integrationaccount.entity';
import { DeliveryPlatformAdapter } from './delivery-platform.adapter';
import { CreatePlatformOrderDto } from '../dto/create-platform-order.dto';
import { PlatformOrderDto } from '../dto/platform-order.dto';
import { IntegrationAccountRepository } from '../../db/repositories/integrationaccount.repository';
import { ProductRepository } from '../../db/repositories/product.repository';
import dotenv from 'dotenv';
dotenv.config();

export class DeliveryHeroAdapter
  implements DeliveryPlatformAdapter
{
  readonly provider = 'DeliveryHero';

  private api: AxiosInstance;

  private integrationRepo =
    new IntegrationAccountRepository();

  private productRepo =
    new ProductRepository();

  constructor() {
    this.api = axios.create({
      baseURL:
        process.env.DH_API_BASE ??
        'https://yemeksepeti.partner.deliveryhero.io',
      timeout: 15000,
    });
  }

  private getChainId(
    account: IntegrationAccount
  ): string {
    return (
      process.env.DH_CHAIN_ID ??
      account.apiKey ??
      ''
    );
  }

  private getVendorId(
    account: IntegrationAccount
  ): string {
    return account.externalStoreId;
  }

  private async request<T>(
    account: IntegrationAccount,
    config: AxiosRequestConfig,
    retry = true
  ): Promise<T> {
    try {
      const response =
        await this.api.request<T>({
          ...config,
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            'Content-Type':
              'application/json',
            ...(config.headers ?? {}),
          },
        });

      return response.data;
    } catch (err: any) {
      if (
        retry &&
        err.response?.status === 401
      ) {
        const refreshed =
          await this.refreshToken(
            account
          );

        return this.request<T>(
          refreshed,
          config,
          false
        );
      }

      throw err;
    }
  }

  private mapStatus(
    status: string
  ): string {
    switch (
      status?.toUpperCase()
    ) {
      case 'RECEIVED':
      case 'PENDING':
        return 'Pending';

      case 'ACCEPTED':
        return 'Accepted';

      case 'PREPARING':
        return 'Preparing';

      case 'READY_FOR_PICKUP':
        return 'Ready';

      case 'DISPATCHED':
      case 'PICKED_UP':
        return 'PickedUp';

      case 'DELIVERED':
        return 'Delivered';

      case 'CANCELLED':
      case 'CANCELED':
        return 'Cancelled';

      default:
        return 'Pending';
    }
  }

  async createOrder(
    account: IntegrationAccount,
    order: CreatePlatformOrderDto
  ): Promise<PlatformOrderDto> {
    const chainId =
      this.getChainId(account);

    const vendorId =
      this.getVendorId(account);

    const payload = {
      external_order_id: `voice-${Date.now()}`,
      customer: {
        name:
          order.customer.name,
        phone:
          order.customer.phone,
      },
      delivery: {
        address:
          order.customer.address,
      },
      items: order.items.map(
        item => ({
          name: item.productName,
          quantity:
            item.quantity,
          unit_price:
            item.unitPrice,
        })
      ),
      comment: order.notes,
    };

    const response =
      await this.request<any>(
        account,
        {
          method: 'POST',
          url: `/v2/chains/${chainId}/vendors/${vendorId}/orders`,
          data: payload,
        }
      );

    return {
      externalOrderId:
        response.order_id,
      externalStoreId:
        vendorId,
      status:
        this.mapStatus(
          response.status
        ),
      trackingUrl:
        response.tracking_url,
      courier:{
        name:response.courier?.name,
      phone:
        response.courier?.phone
      },
      totalPrice:Number(response.total_price),
      estimatedPickupTime:
        response.accepted_for
          ? new Date(
              response.accepted_for
            )
          : undefined,
      estimatedDeliveryTime:
        response.promised_for
          ? new Date(
              response.promised_for
            )
          : undefined,
      raw: response,
    };
  }

  async acceptOrder(
    account: IntegrationAccount,
    externalOrderId: string
  ): Promise<void> {
    const chainId =
      this.getChainId(account);

    await this.request(
      account,
      {
        method: 'PUT',
        url: `/v2/chains/${chainId}/orders/${externalOrderId}`,
        data: {
          order_id:
            externalOrderId,
          status: 'ACCEPTED',
        },
      }
    );
  }

  async markReady(
    account: IntegrationAccount,
    externalOrderId: string
  ): Promise<void> {
    const chainId =
      this.getChainId(account);

    await this.request(
      account,
      {
        method: 'PUT',
        url: `/v2/chains/${chainId}/orders/${externalOrderId}`,
        data: {
          order_id:
            externalOrderId,
          status:
            'READY_FOR_PICKUP',
        },
      }
    );
  }

  async cancelOrder(
    account: IntegrationAccount,
    externalOrderId: string,
    reason?: string
  ): Promise<void> {
    const chainId =
      this.getChainId(account);

    await this.request(
      account,
      {
        method: 'PUT',
        url: `/v2/chains/${chainId}/orders/${externalOrderId}`,
        data: {
          order_id:
            externalOrderId,
          status: 'CANCELLED',
          cancellation: {
            reason:
              reason ??
              'Cancelled by restaurant',
          },
        },
      }
    );
  }

  async getOrder(
    account: IntegrationAccount,
    externalOrderId: string
  ): Promise<PlatformOrderDto> {
    const chainId =
      this.getChainId(account);

    const vendorId =
      this.getVendorId(account);

    const response =
      await this.request<any>(
        account,
        {
          method: 'GET',
          url: `/v2/chains/${chainId}/vendors/${vendorId}/orders/${externalOrderId}`,
        }
      );

    return {
      externalOrderId:
        response.order_id,
      externalStoreId:
        vendorId,
      status:
        this.mapStatus(
          response.status
        ),
      trackingUrl:
        response.tracking_url,
      courier:{
        name:response.courier?.name,
      phone:
        response.courier?.phone
      },
      totalPrice:Number(response.total_price),
      estimatedPickupTime:
        response.accepted_for
          ? new Date(
              response.accepted_for
            )
          : undefined,
      estimatedDeliveryTime:
        response.promised_for
          ? new Date(
              response.promised_for
            )
          : undefined,
      raw: response,
    };
  }

  async syncProducts(
    account: IntegrationAccount
  ): Promise<void> {
    const chainId =
      this.getChainId(account);

    const vendorId =
      this.getVendorId(account);

    const response =
      await this.request<any>(
        account,
        {
          method: 'GET',
          url: `/v2/chains/${chainId}/vendors/${vendorId}/catalog`,
        }
      );

    const products =
      response.items ?? [];

    for (const product of products) {
      await this.productRepo.upsertFromPlatform({
        restaurantId:
          account.restaurantId,
        externalProductId:
          product.id,
        name: product.name,
        description:
          product.description,
        category:
          product.category,
        price: Number(
          product.price
        ),
        currency:
          product.currency ??
          'TRY',
        isAvailable:
          product.status !==
          'INACTIVE',
      });
    }
  }

  async verifyWebhook(
    account: IntegrationAccount,
    signature: string,
    payload: string
  ): Promise<boolean> {
    if (
      !account.webhookSecret
    ) {
      return false;
    }

    const expected =
      crypto
        .createHmac(
          'sha256',
          account.webhookSecret
        )
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  }

  async refreshToken(
    account: IntegrationAccount
  ): Promise<IntegrationAccount> {
    const response =
      await axios.post(
        `${process.env.DH_API_BASE ?? 'https://yemeksepeti.partner.deliveryhero.io'}/v2/oauth/token`,
        new URLSearchParams({
          grant_type:
            'client_credentials',
          client_id:
            process.env.DH_CLIENT_ID!,
          client_secret:
            process.env.DH_CLIENT_SECRET!,
        }),
        {
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded',
          },
        }
      );

    account.accessToken =
      response.data.access_token;

    account.expiresAt =
      new Date(
        Date.now() +
          response.data.expires_in *
            1000
      );

    await this.integrationRepo.update(
      { id: account.id },
      {
        accessToken:
          account.accessToken,
        expiresAt:
          account.expiresAt,
      }
    );

    return (
      (await this.integrationRepo.findById(
        account.id
      )) ?? account
    );
  }
}