import {
  EntityManager,
} from 'typeorm';

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
    productId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    customerName: string;
    address: string;
  }) {
    return this.create({
      customerId:
        data.customerId,
      productId: data.productId,
      quantity: data.quantity,
      unitPrice:
        data.unitPrice,
      totalPrice:
        data.totalPrice,
      customerName:
        data.customerName,
      address: data.address,
      status: 'Preparing',
    });
  }

  async getOrderWithDetails(
    orderId: number
  ) {
    return this.repo.findOne({
      where: {
        id: orderId,
      },
      relations: {
        product: true,
        customer: true,
        cargo: true,
      },
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
        product: true,
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
        product: true,
        cargo: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}