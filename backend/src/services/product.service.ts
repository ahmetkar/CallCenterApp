
import { ProductRepository } from '../db/repositories/product.repository';

export class ProductService {
  private products =
    new ProductRepository();

  async listProducts(
    restaurantId: number,
    filters?: {
      category?: string;
      inStock?: boolean;
      maxPrice?: number;
    }
  ) {
    const products =
      await this.products.listActive(
        restaurantId,
        filters
      );

    return products.map(p => ({
      id: p.id,
      name: p.name,
      description:
        p.description,
      category: p.category,
      price: Number(p.price),
      currency:
        p.currency,
      stock: p.stock,
      isAvailable:
        p.isAvailable,
    }));
  }

  async searchProducts(
    restaurantId: number,
    keyword: string
  ) {
    const result =
      await this.products.search(
        restaurantId,
        keyword
      );

    return result.map(p => ({
      id: p.id,
      name: p.name,
      description:
        p.description,
      category: p.category,
      price: Number(p.price),
      currency:
        p.currency,
      stock: p.stock,
      isAvailable:
        p.isAvailable,
    }));
  }

  async getProduct(
    restaurantId: number,
    id: number
  ) {
    const product =
      await this.products.findByRestaurantAndId(
        restaurantId,
        id
      );

    if (!product) {
      throw new Error(
        'Ürün bulunamadı'
      );
    }

    return {
      id: product.id,
      name: product.name,
      description:
        product.description,
      category:
        product.category,
      price: Number(
        product.price
      ),
      currency:
        product.currency,
      stock: product.stock,
      isAvailable:
        product.isAvailable,
    };
  }

  async getExactProduct(
    restaurantId: number,
    name: string
  ) {
    const product =
      await this.products.getExact(
        restaurantId,
        name
      );

    if (!product) {
      throw new Error(
        'Ürün bulunamadı'
      );
    }

    return product;
  }

  async getMenuSummary(
    restaurantId: number
  ) {
    const products =
      await this.products.listActive(
        restaurantId
      );

    const categories = [
      ...new Set(
        products.map(
          p => p.category
        )
      ),
    ];

    return {
      totalProducts:
        products.length,
      categories,
      products: products.map(
        p => ({
          name: p.name,
          category:
            p.category,
          price: Number(
            p.price
          ),
        })
      ),
    };
  }
}

