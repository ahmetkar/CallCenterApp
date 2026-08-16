import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Product } from './product.entity';
import { Order } from './order.entity';

@Entity('Restaurants')
export class Restaurant {
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
    name: 'Address',
    type: 'text',
    nullable: true,
  })
  address?: string;

  @Column({
    name: 'Currency',
    type: 'varchar',
    length: 10,
    default: 'TRY',
  })
  currency!: string;

  @Column({
    name: 'Timezone',
    type: 'varchar',
    length: 50,
    default: 'Europe/Istanbul',
  })
  timezone!: string;

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
    () => Product,
    product => product.restaurant
  )
  products!: Product[];

  @OneToMany(
    () => Order,
    order => order.restaurant
  )
  orders!: Order[];
}

