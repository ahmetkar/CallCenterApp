
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

  async findOrCreate(data: {
    fullName: string;
    defaultAddress: string;
    phone?: string;
    email?: string;
  }) {
    let customer =
      await this.repo.findOne({
        where: {
          fullName: ILike(
            data.fullName
          ),
        },
      });

    if (customer) {
      return customer;
    }

    customer =
      this.repo.create({
        fullName:
          data.fullName,
        defaultAddress:
          data.defaultAddress,
        phone: data.phone,
        email: data.email,
      });

    return this.repo.save(customer);
  }

  async search(
    keyword: string
  ) {
    return this.repo.find({
      where: {
        fullName: ILike(
          `%${keyword}%`
        ),
      },
      order: {
        fullName: 'ASC',
      },
      take: 20,
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

