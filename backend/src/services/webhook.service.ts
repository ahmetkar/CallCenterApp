
import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../db/data-source';

import {
  OrderStatus,
} from '../db/entities/order.entity';

import {
  DeliveryStatus,
} from '../db/entities/delivery.entity';

import {
  IntegrationProvider,
} from '../db/entities/integrationaccount.entity';

import { IntegrationAccountRepository } from '../db/repositories/integrationaccount.repository';
import { OrderRepository } from '../db/repositories/order.repository';
import { DeliveryRepository } from '../db/repositories/delivery.repository';
import { OrderEventRepository } from '../db/repositories/orderevent.repository';

import { PlatformFactory } from '../integrations/platform-factory';

export class WebhookService {
  private integrations =
    new IntegrationAccountRepository();

  private platformFactory =
    new PlatformFactory();

  async handleUberWebhook(
    externalStoreId: string,
    signature: string,
    payload: any
  ) {
    return this.handleWebhook(
      IntegrationProvider.UBER_EATS,
      externalStoreId,
      signature,
      payload
    );
  }

  async handleDeliveryHeroWebhook(
    externalStoreId: string,
    signature: string,
    payload: any
  ) {
    return this.handleWebhook(
      IntegrationProvider.DELIVERY_HERO,
      externalStoreId,
      signature,
      payload
    );
  }

  private async handleWebhook(
    provider: IntegrationProvider,
    externalStoreId: string,
    signature: string,
    payload: any
  ) {
    const account =
      await this.integrations.findByExternalStoreId(
        provider,
        externalStoreId
      );

    if (!account) {
      throw new Error(
        'Entegrasyon hesabı bulunamadı'
      );
    }

    const adapter =
      this.platformFactory.getAdapter(
        provider
      );

    const valid =
      await adapter.verifyWebhook(
        account,
        signature,
        JSON.stringify(payload)
      );

    if (!valid) {
      throw new Error(
        'Webhook doğrulanamadı'
      );
    }

    const queryRunner: QueryRunner =
      AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepo =
        new OrderRepository(
          queryRunner.manager
        );

      const deliveryRepo =
        new DeliveryRepository(
          queryRunner.manager
        );

      const eventRepo =
        new OrderEventRepository(
          queryRunner.manager
        );

      const order =
        await orderRepo.findByExternalOrderId(
          provider,
          payload.orderId
        );

      if (!order) {
        throw new Error(
          'Sipariş bulunamadı'
        );
      }

      const event =
        await eventRepo.createEvent({
          orderId: order.id,
          provider,
          eventType:
            payload.eventType,
          externalEventId:
            payload.eventId,
          payload,
        });

      if (event.processed) {
        await queryRunner.rollbackTransaction();
        return;
      }

      await this.processEvent(
        order.id,
        payload.eventType,
        payload,
        orderRepo,
        deliveryRepo
      );

      await eventRepo.markProcessed(
        event.id
      );

      await queryRunner.commitTransaction();


      return {
        success: true,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();

      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async processEvent(
    orderId: number,
    eventType: string,
    payload: any,
    orderRepo: OrderRepository,
    deliveryRepo: DeliveryRepository
  ) {
    switch (eventType) {
      case 'order.accepted':
        await orderRepo.updateStatus(
          orderId,
          OrderStatus.ACCEPTED
        );

        await orderRepo.markAccepted(
          orderId
        );

        break;

      case 'order.preparing':
        await orderRepo.updateStatus(
          orderId,
          OrderStatus.PREPARING
        );

        break;

      case 'order.ready':
        await orderRepo.updateStatus(
          orderId,
          OrderStatus.READY
        );

        await orderRepo.markReady(
          orderId
        );

        break;

      case 'courier.assigned':
        await orderRepo.updateStatus(
          orderId,
          OrderStatus.COURIER_ASSIGNED
        );

        await deliveryRepo.assignCourier(
          orderId,
          {
            courierName:
              payload.courier?.name,
            courierPhone:
              payload.courier?.phone,
            estimatedPickupTime:
              payload
                .estimatedPickupTime
                ? new Date(
                    payload.estimatedPickupTime
                  )
                : undefined,
            estimatedDeliveryTime:
              payload
                .estimatedDeliveryTime
                ? new Date(
                    payload.estimatedDeliveryTime
                  )
                : undefined,
          }
        );

        break;

      case 'courier.picked_up':
        await orderRepo.updateStatus(
          orderId,
          OrderStatus.PICKED_UP
        );

        await deliveryRepo.markPickedUp(
          orderId
        );

        break;

      case 'order.delivered':
        await orderRepo.updateStatus(
          orderId,
          OrderStatus.DELIVERED
        );

        await orderRepo.markDelivered(
          orderId
        );

        await deliveryRepo.markDelivered(
          orderId
        );

        break;

      case 'order.cancelled':
        await orderRepo.updateStatus(
          orderId,
          OrderStatus.CANCELLED
        );

        break;

      default:
        console.log(
          'Unhandled webhook event:',
          eventType
        );
    }
  }

  async replayFailedEvents() {
    const eventRepo =
      new OrderEventRepository();

    const events =
      await eventRepo.listUnprocessed(
        100
      );

    for (const event of events) {
      try {
        const orderRepo =
          new OrderRepository();

        const deliveryRepo =
          new DeliveryRepository();

        await this.processEvent(
          event.orderId,
          event.eventType,
          event.payload,
          orderRepo,
          deliveryRepo
        );

        await eventRepo.markProcessed(
          event.id
        );
      } catch (err) {
        await eventRepo.markFailed(
          event.id,
          err instanceof Error
            ? err.message
            : 'Unknown error'
        );
      }
    }
  }
}


