
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Order } from './order.entity';
import { Product } from './product.entity';

@Entity('OrderItems')
export class OrderItem {
  @PrimaryGeneratedColumn({
    name: 'Id',
    type: 'int',
  })
  id!: number;

  @Column({
    name: 'OrderId',
    type: 'int',
  })
  orderId!: number;

  @Column({
    name: 'ProductId',
    type: 'int',
    nullable: true,
  })
  productId: number = 0;

  @Column({
    name: 'ExternalProductId',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  externalProductId?: string;

  @Column({
    name: 'ProductName',
    type: 'varchar',
    length: 255,
  })
  productName!: string;

  @Column({
    name: 'Quantity',
    type: 'int',
  })
  quantity!: number;

  @Column({
    name: 'UnitPrice',
    type: 'numeric',
    precision: 18,
    scale: 2,
  })
  unitPrice!: number;

  @Column({
    name: 'DiscountAmount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  discountAmount!: number;

  @Column({
    name: 'TaxAmount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  taxAmount!: number;

  @Column({
    name: 'TotalPrice',
    type: 'numeric',
    precision: 18,
    scale: 2,
  })
  totalPrice!: number;

  @Column({
    name: 'Currency',
    type: 'varchar',
    length: 10,
    default: 'TRY',
  })
  currency!: string;

  @Column({
    name: 'Modifiers',
    type: 'jsonb',
    nullable: true,
  })
  modifiers?: Record<string, any>;

  @Column({
    name: 'Notes',
    type: 'text',
    nullable: true,
  })
  notes?: string;

  @ManyToOne(
    () => Order,
    order => order.items,
    {
      onDelete: 'CASCADE',
    }
  )
  @JoinColumn({
    name: 'OrderId',
  })
  order!: Order;

  @ManyToOne(
    () => Product,
    product => product.orderItems,
    {
      nullable: true,
      onDelete: 'SET NULL',
    }
  )
  @JoinColumn({
    name: 'ProductId',
  })
  product?: Product;
}

