
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

export enum DeliveryProvider {
  INTERNAL = 'Internal',
  UBER_EATS = 'UberEats',
  DELIVERY_HERO = 'DeliveryHero',
}

export enum DeliveryStatus {
  PENDING = 'Pending',
  ASSIGNED = 'Assigned',
  PICKED_UP = 'PickedUp',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
}

@Entity('Deliveries')
export class Delivery {
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
    name: 'Provider',
    type: 'enum',
    enum: DeliveryProvider,
  })
  provider!: DeliveryProvider;

  @Column({
    name: 'ExternalDeliveryId',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  externalDeliveryId?: string;

  @Column({
    name: 'CourierName',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  courierName?: string;

  @Column({
    name: 'CourierPhone',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  courierPhone?: string;

  @Column({
    name: 'Status',
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status!: DeliveryStatus;

  @Column({
    name: 'TrackingUrl',
    type: 'text',
    nullable: true,
  })
  trackingUrl?: string;

  @Column({
    name: 'EstimatedPickupTime',
    type: 'timestamp',
    nullable: true,
  })
  estimatedPickupTime?: Date;

  @Column({
    name: 'EstimatedDeliveryTime',
    type: 'timestamp',
    nullable: true,
  })
  estimatedDeliveryTime?: Date;

  @Column({
    name: 'PickedUpAt',
    type: 'timestamp',
    nullable: true,
  })
  pickedUpAt?: Date;

  @Column({
    name: 'DeliveredAt',
    type: 'timestamp',
    nullable: true,
  })
  deliveredAt?: Date;

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
    order => order.delivery,
    {
      onDelete: 'CASCADE',
    }
  )
  @JoinColumn({
    name: 'OrderId',
  })
  order!: Order;
}

