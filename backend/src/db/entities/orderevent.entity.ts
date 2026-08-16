
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

import { Order } from './order.entity';

@Entity('OrderEvents')
export class OrderEvent {
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
    name: 'Provider',
    type: 'varchar',
    length: 30,
  })
  provider!: string;

  @Column({
    name: 'EventType',
    type: 'varchar',
    length: 100,
  })
  eventType!: string;

  @Column({
    name: 'ExternalEventId',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  externalEventId?: string;

  @Column({
    name: 'Payload',
    type: 'jsonb',
  })
  payload!: Record<string, any>;

  @Column({
    name: 'Processed',
    type: 'boolean',
    default: false,
  })
  processed!: boolean;

  @Column({
    name: 'ProcessedAt',
    type: 'timestamp',
    nullable: true,
  })
  processedAt?: Date;

  @Column({
    name: 'ErrorMessage',
    type: 'text',
    nullable: true,
  })
  errorMessage?: string | null;

  @CreateDateColumn({
    name: 'CreatedAt',
    type: 'timestamp',
  })
  createdAt!: Date;

  @ManyToOne(
    () => Order,
    order => order.events,
    {
      onDelete: 'CASCADE',
    }
  )
  @JoinColumn({
    name: 'OrderId',
  })
  order!: Order;
}

