import { ProductRepository } from '../db/repositories/product.repository';

export class ProductService {
  private products =
    new ProductRepository();


 async listProducts(filters?: {
  category?: string;
  inStock?: boolean;
  maxPrice?: number;
}) {
  const productRepo =
    new ProductRepository();

  const products =
    await productRepo.listActive(
      filters
    );

  return products.map(
    (p) => ({
      id: p.id,
      name: p.name,
      price: Number(
        p.price
      ),
      currency:
        p.currency,
      stock: p.stock,
    })
  );
}

  async searchProducts(
    keyword: string
  ) {
    const result =
      await this.products.search(
        keyword
      );

    return result.map((p) => ({
      id: p.id,
      name: p.name,
      description:
        p.description,
      sku: p.sku,
      barcode: p.barcode,
      price: Number(p.price),
      currency: p.currency,
      stock: p.stock,
      isActive: p.isActive,
    }));
  }

  async getProduct(id: number) {
    const product =
      await this.products.findById(id);

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
      barcode: product.barcode,
      price: Number(product.price),
      currency: product.currency,
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

    return product;
  }
}