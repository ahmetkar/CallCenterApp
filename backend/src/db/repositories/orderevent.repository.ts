
import { EntityManager } from 'typeorm';

import { OrderEvent } from '../entities/orderevent.entity';
import { BaseRepository } from './base.repository';

export class OrderEventRepository extends BaseRepository<OrderEvent> {
  constructor(
    private manager?: EntityManager
  ) {
    super(OrderEvent);

    if (manager) {
      this.repository =
        manager.getRepository(OrderEvent);
    }
  }

  async findByExternalEventId(
    externalEventId: string
  ) {
    return this.repo.findOne({
      where: {
        externalEventId,
      },
    });
  }

  async createEvent(data: {
    orderId: number;
    provider: string;
    eventType: string;
    externalEventId?: string;
    payload: Record<string, any>;
  }) {
    if (
      data.externalEventId
    ) {
      const exists =
        await this.findByExternalEventId(
          data.externalEventId
        );

      if (exists) {
        return exists;
      }
    }

    const event =
      this.repo.create({
        orderId: data.orderId,
        provider: data.provider,
        eventType:
          data.eventType,
        externalEventId:
          data.externalEventId,
        payload: data.payload,
        processed: false,
      });

    return this.repo.save(
      event
    );
  }

  async markProcessed(
    eventId: number
  ) {
    await this.repo.update(
      { id: eventId },
      {
        processed: true,
        processedAt:
          new Date(),
        errorMessage: null,
      }
    );
  }

  async markFailed(
    eventId: number,
    error: string
  ) {
    await this.repo.update(
      { id: eventId },
      {
        processed: false,
        errorMessage: error,
      }
    );
  }

  async listUnprocessed(
    limit = 100
  ) {
    return this.repo.find({
      where: {
        processed: false,
      },
      order: {
        createdAt: 'ASC',
      },
      take: limit,
    });
  }

  async listByOrder(
    orderId: number
  ) {
    return this.repo.find({
      where: { orderId },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async replayEvent(
    externalEventId: string
  ) {
    return this.repo.findOne({
      where: {
        externalEventId,
      },
    });
  }
}

