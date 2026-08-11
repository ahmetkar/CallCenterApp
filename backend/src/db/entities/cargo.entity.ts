import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Order } from './order.entity';

@Entity('Cargo')
export class Cargo {
  @PrimaryGeneratedColumn({
    name: 'Id',
    type: 'int',
  })
  id!: number;

  @Column({
    name: 'OrderId',
    type: 'int',
    unique: true,
  })
  orderId!: number;

  @Column({
    name: 'TrackingNumber',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  trackingNumber!: string;

  @Column({
    name: 'Company',
    type: 'varchar',
    length: 100,
    default: 'Yurtiçi Kargo',
  })
  company!: string;

  @Column({
    name: 'Status',
    type: 'varchar',
    length: 50,
    default: 'Preparing',
  })
  status!: string;

  @Column({
    name: 'EstimatedDelivery',
    type: 'timestamp',
    nullable: true,
  })
  estimatedDelivery?: Date;

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

  @OneToOne(
    () => Order,
    (order) => order.cargo,
    {
      onDelete: 'CASCADE',
    }
  )
  @JoinColumn({
    name: 'OrderId',
  })
  order!: Order;
}