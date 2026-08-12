import { QueryRunner } from 'typeorm';

import { AppDataSource } from '../db/data-source';

import { ProductRepository } from '../db/repositories/product.repository';
import { CustomerRepository } from '../db/repositories/customer.repository';
import { OrderRepository } from '../db/repositories/order.repository';
import { CargoRepository } from '../db/repositories/cargo.repository';

export class OrderService {
  async createOrder(data: {
    customerName: string;
    address: string;
    notes?: string;
    items: Array<{
      productName: string;
      quantity: number;
    }>;
  }) {
    const queryRunner =
      AppDataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const productRepo =
        new ProductRepository(
          queryRunner.manager
        );

      const customerRepo =
        new CustomerRepository(
          queryRunner.manager
        );

      const orderRepo =
        new OrderRepository(
          queryRunner.manager
        );

      const cargoRepo =
        new CargoRepository(
          queryRunner.manager
        );

      const customer =
        await customerRepo.findOrCreate(
          {
            fullName:
              data.customerName,
            defaultAddress:
              data.address,
          }
        );

      const orderItems: Array<{
        productId: number;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [];

      let orderTotal = 0;

      for (const item of data.items) {
        const product =
          await productRepo.getExact(
            item.productName
          );

        if (!product) {
          throw new Error(
            `Ürün bulunamadı: ${item.productName}`
          );
        }

        await productRepo.decreaseStock(
          product.id,
          item.quantity
        );

        const unitPrice =
          Number(product.price);

        const totalPrice =
          unitPrice *
          item.quantity;

        orderTotal += totalPrice;

        orderItems.push({
          productId:
            product.id,
          quantity:
            item.quantity,
          unitPrice,
          totalPrice,
        });
      }

            const order =
        await orderRepo.createOrder({
          customerId: customer.id,
          customerName: data.customerName,
          address: data.address,
          totalPrice: orderTotal,
          notes: data.notes,
          items: orderItems,
        });

      const cargo =
        await cargoRepo.createCargo(
          order.id
        );

      // İlişkileri yükle
      const savedOrder =
        await orderRepo.getOrderWithDetails(
          order.id
        );

      if (!savedOrder) {
        throw new Error(
          'Sipariş kaydedildi ancak tekrar yüklenemedi'
        );
      }

      await queryRunner.commitTransaction();

  return {
    success: true,
    orderId: savedOrder.id,
    customerName:
      savedOrder.customerName,
    address:
      savedOrder.address,
    totalPrice: Number(
      savedOrder.totalPrice
    ),
    items: savedOrder.items.map(
      item => ({
        productId:
          item.productId,
        productName:
          item.product.name,
        quantity:
          item.quantity,
        unitPrice:
          Number(
            item.unitPrice
          ),
        totalPrice:
          Number(
            item.totalPrice
          ),
      })
    ),
    cargoTracking:
      cargo.trackingNumber,
    cargoCompany:
      cargo.company,
    status:
      savedOrder.status,
  };


    } catch (err) {
      console.error(
        'ORDER SERVICE ERROR:',
        err
      );

      if (
        queryRunner.isTransactionActive
      ) {
        await queryRunner.rollbackTransaction();
      }

      throw err;
    } finally {
      if (
        !queryRunner.isReleased
      ) {
        await queryRunner.release();
      }
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
      customerName:
        order.customerName,
      address: order.address,
      totalPrice: Number(
        order.totalPrice
      ),
      status: order.status,
      createdAt:
        order.createdAt,
      items: order.items.map(
        item => ({
          productName:
            item.product.name,
          quantity:
            item.quantity,
          unitPrice:
            Number(
              item.unitPrice
            ),
          totalPrice:
            Number(
              item.totalPrice
            ),
        })
      ),
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

