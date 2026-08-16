
import {
  EntityManager,
  IsNull,
} from 'typeorm';
import { Order, OrderSource, OrderStatus } from '../entities/order.entity';
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

 async findByExternalOrderId(
  provider: OrderSource,
  externalOrderId: string
) {
  return this.repo.findOne({
    where: {
      source:
        provider,
      externalOrderId
    },
    relations: {
      items: true,
      delivery: true,
    },
  });
}

  async createMarketplaceOrder(
    data: Partial<Order>
  ) {
    const order =
      this.repo.create(data);

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
        restaurant: true,
        customer: true,
        items: {
          product: true,
        },
        delivery: true,
        events: true,
      },
    });
  }

 async updateExternalStatus(
  orderId: number,
  externalStatus: string
) {
  await this.repo.update(
    { id: orderId },
    {
      externalStatus,
    }
  );

  return this.findById(
    orderId
  );
}

  async updateStatus(
    orderId: number,
    status: string
  ) {
    await this.repo.update(
      { id: orderId },
      {
        status: status as any,
      }
    );

    return this.getOrderWithDetails(
      orderId
    );
  }

 async markAccepted(
  orderId: number
) {
  await this.repo.update(
    { id: orderId },
    {
      status:
        OrderStatus.ACCEPTED,
      acceptedAt: new Date(),
    }
  );

  return this.findById(
    orderId
  );
}

  async markReady(
    orderId: number
  ) {
    await this.repo.update(
      { id: orderId },
      {
        status: OrderStatus.READY,
        readyAt: new Date(),
      }
    );
  }

  async markDelivered(
    orderId: number
  ) {
    await this.repo.update(
      { id: orderId },
      {
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
      }
    );
  }

  async listPendingSync() {
  return this.repo.find({
    where: {
      externalOrderId: IsNull(),
    },
    relations: {
      items: true,
    },
    order: {
      createdAt: 'ASC',
    },
  });
}

  async listByCustomer(
  customerId: number,
  limit = 20
) {
  return this.repo.find({
    where: {
      customerId,
    },
    relations: {
      items: true,
      delivery: true,
      customer: true,
    },
    order: {
      createdAt: 'DESC',
    },
    take: limit,
  });
}

  async listByRestaurant(
  restaurantId: number,
  limit = 50
) {
  return this.repo.find({
    where: {
      restaurantId,
    },
    relations: {
      delivery: true,
    },
    order: {
      createdAt: 'DESC',
    },
    take: limit,
  });
}

  async findByOrderNumber(
  orderNumber: string
) {
  return this.repo.findOne({
    where: {
      orderNumber,
    },
    relations: {
      items: true,
      delivery: true,
      customer: true,
    },
  });
}



}

