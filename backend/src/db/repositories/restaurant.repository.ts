
import { EntityManager } from 'typeorm';

import { Restaurant } from '../entities/restaurant.entity';
import { BaseRepository } from './base.repository';

export class RestaurantRepository extends BaseRepository<Restaurant> {
  constructor(
    private manager?: EntityManager
  ) {
    super(Restaurant);

    if (manager) {
      this.repository =
        manager.getRepository(Restaurant);
    }
  }

  async listActive() {
    return this.repo.find({
      where: {
        isActive: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async getWithIntegrations(
    restaurantId: number
  ) {
    return this.repo.findOne({
      where: {
        id: restaurantId,
      }
    });
  }

  async getWithProducts(
    restaurantId: number
  ) {
    return this.repo.findOne({
      where: {
        id: restaurantId,
      },
      relations: {
        products: true,
      },
    });
  }

  async deactivate(
    restaurantId: number
  ) {
    await this.repo.update(
      { id: restaurantId },
      {
        isActive: false,
      }
    );

    return this.findById(
      restaurantId
    );
  }

  async activate(
    restaurantId: number
  ) {
    await this.repo.update(
      { id: restaurantId },
      {
        isActive: true,
      }
    );

    return this.findById(
      restaurantId
    );
  }
}

