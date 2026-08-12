
import { EntityManager } from 'typeorm';

import { Cargo } from '../entities/cargo.entity';
import { BaseRepository } from './base.repository';

export class CargoRepository extends BaseRepository<Cargo> {
  constructor(
    private manager?: EntityManager
  ) {
    super(Cargo);

    if (manager) {
      this.repository =
        manager.getRepository(Cargo);
    }
  }

  private generateTrackingNumber() {
    const random = Math.floor(
      100000000 + Math.random() * 900000000
    );

    return random.toString();
  }

  async createCargo(
    orderId: number
  ) {
    const cargo = this.repo.create({
      orderId,
      trackingNumber:
        this.generateTrackingNumber(),
      company:
        'Yurtiçi Kargo',
      status: 'Preparing',
    });

    return this.repo.save(cargo);
  }

  async getByOrderId(
    orderId: number
  ) {
    return this.repo.findOne({
      where: { orderId },
      relations: {
        order: {
          items: {
            product: true,
          },
          customer: true,
        },
      },
    });
  }

  async findByTrackingNumber(
    trackingNumber: string
  ) {
    return this.repo.findOne({
      where: {
        trackingNumber,
      },
      relations: {
        order: {
          items: {
            product: true,
          },
          customer: true,
        },
      },
    });
  }

  async updateStatus(
    orderId: number,
    status: string
  ) {
    await this.repo.update(
      { orderId },
      { status }
    );

    return this.getByOrderId(
      orderId
    );
  }

  async existsTrackingNumber(
    trackingNumber: string
  ) {
    const count =
      await this.repo.count({
        where: {
          trackingNumber,
        },
      });

    return count > 0;
  }
}

