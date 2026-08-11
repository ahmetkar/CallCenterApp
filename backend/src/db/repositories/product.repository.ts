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