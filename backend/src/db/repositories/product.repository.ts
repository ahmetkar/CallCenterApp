
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



  async upsertFromPlatform(data: {
    restaurantId: number;
    externalProductId: string;
    name: string;
    description?: string;
    category?: string;
    price: number;
    currency?: string;
    isAvailable: boolean;
  }): Promise<Product> {
    let product =
      await this.repo.findOne({
        where: {
          restaurantId:
            data.restaurantId,
          externalProductId:
            data.externalProductId,
        },
      });

    if (!product) {
      product =
        this.repo.create({
          restaurantId:
            data.restaurantId,
          externalProductId:
            data.externalProductId,
          name: data.name,
          description:
            data.description,
          category:
            data.category,
          price: data.price,
          currency:
            data.currency ??
            'TRY',
          stock: 100,
          isAvailable:
            data.isAvailable,
          isActive: true,
          lastSyncedAt:
            new Date(),
        });

      return this.repo.save(
        product
      );
    }

    product.name = data.name;
    product.description =
      data.description;
    product.category =
      data.category;
    product.price =
      data.price;
    product.currency =
      data.currency ??
      product.currency;
    product.isAvailable =
      data.isAvailable;
    
    product.lastSyncedAt =
      new Date();

    return this.repo.save(
      product
    );
  }


  async search(
  restaurantId: number,
  keyword: string
) {
  return this.repo.find({
    where: {
      restaurantId,
      name: ILike(
        `%${keyword}%`
      ),
      isActive: true,
      isAvailable: true,
    },
    order: {
      name: 'ASC',
    },
    take: 20,
  });
}
  async listActive(
  restaurantId: number,
  filters?: {
    category?: string;
    inStock?: boolean;
    maxPrice?: number;
  }
) {
  const qb =
    this.repo.createQueryBuilder('p');

  qb.where(
    'p.restaurantId = :restaurantId',
    { restaurantId }
  );

  qb.andWhere(
    'p.isActive = :active',
    {
      active: true,
    }
  );

  qb.andWhere(
    'p.isAvailable = :available',
    {
      available: true,
    }
  );

  if (filters?.category) {
    qb.andWhere(
      'p.category ILIKE :category',
      {
        category: `%${filters.category}%`,
      }
    );
  }

  if (filters?.inStock) {
    qb.andWhere(
      'p.stock > 0'
    );
  }

  if (
    filters?.maxPrice !==
    undefined
  ) {
    qb.andWhere(
      'p.price <= :maxPrice',
      {
        maxPrice:
          filters.maxPrice,
      }
    );
  }

  qb.orderBy(
    'p.category',
    'ASC'
  ).addOrderBy(
    'p.name',
    'ASC'
  );

  return qb.getMany();
}


async findByRestaurantAndId(
  restaurantId: number,
  productId: number
) {
  return this.repo.findOne({
    where: {
      id: productId,
      restaurantId,
      isActive: true,
    },
  });
}

 async getExact(
  restaurantId: number,
  name: string
) {
  const product =
    await this.repo
      .createQueryBuilder('p')
      .where(
        'p.restaurantId = :restaurantId',
        { restaurantId }
      )
      .andWhere(
        'p.isActive = true'
      )
      .andWhere(
        'p.isAvailable = true'
      )
      .andWhere(
        `
        similarity(
          p.name,
          :name
        ) > 0.25
      `,
        { name }
      )
      .orderBy(
        `
        similarity(
          p.name,
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
      restaurantId,
      name: ILike(
        `%${name}%`
      ),
      isActive: true,
      isAvailable: true,
    },
  });
}

  async findByExternalProductId(
    restaurantId: number,
    externalProductId: string
  ) {
    return this.repo.findOne({
      where: {
        restaurantId,
        externalProductId,
      },
    });
  }

  async upsertExternalProduct(data: {
    restaurantId: number;
    externalProductId: string;
    name: string;
    price: number;
    category?: string;
    description?: string;
  }) {
    let product =
      await this.findByExternalProductId(
        data.restaurantId,
        data.externalProductId
      );

    if (!product) {
      product =
        this.repo.create({
          restaurantId:
            data.restaurantId,
          externalProductId:
            data.externalProductId,
          name: data.name,
          price: data.price,
          category:
            data.category,
          description:
            data.description,
          isActive: true,
          isAvailable: true,
          lastSyncedAt:
            new Date(),
        });

      return this.repo.save(
        product
      );
    }

    product.name = data.name;
    product.price = data.price;
    product.category =
      data.category;
    product.description =
      data.description;
    product.lastSyncedAt =
      new Date();

    return this.repo.save(
      product
    );
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
      product.stock <
      quantity
    ) {
      throw new Error(
        'Yetersiz stok'
      );
    }

    product.stock -= quantity;

    return this.repo.save(
      product
    );
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

    return this.repo.save(
      product
    );
  }
}

