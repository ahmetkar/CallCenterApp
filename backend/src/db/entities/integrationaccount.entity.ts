
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Restaurant } from './restaurant.entity';

export enum IntegrationProvider {
  UBER_EATS = 'UberEats',
  DELIVERY_HERO = 'DeliveryHero',
}

@Entity('IntegrationAccounts')
export class IntegrationAccount {
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
    name: 'Provider',
    type: 'enum',
    enum: IntegrationProvider,
  })
  provider!: IntegrationProvider;

  @Column({
    name: 'ExternalStoreId',
    type: 'varchar',
    length: 100,
  })
  externalStoreId!: string;

  @Column({
    name: 'AccessToken',
    type: 'text',
    nullable: true,
  })
  accessToken?: string;

  @Column({
    name: 'RefreshToken',
    type: 'text',
    nullable: true,
  })
  refreshToken?: string;

  @Column({
    name: 'ApiKey',
    type: 'text',
    nullable: true,
  })
  apiKey?: string;

  @Column({
    name: 'SecretKey',
    type: 'text',
    nullable: true,
  })
  secretKey?: string;

  @Column({
    name: 'WebhookSecret',
    type: 'text',
    nullable: true,
  })
  webhookSecret?: string;

  @Column({
    name: 'ExpiresAt',
    type: 'timestamp',
    nullable: true,
  })
  expiresAt?: Date;

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

  @ManyToOne(
    () => Restaurant,
    restaurant => restaurant.integrations,
    {
      onDelete: 'CASCADE',
    }
  )
  @JoinColumn({
    name: 'RestaurantId',
  })
  restaurant!: Restaurant;
}

