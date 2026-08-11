import { QueryRunner } from 'typeorm';

import { AppDataSource } from '../db/data-source';

import { ProductRepository } from '../db/repositories/product.repository';
import { CustomerRepository } from '../db/repositories/customer.repository';
import { OrderRepository } from '../db/repositories/order.repository';
import { CargoRepository } from '../db/repositories/cargo.repository';

export class OrderService {
  async createOrder(data: {
    productName: string;
    quantity: number;
    customerName: string;
    address: string;
  }) {
    const queryRunner: QueryRunner =
      AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productRepo =
        new ProductRepository();

      const customerRepo =
        new CustomerRepository();

      const orderRepo =
        new OrderRepository(
          queryRunner.manager
        );

      const cargoRepo =
        new CargoRepository(
          queryRunner.manager
        );

      const product =
        await productRepo.getExact(
          data.productName
        );

      if (!product) {
        throw new Error(
          'Ürün bulunamadı'
        );
      }

      if (
        product.stock < data.quantity
      ) {
        throw new Error(
          'Yetersiz stok'
        );
      }

      const customer =
        await customerRepo.findOrCreate(
          {
            fullName:
              data.customerName,
            defaultAddress:
              data.address,
          }
        );

      product.stock -= data.quantity;

      await queryRunner.manager.save(
        product
      );

      const unitPrice =
        Number(product.price);

      const totalPrice =
        unitPrice *
        data.quantity;

      const order =
        await orderRepo.createOrder(
          {
            customerId:
              customer.id,
            productId: product.id,
            quantity:
              data.quantity,
            unitPrice,
            totalPrice,
            customerName:
              data.customerName,
            address:
              data.address,
          }
        );

      const cargo =
        await cargoRepo.createCargo(
          order.id
        );

      await queryRunner.commitTransaction();

      return {
        success: true,
        orderId: order.id,
        productName:
          product.name,
        quantity:
          order.quantity,
        unitPrice,
        totalPrice,
        customerName:
          order.customerName,
        address:
          order.address,
        cargoTracking:
          cargo.trackingNumber,
        cargoCompany:
          cargo.company,
        status: order.status,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();

      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async checkOrderStatus(
    orderId: number
  ) {
    const orderRepo =
      new OrderRepository();

    const order =
      await orderRepo.getOrderWithDetails(
        orderId
      );

    if (!order) {
      throw new Error(
        'Sipariş bulunamadı'
      );
    }

    return {
      orderId: order.id,
      productName:
        order.product.name,
      quantity: order.quantity,
      unitPrice: Number(
        order.unitPrice
      ),
      totalPrice: Number(
        order.totalPrice
      ),
      customerName:
        order.customerName,
      address: order.address,
      status: order.status,
      createdAt:
        order.createdAt,
      cargo: order.cargo
        ? {
            trackingNumber:
              order.cargo
                .trackingNumber,
            company:
              order.cargo.company,
            status:
              order.cargo.status,
          }
        : null,
    };
  }

  async updateOrderStatus(
    orderId: number,
    status: string
  ) {
    const orderRepo =
      new OrderRepository();

    const order =
      await orderRepo.updateStatus(
        orderId,
        status
      );

    if (!order) {
      throw new Error(
        'Sipariş bulunamadı'
      );
    }

    return order;
  }

  async listLatestOrders() {
    const orderRepo =
      new OrderRepository();

    return orderRepo.listLatest();
  }
}