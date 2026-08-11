import { ILike } from 'typeorm';
import { Product } from '../entities/product.entity';
import { BaseRepository } from './base.repository';

export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super(Product);
  }

  async search(
    keyword: string
  ) {
    return this.repo.find({
      where: {
        name: ILike(
          `%${keyword}%`
        ),
        isActive: true,
      },
      order: {
        name: 'ASC',
      },
      take: 20,
    });
  }

  async getExact(
    name: string
  ) {
    return this.repo.findOne({
      where: {
        name: ILike(name),
        isActive: true,
      },
    });
  }

  async decreaseStock(
    productId: number,
    quantity: number
  ) {
    const product =
      await this.findById(
        productId
      );

    if (!product) {
      throw new Error(
        'Ürün bulunamadı'
      );
    }

    if (
      product.stock < quantity
    ) {
      throw new Error(
        'Yetersiz stok'
      );
    }

    product.stock -= quantity;

    await this.repo.save(product);

    return product;
  }

  async increaseStock(
    productId: number,
    quantity: number
  ) {
    const product =
      await this.findById(
        productId
      );

    if (!product) {
      throw new Error(
        'Ürün bulunamadı'
      );
    }

    product.stock += quantity;

    await this.repo.save(product);

    return product;
  }
}