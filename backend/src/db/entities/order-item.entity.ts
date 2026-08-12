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
  })
  productId!: number;

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
    name: 'TotalPrice',
    type: 'numeric',
    precision: 18,
    scale: 2,
  })
  totalPrice!: number;

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
    product => product.orderItems
  )
  @JoinColumn({
    name: 'ProductId',
  })
  product!: Product;
}