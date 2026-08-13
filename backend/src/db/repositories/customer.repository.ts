
import {
  EntityManager,
  ILike,
} from 'typeorm';

import { Customer } from '../entities/customer.entity';
import { BaseRepository } from './base.repository';

export class CustomerRepository extends BaseRepository<Customer> {
  constructor(
    private manager?: EntityManager
  ) {
    super(Customer);

    if (manager) {
      this.repository =
        manager.getRepository(Customer);
    }
  }

  async findByPhone(
    phone?: string
  ) {
    if (!phone) {
      return null;
    }

    return this.repo.findOne({
      where: {
        phone,
      },
    });
  }

  async findOrCreate(data: {
    fullName: string;
    phone?: string;
    email?: string;
    defaultAddress?: string;
    source?: string;
  }) {
    let customer =
      await this.findByPhone(
        data.phone
      );

    if (!customer) {
      customer =
        await this.repo.findOne({
          where: {
            fullName: ILike(
              data.fullName
            ),
          },
        });
    }

    if (customer) {
      customer.fullName =
        data.fullName;

      if (data.phone) {
        customer.phone =
          data.phone;
      }

      if (data.email) {
        customer.email =
          data.email;
      }

      if (
        data.defaultAddress
      ) {
        customer.defaultAddress =
          data.defaultAddress;
      }

      customer.lastOrderSource =
        data.source;

      customer.totalOrders +=
        1;

      return this.repo.save(
        customer
      );
    }

    customer =
      this.repo.create({
        fullName:
          data.fullName,
        phone: data.phone,
        email: data.email,
        defaultAddress:
          data.defaultAddress,
        lastOrderSource:
          data.source,
        totalOrders: 1,
        isActive: true,
      });

    return this.repo.save(
      customer
    );
  }

  async search(
    keyword: string
  ) {
    return this.repo.find({
      where: [
        {
          fullName: ILike(
            `%${keyword}%`
          ),
        },
        {
          phone: ILike(
            `%${keyword}%`
          ),
        },
      ],
      take: 20,
      order: {
        fullName: 'ASC',
      },
    });
  }

  async updateAddress(
    customerId: number,
    address: string
  ) {
    await this.repo.update(
      { id: customerId },
      {
        defaultAddress:
          address,
      }
    );

    return this.findById(
      customerId
    );
  }
}

