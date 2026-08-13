
import { EntityManager } from 'typeorm';

import { OrderItem } from '../entities/orderitem.entity';
import { BaseRepository } from './base.repository';

export class OrderItemRepository extends BaseRepository<OrderItem> {
  constructor(
    private manager?: EntityManager
  ) {
    super(OrderItem);

    if (manager) {
      this.repository =
        manager.getRepository(OrderItem);
    }
  }

  async createItem(data: Partial<OrderItem>) {
    const item =
      this.repo.create(data);

    return this.repo.save(item);
  }

  async createItems(
    items: Partial<OrderItem>[]
  ) {
    const entities =
      this.repo.create(items);

    return this.repo.save(
      entities
    );
  }

  async listByOrder(
    orderId: number
  ) {
    return this.repo.find({
      where: { orderId },
      relations: {
        product: true,
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async getOrderTotal(
    orderId: number
  ) {
    const result =
      await this.repo
        .createQueryBuilder('item')
        .select(
          'SUM(item.totalPrice)',
          'total'
        )
        .where(
          'item.orderId = :orderId',
          { orderId }
        )
        .getRawOne();

    return Number(
      result?.total ?? 0
    );
  }

  async removeByOrder(
    orderId: number
  ) {
    await this.repo.delete({
      orderId,
    });
  }

  async updateQuantity(
    itemId: number,
    quantity: number
  ) {
    const item =
      await this.findById(
        itemId
      );

    if (!item) {
      throw new Error(
        'Sipariş kalemi bulunamadı'
      );
    }

    item.quantity = quantity;

    item.totalPrice =
      Number(item.unitPrice) *
      quantity;

    return this.repo.save(item);
  }

  async findByExternalProductId(
    orderId: number,
    externalProductId: string
  ) {
    return this.repo.findOne({
      where: {
        orderId,
        externalProductId,
      },
    });
  }

  async addModifier(
    itemId: number,
    modifier: Record<
      string,
      any
    >
  ) {
    const item =
      await this.findById(
        itemId
      );

    if (!item) {
      throw new Error(
        'Sipariş kalemi bulunamadı'
      );
    }

    item.modifiers = {
      ...(item.modifiers ??
        {}),
      ...modifier,
    };

    return this.repo.save(item);
  }
}

