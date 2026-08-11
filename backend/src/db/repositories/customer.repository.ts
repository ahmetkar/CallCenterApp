import { ILike } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { BaseRepository } from './base.repository';

export class CustomerRepository extends BaseRepository<Customer> {
  constructor() {
    super(Customer);
  }

  async findByName(
    fullName: string
  ) {
    return this.repo.findOne({
      where: {
        fullName: ILike(
          fullName
        ),
      },
    });
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
      take: 20,
    });
  }

  async createCustomer(data: {
    fullName: string;
    phone?: string;
    email?: string;
    defaultAddress?: string;
  }) {
    return this.create(data);
  }

  async findOrCreate(data: {
    fullName: string;
    phone?: string;
    email?: string;
    defaultAddress?: string;
  }) {
    const existing =
      await this.findByName(
        data.fullName
      );

    if (existing) {
      return existing;
    }

    return this.createCustomer(data);
  }
}