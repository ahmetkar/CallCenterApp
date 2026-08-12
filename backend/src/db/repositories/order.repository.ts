import { EntityManager } from 'typeorm';

import { Order } from '../entities/order.entity';
import { BaseRepository } from './base.repository';

export class OrderRepository extends BaseRepository<Order> {
  constructor(
    private manager?: EntityManager
  ) {
    super(Order);

    if (manager) {
      this.repository =
        manager.getRepository(Order);
    }
  }

  async createOrder(data: {
    customerId?: number;
    customerName: string;
    address: string;
    totalPrice: number;
    notes?: string;
    items: Array<{
      productId: number;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }) {
    const order = this.repo.create({
      customerId:
        data.customerId,
      customerName:
        data.customerName,
      address: data.address,
      totalPrice:
        data.totalPrice,
      notes: data.notes,
      status: 'Preparing',
      items: data.items.map(item => ({
        productId:
          item.productId,
        quantity:
          item.quantity,
        unitPrice:
          item.unitPrice,
        totalPrice:
          item.totalPrice,
      })),
    });

    return this.repo.save(order);
  }

  async getOrderWithDetails(
    orderId: number
  ) {
    return this.repo.findOne({
      where: {
        id: orderId,
      },
      relations: {
        items: {
          product: true,
        },
        customer: true,
        cargo: true,
      }
    });
  }

  async updateStatus(
    orderId: number,
    status: string
  ) {
    await this.repo.update(
      { id: orderId },
      { status }
    );

    return this.findById(
      orderId
    );
  }

  async listLatest(
    limit = 20
  ) {
    return this.repo.find({
      relations: {
        items: {
          product: true,
        },
        cargo: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  async listByCustomer(
    customerId: number
  ) {
    return this.repo.find({
      where: { customerId },
      relations: {
        items: {
          product: true,
        },
        cargo: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getOrderItems(
    orderId: number
  ) {
    const order =
      await this.repo.findOne({
        where: {
          id: orderId,
        },
        relations: {
          items: {
            product: true,
          },
        },
      });

    return order?.items ?? [];
  }
}

