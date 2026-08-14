import axios, {
  AxiosInstance,
  AxiosRequestConfig,
} from 'axios';
import crypto from 'crypto';

import { IntegrationAccount } from '../../db/entities/integrationaccount.entity';
import { DeliveryPlatformAdapter } from './delivery-platform.adapter';
import { CreatePlatformOrderDto } from '../dto/create-platform-order.dto';
import { PlatformOrderDto } from '../dto/platform-order.dto';

import { ProductRepository } from '../../db/repositories/product.repository';
import { IntegrationAccountRepository } from '../../db/repositories/integrationaccount.repository';
import dotenv from 'dotenv';
dotenv.config();

const productRepo =
  new ProductRepository();

export class UberEatsAdapter
  implements DeliveryPlatformAdapter
{
  readonly provider = 'UberEats';

  private api: AxiosInstance;

  private integrationRepo =
  new IntegrationAccountRepository();

  
  constructor() {
    this.api = axios.create({
      baseURL:
        process.env.UBER_API_BASE ??
        'https://sandbox-api.uber.com',
      timeout: 15000,
    });
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


   async getOrder(
    account: IntegrationAccount,
    externalOrderId: string
  ): Promise<PlatformOrderDto> {
    const response =
      await this.request<any>(
        account,
        {
          method: 'GET',
          url: `/v1/orders/${externalOrderId}`,
        }
      );

            return {
          externalOrderId:
            response.id,
          externalStoreId:
            response.store_id ??
            account.externalStoreId,
          status:
            this.mapStatus(
              response.status
            ),
          trackingUrl:
            response.tracking_url,
           totalPrice: Number(
            response.total_price ?? 0
           ),
          courier:{
            name:response.courier?.name,
            phone:response.courier?.phone
          },
          estimatedPickupTime:
            response.estimated_pickup_time
              ? new Date(
                  response.estimated_pickup_time
                )
              : undefined,
          estimatedDeliveryTime:
            response.estimated_delivery_time
              ? new Date(
                  response.estimated_delivery_time
                )
              : undefined,
          raw: response,
        };
  }
 

   async createOrder(
  account: IntegrationAccount,
  order: CreatePlatformOrderDto
): Promise<PlatformOrderDto> {
  const payload = {
    store_id:
      account.externalStoreId,
    customer: {
      name:
        order.customer.name,
      phone:
        order.customer.phone,
    },
    delivery: {
      address:
        order.customer.address,
      notes: order.notes,
    },
    items: order.items.map(
      item => ({
        name: item.productName,
        quantity:
          item.quantity,
        unit_price:
          item.unitPrice,
        notes: item.notes,
      })
    ),
    source: process.env.APP_NAME,
  };

  const response =
    await this.request<any>(
      account,
      {
        method: 'POST',
        url: '/v1/orders',
        data: payload,
      }
    );

  return {
    externalOrderId:
      response.id,
    externalStoreId:
      account.externalStoreId,
    status:
      this.mapStatus(
        response.status
      ),
    trackingUrl:
      response.tracking_url,
    totalPrice: Number(
            response.total_price ?? 0
           ),
    courier:{
            name:response.courier?.name,
            phone:response.courier?.phone
    },
    estimatedPickupTime:
      response.estimated_pickup_time
        ? new Date(
            response.estimated_pickup_time
          )
        : undefined,
    estimatedDeliveryTime:
      response.estimated_delivery_time
        ? new Date(
            response.estimated_delivery_time
          )
        : undefined,
    raw: response,
  };
}


 private mapStatus(
    status: string
  ): string {
    switch (
      status?.toUpperCase()
    ) {
      case 'PENDING':
        return 'Pending';
      case 'ACCEPTED':
        return 'Accepted';
      case 'PREPARING':
        return 'Preparing';
      case 'READY':
        return 'Ready';
      case 'PICKED_UP':
        return 'PickedUp';
      case 'DELIVERED':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'Pending';
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
        `${process.env.UBER_AUTH_BASE ?? 'https://login.uber.com'}/oauth/v2/token`,
        {
          grant_type:
            'refresh_token',
          refresh_token:
            account.refreshToken,
          client_id:
            process.env.UBER_CLIENT_ID,
          client_secret:
            process.env.UBER_CLIENT_SECRET,
        },
        {
          headers: {
            'Content-Type':
              'application/json',
          },
        }
      );

    account.accessToken =
      response.data.access_token;

    if (
      response.data.refresh_token
    ) {
      account.refreshToken =
        response.data.refresh_token;
    }

    if (
      response.data.expires_in
    ) {
      account.expiresAt =
        new Date(
          Date.now() +
            response.data.expires_in *
              1000
        );
    }

    await this.integrationRepo.update(
    { id: account.id },
    {
      accessToken:
        account.accessToken,
      refreshToken:
        account.refreshToken,
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


  //Burdan sonrası tools tarafından kullanılmıyor ama yönetim arayüzü yazılırsa kullanılabilir.


    async acceptOrder(
    account: IntegrationAccount,
    externalOrderId: string
  ): Promise<void> {
    await this.request(
      account,
      {
        method: 'POST',
        url: `/v1/orders/${externalOrderId}/accept`,
      }
    );
  }

  async markReady(
    account: IntegrationAccount,
    externalOrderId: string
  ): Promise<void> {
    await this.request(
      account,
      {
        method: 'POST',
        url: `/v1/orders/${externalOrderId}/ready`,
      }
    );
  }

  async cancelOrder(
    account: IntegrationAccount,
    externalOrderId: string,
    reason?: string
  ): Promise<void> {
    await this.request(
      account,
      {
        method: 'POST',
        url: `/v1/orders/${externalOrderId}/cancel`,
        data: {
          reason:
            reason ??
            'Cancelled by restaurant',
        },
      }
    );
  }

   

  async syncProducts(
    account: IntegrationAccount
  ): Promise<void> {
    const response =
      await this.request<any>(
        account,
        {
          method: 'GET',
          url: `/v1/stores/${account.externalStoreId}/products`,
        }
      );

    const products =
      response.products ?? [];

    console.log(
      `UberEats product sync: ${products.length} products`
    );

    for (const product of products) {
      console.log({
        externalProductId:
          product.id,
        name: product.name,
        price: Number(
          product.price
        ),
        category:
          product.category,
        available:
          product.available,
      });

      const products =
    response.products ?? [];

  console.log(
    `UberEats product sync: ${products.length} products`
  );

  for (const product of products) {
    await productRepo.upsertFromPlatform({
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
        product.available ??
        true,
    });
  }
    }
  }
}