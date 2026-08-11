import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Product } from './product.entity';
import { Customer } from './customer.entity';
import { Cargo } from './cargo.entity';

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
    () => Product,
    (product) => product.orders
  )
  @JoinColumn({
    name: 'ProductId',
  })
  product!: Product;

  @ManyToOne(
    () => Customer,
    (customer) => customer.orders
  )
  @JoinColumn({
    name: 'CustomerId',
  })
  customer?: Customer;

  @OneToOne(
    () => Cargo,
    (cargo) => cargo.order
  )
  cargo?: Cargo;
}