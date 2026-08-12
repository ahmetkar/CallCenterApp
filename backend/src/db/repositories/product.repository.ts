
import {
  EntityManager,
  ILike,
} from 'typeorm';

import { Product } from '../entities/product.entity';
import { BaseRepository } from './base.repository';

export class ProductRepository extends BaseRepository<Product> {
  constructor(
    private manager?: EntityManager
  ) {
    super(Product);

    if (manager) {
      this.repository =
        manager.getRepository(Product);
    }
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

  async listActive(filters?: {
    category?: string;
    inStock?: boolean;
    maxPrice?: number;
  }) {
    const qb =
      this.repo.createQueryBuilder(
        'p'
      );

    qb.where(
      'p."IsActive" = :active',
      {
        active: true,
      }
    );

    if (filters?.category) {
      qb.andWhere(
        'p."Name" ILIKE :category',
        {
          category: `%${filters.category}%`,
        }
      );
    }

    if (filters?.inStock) {
      qb.andWhere(
        'p."Stock" > 0'
      );
    }

    if (
      filters?.maxPrice !==
      undefined
    ) {
      qb.andWhere(
        'p."Price" <= :maxPrice',
        {
          maxPrice:
            filters.maxPrice,
        }
      );
    }

    qb.orderBy(
      'p."Name"',
      'ASC'
    );

    return qb.getMany();
  }

  async getExact(
    name: string
  ) {
    const product =
      await this.repo
        .createQueryBuilder('p')
        .where(
          'p."IsActive" = true'
        )
        .andWhere(
          `
          similarity(
            p."Name",
            :name
          ) > 0.25
          `,
          { name }
        )
        .orderBy(
          `
          similarity(
            p."Name",
            :name
          )
          `,
          'DESC'
        )
        .setParameter(
          'name',
          name
        )
        .getOne();

    if (product) {
      return product;
    }

    return this.repo.findOne({
      where: {
        name: ILike(
          `%${name}%`
        ),
        isActive: true,
      },
    });
  }

  async decreaseStock(
    productId: number,
    quantity: number
  ) {
    const result =
      await this.repo
        .createQueryBuilder()
        .update(Product)
        .set({
          stock: () =>
            `"Stock" - ${quantity}`,
        })
        .where(
          '"Id" = :productId',
          { productId }
        )
        .andWhere(
          '"Stock" >= :quantity',
          { quantity }
        )
        .returning('*')
        .execute();

    if (
      result.affected === 0
    ) {
      throw new Error(
        'Yetersiz stok veya ürün bulunamadı'
      );
    }

    return result.raw[0] as Product;
  }

  async increaseStock(
    productId: number,
    quantity: number
  ) {
    const result =
      await this.repo
        .createQueryBuilder()
        .update(Product)
        .set({
          stock: () =>
            `"Stock" + ${quantity}`,
        })
        .where(
          '"Id" = :productId',
          { productId }
        )
        .returning('*')
        .execute();

    if (
      result.affected === 0
    ) {
      throw new Error(
        'Ürün bulunamadı'
      );
    }

    return result.raw[0] as Product;
  }

  async decreaseStocks(
    items: Array<{
      productId: number;
      quantity: number;
    }>
  ) {
    const updatedProducts: Product[] =
      [];

    for (const item of items) {
      const product =
        await this.decreaseStock(
          item.productId,
          item.quantity
        );

      updatedProducts.push(
        product
      );
    }

    return updatedProducts;
  }

  async increaseStocks(
    items: Array<{
      productId: number;
      quantity: number;
    }>
  ) {
    const updatedProducts: Product[] =
      [];

    for (const item of items) {
      const product =
        await this.increaseStock(
          item.productId,
          item.quantity
        );

      updatedProducts.push(
        product
      );
    }

    return updatedProducts;
  }

  async getByIds(
    productIds: number[]
  ) {
    return this.repo
      .createQueryBuilder('p')
      .where(
        'p."Id" IN (:...ids)',
        {
          ids: productIds,
        }
      )
      .getMany();
  }
}

