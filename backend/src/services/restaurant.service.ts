
import { RestaurantRepository } from '../db/repositories/restaurant.repository';

export class RestaurantService {
  private restaurants =
    new RestaurantRepository();

  async listRestaurants() {
    const result =
      await this.restaurants.listActive();

    return result.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      currency: r.currency,
      timezone: r.timezone,
      isActive: r.isActive,
    }));
  }

  async getRestaurant(
    restaurantId: number
  ) {
    const restaurant =
      await this.restaurants.getWithIntegrations(
        restaurantId
      );

    if (!restaurant) {
      throw new Error(
        'Restoran bulunamadı'
      );
    }

    return {
      id: restaurant.id,
      name: restaurant.name,
      phone: restaurant.phone,
      address: restaurant.address,
      currency:
        restaurant.currency,
      timezone:
        restaurant.timezone,
      isActive:
        restaurant.isActive
    };
  }

  async activateRestaurant(
    restaurantId: number
  ) {
    return this.restaurants.activate(
      restaurantId
    );
  }

  async deactivateRestaurant(
    restaurantId: number
  ) {
    return this.restaurants.deactivate(
      restaurantId
    );
  }
}
