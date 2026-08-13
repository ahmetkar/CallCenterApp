
import { EntityManager } from 'typeorm';

import { Delivery } from '../entities/delivery.entity';
import { BaseRepository } from './base.repository';

export class DeliveryRepository extends BaseRepository<Delivery> {
  constructor(
    private manager?: EntityManager
  ) {
    super(Delivery);

    if (manager) {
      this.repository =
        manager.getRepository(Delivery);
    }
  }

  async getByOrderId(
    orderId: number
  ) {
    return this.repo.findOne({
      where: { orderId },
      relations: {
        order: true,
      },
    });
  }

  async findByExternalDeliveryId(
    externalDeliveryId: string
  ) {
    return this.repo.findOne({
      where: {
        externalDeliveryId,
      },
      relations: {
        order: true,
      },
    });
  }

  async createDelivery(data: {
    orderId: number;
    provider: any;
    externalDeliveryId?: string;
    courierName?: string;
    courierPhone?: string;
    trackingUrl?: string;
    estimatedPickupTime?: Date;
    estimatedDeliveryTime?: Date;
  }) {
    const delivery =
      this.repo.create({
        orderId: data.orderId,
        provider: data.provider,
        externalDeliveryId:
          data.externalDeliveryId,
        courierName:
          data.courierName,
        courierPhone:
          data.courierPhone,
        trackingUrl:
          data.trackingUrl,
        estimatedPickupTime:
          data.estimatedPickupTime,
        estimatedDeliveryTime:
          data.estimatedDeliveryTime,
      });

    return this.repo.save(
      delivery
    );
  }

  async assignCourier(
    orderId: number,
    data: {
      courierName?: string;
      courierPhone?: string;
      estimatedPickupTime?: Date;
      estimatedDeliveryTime?: Date;
    }
  ) {
    await this.repo.update(
      { orderId },
      {
        status: 'Assigned' as any,
        courierName:
          data.courierName,
        courierPhone:
          data.courierPhone,
        estimatedPickupTime:
          data.estimatedPickupTime,
        estimatedDeliveryTime:
          data.estimatedDeliveryTime,
      }
    );

    return this.getByOrderId(
      orderId
    );
  }

  async markPickedUp(
    orderId: number
  ) {
    await this.repo.update(
      { orderId },
      {
        status: 'PickedUp' as any,
        pickedUpAt: new Date(),
      }
    );

    return this.getByOrderId(
      orderId
    );
  }

  async markDelivered(
    orderId: number
  ) {
    await this.repo.update(
      { orderId },
      {
        status: 'Delivered' as any,
        deliveredAt: new Date(),
      }
    );

    return this.getByOrderId(
      orderId
    );
  }

  async updateTrackingUrl(
    orderId: number,
    trackingUrl: string
  ) {
    await this.repo.update(
      { orderId },
      {
        trackingUrl,
      }
    );

    return this.getByOrderId(
      orderId
    );
  }
}

