
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

import { Restaurant } from './restaurant.entity';
import { Customer } from './customer.entity';
import { IntegrationAccount } from './integrationaccount.entity';
import { OrderItem } from './orderitem.entity';
import { Delivery } from './delivery.entity';
import { OrderEvent } from './orderevent.entity';

export enum OrderSource {
  INTERNAL = 'Internal',
  UBER_EATS = 'UberEats',
  DELIVERY_HERO = 'DeliveryHero',
}

export enum OrderStatus {
  PENDING = 'Pending',
  ACCEPTED = 'Accepted',
  PREPARING = 'Preparing',
  READY = 'Ready',
  COURIER_ASSIGNED = 'CourierAssigned',
  PICKED_UP = 'PickedUp',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
}

export enum PaymentStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  REFUNDED = 'Refunded',
}

@Entity('Orders')
export class Order {
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
    name: 'IntegrationAccountId',
    type: 'int',
    nullable: true,
  })
  integrationAccountId?: number;

  @Column({
    name: 'CustomerId',
    type: 'int',
    nullable: true,
  })
  customerId?: number;

  @Column({
    name: 'OrderNumber',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  orderNumber!: string;

  @Column({
    name: 'Source',
    type: 'enum',
    enum: OrderSource,
    default: OrderSource.INTERNAL,
  })
  source!: OrderSource;

  @Column({
    name: 'ExternalOrderId',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  externalOrderId?: string;

  @Column({
    name: 'ExternalStoreId',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  externalStoreId?: string;

  @Column({
    name: 'ExternalStatus',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  externalStatus?: string;

  @Column({
    name: 'CustomerName',
    type: 'varchar',
    length: 200,
  })
  customerName!: string;

  @Column({
    name: 'Phone',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  phone?: string;

  @Column({
    name: 'Address',
    type: 'text',
    nullable: true,
  })
  address?: string;

  @Column({
    name: 'Notes',
    type: 'text',
    nullable: true,
  })
  notes?: string;

  @Column({
    name: 'Subtotal',
    type: 'numeric',
    precision: 18,
    scale: 2,
  })
  subtotal!: number;

  @Column({
    name: 'DeliveryFee',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  deliveryFee!: number;

  @Column({
    name: 'PlatformFee',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  platformFee!: number;

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
    name: 'Status',
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column({
    name: 'PaymentMethod',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  paymentMethod?: string;

  @Column({
    name: 'PaymentStatus',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @Column({
    name: 'AcceptedAt',
    type: 'timestamp',
    nullable: true,
  })
  acceptedAt?: Date;

  @Column({
    name: 'ReadyAt',
    type: 'timestamp',
    nullable: true,
  })
  readyAt?: Date;

  @Column({
    name: 'DeliveredAt',
    type: 'timestamp',
    nullable: true,
  })
  deliveredAt?: Date;

  @Column({
    name: 'CancelledAt',
    type: 'timestamp',
    nullable: true,
  })
  cancelledAt?: Date;

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
    restaurant => restaurant.orders
  )
  @JoinColumn({
    name: 'RestaurantId',
  })
  restaurant!: Restaurant;

  @ManyToOne(
    () => IntegrationAccount,
    integration => integration.orders,
    { 
      nullable: true,
    }
  )
  @JoinColumn({
    name: 'IntegrationAccountId',
  })
  integrationAccount?: IntegrationAccount;

  @ManyToOne(
    () => Customer,
    customer => customer.orders,
    {
      nullable: true,
    }
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
    () => Delivery,
    delivery => delivery.order,
    {
      cascade: true,
    }
  )
  delivery?: Delivery;

  @OneToMany(
    () => OrderEvent,
    event => event.order
  )
  events!: OrderEvent[];
}

