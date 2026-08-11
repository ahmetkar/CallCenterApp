import { CargoRepository } from '../db/repositories/cargo.repository';

export class CargoService {
  private cargos =
    new CargoRepository();

  async checkCargoStatus(
    orderId: number
  ) {
    const cargo =
      await this.cargos.getByOrderId(
        orderId
      );

    if (!cargo) {
      throw new Error(
        'Kargo bulunamadı'
      );
    }

    return {
      orderId: cargo.orderId,
      trackingNumber:
        cargo.trackingNumber,
      company: cargo.company,
      cargoStatus: cargo.status,
      productName:
        cargo.order.product.name,
      customerName:
        cargo.order.customerName,
      address:
        cargo.order.address,
      estimatedDelivery:
        cargo.estimatedDelivery,
      createdAt:
        cargo.createdAt,
    };
  }

  async checkByTrackingNumber(
    trackingNumber: string
  ) {
    const cargo =
      await this.cargos.findByTrackingNumber(
        trackingNumber
      );

    if (!cargo) {
      throw new Error(
        'Kargo bulunamadı'
      );
    }

    return {
      orderId: cargo.orderId,
      trackingNumber:
        cargo.trackingNumber,
      company: cargo.company,
      cargoStatus: cargo.status,
      productName:
        cargo.order.product.name,
      customerName:
        cargo.order.customerName,
      address:
        cargo.order.address,
      estimatedDelivery:
        cargo.estimatedDelivery,
      createdAt:
        cargo.createdAt,
    };
  }

  async updateCargoStatus(
    orderId: number,
    status: string
  ) {
    const cargo =
      await this.cargos.updateStatus(
        orderId,
        status
      );

    if (!cargo) {
      throw new Error(
        'Kargo bulunamadı'
      );
    }

    return cargo;
  }
}