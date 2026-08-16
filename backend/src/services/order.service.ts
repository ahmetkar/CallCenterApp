
import { randomInt, randomUUID } from 'crypto';
import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../db/data-source';

import {OrderSource,OrderStatus} from '../db/entities/order.entity';

import { DeliveryProvider } from '../db/entities/delivery.entity';

import { RestaurantRepository } from '../db/repositories/restaurant.repository';

import { ProductRepository } from '../db/repositories/product.repository';
import { CustomerRepository } from '../db/repositories/customer.repository';
import { OrderRepository } from '../db/repositories/order.repository';
import { OrderItemRepository } from '../db/repositories/orderitem.repository';
import { DeliveryRepository } from '../db/repositories/delivery.repository';
import { OrderEventRepository } from '../db/repositories/orderevent.repository';



export interface CreateOrderDto {
  restaurantId: number;
  provider: OrderSource;
  customer: {
    name: string;
    phone?: string;
    address?: string;
    email?: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
    notes?: string;
    modifiers?: Record<string, any>;
  }>;
  notes?: string;
}

export class OrderService {
  private restaurants = new RestaurantRepository();

  private generateOrderNumber() {
   
    const uniquePart = randomInt(100000)*100 + 10000;

    return `${uniquePart}`;
  }


  async createOrder(dto: CreateOrderDto) {
    const queryRunner: QueryRunner =
      AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const restaurant =
        await this.restaurants.findById(
          dto.restaurantId
        );

      if (!restaurant) {
        throw new Error('Restoran bulunamadı');
      }

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

      const itemRepo =
        new OrderItemRepository(
          queryRunner.manager
        );

      const deliveryRepo =
        new DeliveryRepository(
          queryRunner.manager
        );

      const eventRepo =
        new OrderEventRepository(
          queryRunner.manager
        );

     

      const validatedItems: Array<{
        product: any;
        quantity: number;
        notes?: string;
        modifiers?: Record<string, any>;
        totalPrice: number;
      }> = [];

      let subtotal = 0;

      for (const item of dto.items) {
        const product =
          await productRepo.getExact(
            dto.restaurantId,
            item.productName
          );

        if (!product) {
          throw new Error(
            `${item.productName} bulunamadı`
          );
        }

        if (
          !product.isActive ||
          !product.isAvailable
        ) {
          throw new Error(
            `${product.name} satışa kapalı`
          );
        }

        if (
          product.stock < item.quantity
        ) {
          throw new Error(
            `${product.name} için yetersiz stok`
          );
        }

        const totalPrice =
          Number(product.price) *
          item.quantity;

        subtotal += totalPrice;

        validatedItems.push({
          product,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers,
          totalPrice,
        });
      }

      const customer =
        await customerRepo.findOrCreate({
          fullName:
            dto.customer.name,
          phone:
            dto.customer.phone,
          email:
            dto.customer.email,
          defaultAddress:
            dto.customer.address,
          source: dto.provider,
        });

      const order =
        await orderRepo.createMarketplaceOrder({
          restaurantId:
            dto.restaurantId,
          customerId:
            customer.id,
          orderNumber:
            this.generateOrderNumber(),
          source: dto.provider,
          customerName:
            dto.customer.name,
          phone:
            dto.customer.phone,
          address:
            dto.customer.address,
          subtotal,
          deliveryFee: 0,
          platformFee: 0,
          discountAmount: 0,
          taxAmount: 0,
          totalPrice: subtotal,
          currency:
            restaurant.currency,
          status: OrderStatus.PENDING,
          notes: dto.notes,
        });

      const platformItems: any[] = [];

      for (const item of validatedItems) {
        await itemRepo.create({
          orderId: order.id,
          productId: item.product.id,
          externalProductId:
            item.product.externalProductId,
          productName:
            item.product.name,
          quantity: item.quantity,
          unitPrice: Number(
            item.product.price
          ),
          totalPrice: item.totalPrice,
          currency:
            item.product.currency,
          modifiers:
            item.modifiers,
          notes: item.notes,
        });

   
        item.product.stock -= item.quantity;

        await queryRunner.manager.save(
          item.product
        );

        platformItems.push(item);
      }
    
      await deliveryRepo.createDelivery({
          orderId: order.id,
          provider:
            DeliveryProvider.INTERNAL,
        });

      await eventRepo.createEvent({
        orderId: order.id,
        provider: dto.provider,
        eventType: 'order.created',
        payload: dto as any,
      });


      await queryRunner.commitTransaction();
       return {
        success: true,
        orderId: order.id,
        orderNumber:
          order.orderNumber,
        provider: dto.provider,
      };

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async checkOrderStatus(
    orderNumber: string
  ) {
    const orderRepo =
      new OrderRepository();

    const order =
      await orderRepo.findByOrderNumber(
        orderNumber
      );

    if (!order) {
      throw new Error(
        'Sipariş bulunamadı'
      );
    }

    return {
      orderId: order.id,
      orderNumber:
        order.orderNumber,
      source: order.source,
      status: order.status,
      externalStatus:
        order.externalStatus,
      customerName:
        order.customerName,
      phone: order.phone,
      address: order.address,
      subtotal: Number(
        order.subtotal
      ),
      totalPrice: Number(
        order.totalPrice
      ),
      items: order.items.map(
        item => ({
          productName:
            item.productName,
          quantity:
            item.quantity,
          unitPrice: Number(
            item.unitPrice
          ),
          totalPrice: Number(
            item.totalPrice
          ),
        })
      ),
      delivery: order.delivery
        ? {
            provider:
              order.delivery.provider,
            status:
              order.delivery.status,
            courierName:
              order.delivery
                .courierName,
            courierPhone:
              order.delivery
                .courierPhone,
            trackingUrl:
              order.delivery
                .trackingUrl,
          }
        : null,
      createdAt:
        order.createdAt,
    };
  }

  async updateOrderStatus(
    orderId: number,
    status: OrderStatus
  ) {
    const orderRepo =
      new OrderRepository();

    return orderRepo.updateStatus(
      orderId,
      status
    );
  }

  async acceptOrder(
    orderNumber: string
  ) {
    const orderRepo =
      new OrderRepository();

    const order =
      await orderRepo.findByOrderNumber(
        orderNumber
      );

    if (!order) {
      throw new Error(
        'Sipariş bulunamadı'
      );
    }

    await orderRepo.markAccepted(
      order.id
    );

    return this.checkOrderStatus(
      orderNumber
    );
  }

  async markReady(
    orderNumber: string
  ) {
    const orderRepo =
      new OrderRepository();

    const order =
      await orderRepo.findByOrderNumber(
        orderNumber
      );

    if (!order) {
      throw new Error(
        'Sipariş bulunamadı'
      );
    }

    await orderRepo.markReady(
      order.id
    );

    return this.checkOrderStatus(
      orderNumber
    );
  }

  async markDelivered(
    orderNumber: string
  ) {
    const orderRepo =
      new OrderRepository();

    const order =
      await orderRepo.findByOrderNumber(
        orderNumber
      );

    if (!order) {
      throw new Error(
        'Sipariş bulunamadı'
      );
    }

    await orderRepo.markDelivered(
      order.id
    );

    return this.checkOrderStatus(
      orderNumber
    );
  }

  async listRestaurantOrders(
    restaurantId: number
  ) {
    const orderRepo =
      new OrderRepository();

    return orderRepo.listByRestaurant(
      restaurantId
    );
  }

  async findByOrderNumber(
    orderNumber: string
  ) {
    const orderRepo =
      new OrderRepository();

    const order =
      await orderRepo.findByOrderNumber(
        orderNumber
      );

    if (!order) {
      throw new Error(
        'Sipariş bulunamadı'
      );
    }

    return order;
  }


  async cancelOrder(
    orderNumber: string
  ) {
    const queryRunner =
      AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepo =
        new OrderRepository(
          queryRunner.manager
        );

      const itemRepo =
        new OrderItemRepository(
          queryRunner.manager
        );

      const productRepo =
        new ProductRepository(
          queryRunner.manager
        );

      const eventRepo =
        new OrderEventRepository(
          queryRunner.manager
        );

      const order =
        await orderRepo.findByOrderNumber(
          orderNumber
        );

      if (!order) {
        throw new Error(
          'Sipariş bulunamadı'
        );
      }

      if (
        order.status ===
          OrderStatus.DELIVERED ||
        order.status ===
          OrderStatus.CANCELLED
      ) {
        throw new Error(
          'Bu sipariş iptal edilemez'
        );
      }

      const items =
        await itemRepo.listByOrder(
          order.id
        );

      for (const item of items) {
        const product =
          await productRepo.findById(
            item.productId
          );

        if (product) {
          product.stock +=
            item.quantity;

          await queryRunner.manager.save(
            product
          );
        }
      }

      await orderRepo.updateStatus(
        order.id,
        OrderStatus.CANCELLED
      );

      await eventRepo.createEvent({
        orderId: order.id,
        provider: order.source,
        eventType:
          'order.cancelled',
        payload: {
          orderNumber,
        },
      });

      await queryRunner.commitTransaction();

      return {
        success: true,
        orderNumber,
        status:
          OrderStatus.CANCELLED,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async modifyOrder(
    orderNumber: string,
    changes: {
      addItems?: Array<{
        productName: string;
        quantity: number;
        notes?: string;
      }>;
      notes?: string;
    }
  ) {
    const queryRunner =
      AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepo =
        new OrderRepository(
          queryRunner.manager
        );

      const itemRepo =
        new OrderItemRepository(
          queryRunner.manager
        );

      const productRepo =
        new ProductRepository(
          queryRunner.manager
        );

      const eventRepo =
        new OrderEventRepository(
          queryRunner.manager
        );

      const order =
        await orderRepo.findByOrderNumber(
          orderNumber
        );

      if (!order) {
        throw new Error(
          'Sipariş bulunamadı'
        );
      }

      if (
        order.status !==
        OrderStatus.PENDING
      ) {
        throw new Error(
          'Sipariş artık değiştirilemez'
        );
      }

      if (
        changes.notes !==
        undefined
      ) {
        order.notes =
          changes.notes;

        await queryRunner.manager.save(
          order
        );
      }

      if (changes.addItems) {
        for (const item of changes.addItems) {
          const product =
            await productRepo.getExact(
              order.restaurantId,
              item.productName
            );

          if (!product) {
            throw new Error(
              `${item.productName} bulunamadı`
            );
          }

          if (
            product.stock <
            item.quantity
          ) {
            throw new Error(
              `${product.name} için yetersiz stok`
            );
          }

          product.stock -=
            item.quantity;

          await queryRunner.manager.save(
            product
          );

          await itemRepo.create({
            orderId: order.id,
            productId:
              product.id,
            externalProductId:
              product.externalProductId,
            productName:
              product.name,
            quantity:
              item.quantity,
            unitPrice: Number(
              product.price
            ),
            totalPrice:
              Number(
                product.price
              ) * item.quantity,
            currency:
              product.currency,
            notes: item.notes,
          });
        }
      }

      const total =
        await itemRepo.getOrderTotal(
          order.id
        );

      order.subtotal = total;
      order.totalPrice =
        total +
        Number(
          order.deliveryFee
        );

      await queryRunner.manager.save(
        order
      );

      await eventRepo.createEvent({
        orderId: order.id,
        provider:
          order.source,
        eventType:
          'order.modified',
        payload: changes,
      });

      await queryRunner.commitTransaction();

      return this.checkOrderStatus(
        orderNumber
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async repeatLastOrder(
    customerId: number
  ) {
    const orderRepo =
      new OrderRepository();

    const orders =
      await orderRepo.listByCustomer(
        customerId,
        1
      );

    if (
      orders.length === 0
    ) {
      throw new Error(
        'Geçmiş sipariş bulunamadı'
      );
    }

    const last =
      orders[0];

    return this.createOrder({
      restaurantId:
        last.restaurantId,
      provider:
        last.source,
      customer: {
        name:
          last.customerName,
        phone:
          last.phone,
        address:
          last.address,
        email:
          last.customer?.email,
      },
      items: last.items.map(
        item => ({
          productName:
            item.productName,
          quantity:
            item.quantity,
          notes: item.notes,
        })
      ),
      notes: last.notes,
    });
  }

  async listCustomerOrders(
    customerId: number
  ) {
    const orderRepo =
      new OrderRepository();

    return orderRepo.listByCustomer(
      customerId
    );
  }

  async getOrderTimeline(
    orderNumber: string
  ) {
    const orderRepo =
      new OrderRepository();

    const eventRepo =
      new OrderEventRepository();

    const order =
      await orderRepo.findByOrderNumber(
        orderNumber
      );

    if (!order) {
      throw new Error(
        'Sipariş bulunamadı'
      );
    }

    const events =
      await eventRepo.listByOrder(
        order.id
      );

    return events.map(
      event => ({
        eventType:
          event.eventType,
        createdAt:
          event.createdAt,
        payload:
          event.payload,
      })
    );
  }
}

