
import { ProductRepository } from '../db/repositories/product.repository';

export class ProductService {
  private products =
    new ProductRepository();

  async listProducts(filters?: {
    category?: string;
    inStock?: boolean;
    maxPrice?: number;
  }) {
    const products =
      await this.products.listActive(
        filters
      );

    return products.map(
      product => ({
        id: product.id,
        name: product.name,
        description:
          product.description,
        price: Number(
          product.price
        ),
        currency:
          product.currency,
        stock: product.stock,
        isActive:
          product.isActive,
      })
    );
  }

  async searchProducts(
    keyword: string
  ) {
    const products =
      await this.products.search(
        keyword
      );

    return products.map(
      product => ({
        id: product.id,
        name: product.name,
        description:
          product.description,
        sku: product.sku,
        barcode:
          product.barcode,
        price: Number(
          product.price
        ),
        currency:
          product.currency,
        stock: product.stock,
        isActive:
          product.isActive,
      })
    );
  }

  async getProduct(
    id: number
  ) {
    const product =
      await this.products.findById(
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
      sku: product.sku,
      barcode:
        product.barcode,
      price: Number(
        product.price
      ),
      currency:
        product.currency,
      stock: product.stock,
      isActive:
        product.isActive,
    };
  }

  async getExactProduct(
    name: string
  ) {
    const product =
      await this.products.getExact(
        name
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
      sku: product.sku,
      barcode:
        product.barcode,
      price: Number(
        product.price
      ),
      currency:
        product.currency,
      stock: product.stock,
      isActive:
        product.isActive,
    };
  }

  async getProductsByIds(
    productIds: number[]
  ) {
    const products =
      await this.products.getByIds(
        productIds
      );

    return products.map(
      product => ({
        id: product.id,
        name: product.name,
        price: Number(
          product.price
        ),
        currency:
          product.currency,
        stock: product.stock,
      })
    );
  }
}

