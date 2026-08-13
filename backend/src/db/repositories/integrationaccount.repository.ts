
import { EntityManager } from 'typeorm';

import {
  IntegrationAccount,
  IntegrationProvider,
} from '../entities/integrationaccount.entity';
import { BaseRepository } from './base.repository';

export class IntegrationAccountRepository extends BaseRepository<IntegrationAccount> {
  constructor(
    private manager?: EntityManager
  ) {
    super(IntegrationAccount);

    if (manager) {
      this.repository =
        manager.getRepository(
          IntegrationAccount
        );
    }
  }

  async findByRestaurant(
    restaurantId: number
  ) {
    return this.repo.find({
      where: {
        restaurantId,
        isActive: true,
      },
      order: {
        provider: 'ASC',
      },
    });
  }

  async findByProvider(
    restaurantId: number,
    provider: IntegrationProvider
  ) {
    return this.repo.findOne({
      where: {
        restaurantId,
        provider,
        isActive: true,
      },
    });
  }

  async findByExternalStoreId(
    provider: IntegrationProvider,
    externalStoreId: string
  ) {
    return this.repo.findOne({
      where: {
        provider,
        externalStoreId,
      },
      relations: {
        restaurant: true,
      },
    });
  }

  async updateTokens(
    accountId: number,
    data: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: Date;
    }
  ) {
    await this.repo.update(
      { id: accountId },
      {
        accessToken:
          data.accessToken,
        refreshToken:
          data.refreshToken,
        expiresAt:
          data.expiresAt,
      }
    );

    return this.findById(
      accountId
    );
  }

  async updateWebhookSecret(
    accountId: number,
    webhookSecret: string
  ) {
    await this.repo.update(
      { id: accountId },
      {
        webhookSecret,
      }
    );

    return this.findById(
      accountId
    );
  }

  async deactivate(
    accountId: number
  ) {
    await this.repo.update(
      { id: accountId },
      {
        isActive: false,
      }
    );

    return this.findById(
      accountId
    );
  }

  async activate(
    accountId: number
  ) {
    await this.repo.update(
      { id: accountId },
      {
        isActive: true,
      }
    );

    return this.findById(
      accountId
    );
  }

  async getExpiredTokens() {
    return this.repo
      .createQueryBuilder('i')
      .where(
        'i.expiresAt IS NOT NULL'
      )
      .andWhere(
        'i.expiresAt < NOW()'
      )
      .andWhere(
        'i.isActive = true'
      )
      .getMany();
  }
}

