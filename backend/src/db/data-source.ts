import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { Product } from './entities/product.entity';
import { Customer } from './entities/customer.entity';
import { Order } from './entities/order.entity';
import { Cargo } from './entities/cargo.entity';

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
      Product,
      Customer,
      Order,
      Cargo,
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