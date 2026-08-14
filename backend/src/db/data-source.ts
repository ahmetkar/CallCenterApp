import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Product } from './entities/product.entity';
import { IntegrationAccount } from './entities/integrationaccount.entity';
import { OrderEvent } from './entities/orderevent.entity';
import { Delivery } from './entities/delivery.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/orderitem.entity';
import { Customer } from './entities/customer.entity';
import { Restaurant } from './entities/restaurant.entity';

import dotenv from 'dotenv';
dotenv.config();

export const AppDataSource =
  new DataSource({
    type: 'postgres',

    host:
      process.env.DB_HOST ||
      'localhost',

    port: Number(
      process.env.DB_PORT || 5432
    ),

    username:
      process.env.DB_USER ||
      'postgres',

    password:
      process.env.DB_PASSWORD ||
      '123456',

    database:
      process.env.DB_NAME ||
      'postgres',

    synchronize: false,

    logging: false,

    entities: [
      Restaurant,
      Customer,
      Order,
      OrderItem,
      Delivery,
      OrderEvent,
      IntegrationAccount,
      Product
    ],
   
  });

export async function initializeDatabase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();

    console.log(
      'Database connected'
    );
  }
}