import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Customer } from './customer.entity';
import { Cargo } from './cargo.entity';
import { OrderItem } from './order-item.entity';

@Entity('Orders')
export class Order {
  @PrimaryGeneratedColumn({
    name: 'Id',
    type: 'int',
  })
  id!: number;

  @Column({
    name: 'CustomerId',
    type: 'int',
    nullable: true,
  })
  customerId?: number;

  @Column({
    name: 'TotalPrice',
    type: 'numeric',
    precision: 18,
    scale: 2,
  })
  totalPrice!: number;

  @Column({
    name: 'CustomerName',
    type: 'varchar',
    length: 200,
  })
  customerName!: string;

  @Column({
    name: 'Address',
    type: 'text',
  })
  address!: string;

  @Column({
    name: 'Status',
    type: 'varchar',
    length: 50,
    default: 'Preparing',
  })
  status!: string;

  @Column({
    name: 'Notes',
    type: 'text',
    nullable: true,
  })
  notes?: string;

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
    () => Customer,
    customer => customer.orders
  )
  @JoinColumn({
    name: 'CustomerId',
  })
  customer?: Customer;

  @OneToMany(
    () => OrderItem,
    item => item.order,
    {
      cascade: true,
    }
  )
  items!: OrderItem[];

  @OneToOne(
    () => Cargo,
    cargo => cargo.order
  )
  cargo?: Cargo;
}