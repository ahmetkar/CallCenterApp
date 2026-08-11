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
    const date = Date.now();

    const random = Math.floor(
      Math.random() * 100000
    );

    return `TRK-${date}-${random}`;
  }

  async createCargo(
    orderId: number
  ) {
    return this.create({
      orderId,
      trackingNumber:
        this.generateTrackingNumber(),
      company:
        'Yurtiçi Kargo',
      status: 'Preparing',
    });
  }

  async getByOrderId(
    orderId: number
  ) {
    return this.repo.findOne({
      where: { orderId },
      relations: {
        order: {
          product: true,
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
          product: true,
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
}