
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Restaurant } from './restaurant.entity';
import { OrderItem } from './orderitem.entity';

@Entity('Products')
export class Product {
  @PrimaryGeneratedColumn({
    name: 'Id',
    type: 'int',
  })
  id!: number;

  @Column({
    name: 'RestaurantId',
    type: 'int',
  })
  restaurantId!: number;

  @Column({
    name: 'Name',
    type: 'varchar',
    length: 255,
  })
  name!: string;

  @Column({
    name: 'Description',
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    name: 'Category',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  category?: string;

  @Column({
    name: 'ExternalProductId',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  externalProductId?: string;

  @Column({
    name: 'Sku',
    type: 'varchar',
    length: 100,
    nullable: true,
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
    name: 'PreparationTime',
    type: 'int',
    default: 10,
  })
  preparationTime!: number;

  @Column({
    name: 'IsActive',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @Column({
    name: 'IsAvailable',
    type: 'boolean',
    default: true,
  })
  isAvailable!: boolean;

  @Column({
    name: 'LastSyncedAt',
    type: 'timestamp',
    nullable: true,
  })
  lastSyncedAt?: Date;

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

  @ManyToOne(
    () => Restaurant,
    restaurant => restaurant.products,
    {
      onDelete: 'CASCADE',
    }
  )
  @JoinColumn({
    name: 'RestaurantId',
  })
  restaurant!: Restaurant;

  @OneToMany(
    () => OrderItem,
    item => item.product
  )
  orderItems!: OrderItem[];
}

