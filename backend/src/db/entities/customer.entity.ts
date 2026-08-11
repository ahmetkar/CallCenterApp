import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';

import { Order } from './order.entity';

@Entity('Customers')
export class Customer {
  @PrimaryGeneratedColumn({
    name: 'Id',
    type: 'int',
  })
  id!: number;

  @Column({
    name: 'FullName',
    type: 'varchar',
    length: 200,
  })
  fullName!: string;

  @Column({
    name: 'Phone',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  phone?: string;

  @Column({
    name: 'Email',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  email?: string;

  @Column({
    name: 'DefaultAddress',
    type: 'text',
    nullable: true,
  })
  defaultAddress?: string;

  @CreateDateColumn({
    name: 'CreatedAt',
    type: 'timestamp',
  })
  createdAt!: Date;

  @OneToMany(
    () => Order,
    (order) => order.customer
  )
  orders!: Order[];
}