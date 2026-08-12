import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { OrderItem } from './order-item.entity';

@Entity('Products')
export class Product {
  @PrimaryGeneratedColumn({
    name: 'Id',
    type: 'int',
  })
  id!: number;

  @Column({
    name: 'Name',
    type: 'varchar',
    length: 200,
  })
  name!: string;

  @Column({
    name: 'Description',
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    name: 'Sku',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  sku?: string;

  @Column({
    name: 'Barcode',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  barcode?: string;

  @Column({
    name: 'Price',
    type: 'numeric',
    precision: 18,
    scale: 2,
  })
  price!: number;

  @Column({
    name: 'Currency',
    type: 'varchar',
    length: 10,
    default: 'TRY',
  })
  currency!: string;

  @Column({
    name: 'Stock',
    type: 'int',
    default: 0,
  })
  stock!: number;

  @Column({
    name: 'IsActive',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @CreateDateColumn({
    name: 'CreatedAt',
    type: 'timestamp',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'UpdatedAt',
    type: 'timestamp',
  })
  updatedAt!: Date;

  @OneToMany(
    () => OrderItem,
    item => item.product
  )
  orderItems!: OrderItem[];
}