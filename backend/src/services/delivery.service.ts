
import { DeliveryRepository } from '../db/repositories/delivery.repository';
import { OrderRepository } from '../db/repositories/order.repository';

export class DeliveryService {
  private deliveries =
    new DeliveryRepository();

  private orders =
    new OrderRepository();

  async checkDeliveryStatus(
    orderNumber: string
  ) {
    const order =
      await this.orders.findByOrderNumber(
        orderNumber
      );

    if (!order) {
      throw new Error(
        'Sipariş bulunamadı'
      );
    }

    const delivery =
      await this.deliveries.getByOrderId(
        order.id
      );

    if (!delivery) {
      throw new Error(
        'Teslimat kaydı bulunamadı'
      );
    }
    
    return {
      orderNumber:
        order.orderNumber,
      status:
        delivery.status,
      courier: {
        name:
          delivery.courierName,
        phone:
          delivery.courierPhone,
      },
      trackingUrl:
        delivery.trackingUrl,
      estimatedPickupTime:
        delivery.estimatedPickupTime,
      estimatedDeliveryTime:
        delivery.estimatedDeliveryTime,
      pickedUpAt:
        delivery.pickedUpAt,
      deliveredAt:
        delivery.deliveredAt,
    };
  }

  async checkByTrackingNumber(
    trackingNumber: string
  ) {
    const delivery =
      await this.deliveries.findByExternalDeliveryId(
        trackingNumber
      );

    if (!delivery) {
      throw new Error(
        'Teslimat bulunamadı'
      );
    }

    return {
      orderNumber:
        delivery.order.orderNumber,
      status:
        delivery.status,
      courier: {
        name:
          delivery.courierName,
        phone:
          delivery.courierPhone,
      },
      trackingUrl:
        delivery.trackingUrl,
      estimatedDeliveryTime:
        delivery.estimatedDeliveryTime,
    };
  }

  async updateDeliveryStatus(
    orderId: number,
    status: string
  ) {
    switch (status) {
      case 'Assigned':
        return this.deliveries.assignCourier(
          orderId,
          {}
        );

      case 'PickedUp':
        return this.deliveries.markPickedUp(
          orderId
        );

      case 'Delivered':
        return this.deliveries.markDelivered(
          orderId
        );

      default:
        throw new Error(
          'Geçersiz teslimat durumu'
        );
    }
  }

  async getTrackingUrl(
    orderNumber: string
  ) {
    const order =
      await this.orders.findByOrderNumber(
        orderNumber
      );

    if (!order) {
      throw new Error(
        'Sipariş bulunamadı'
      );
    }

    const delivery =
      await this.deliveries.getByOrderId(
        order.id
      );

    return {
      trackingUrl:
        delivery?.trackingUrl,
    };
  }
}

