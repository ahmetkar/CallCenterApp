
import {
  Type,
  FunctionDeclaration,
} from '@google/genai';

import { ProductService } from './product.service';
import { OrderService } from './order.service';
import { CargoService } from './cargo.service';

const productService =
  new ProductService();

const orderService =
  new OrderService();

const cargoService =
  new CargoService();

export const toolDefinitions: FunctionDeclaration[] =
  [
    {
      name: 'searchProduct',
      description:
        'Tek bir ürünü veya benzer ürünleri ara. Sipariş oluşturmadan önce ürün doğrulamak için kullan.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          productName: {
            type: Type.STRING,
            description:
              'Aranacak ürün adı',
          },
        },
        required: [
          'productName',
        ],
      },
    },
    {
      name: 'listProducts',
      description:
        'Aktif ürünleri filtreleyerek listeler.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description:
              'Kategori veya ürün grubu (örneğin klavye, mouse, monitör)',
          },
          inStock: {
            type: Type.BOOLEAN,
            description:
              'Sadece stokta olan ürünler',
          },
          maxPrice: {
            type: Type.NUMBER,
            description:
              'Maksimum fiyat',
          },
        },
      },
    },
    {
      name: 'createOrder',
      description:
        'Bir veya birden fazla üründen oluşan yeni sipariş oluşturur ve otomatik kargo kaydı açar.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          customerName: {
            type: Type.STRING,
            description:
              'Müşteri adı',
          },
          address: {
            type: Type.STRING,
            description:
              'Teslimat adresi',
          },
          notes: {
            type: Type.STRING,
            description:
              'Sipariş notu',
          },
          items: {
            type: Type.ARRAY,
            description:
              'Sipariş edilecek ürünler',
            items: {
              type: Type.OBJECT,
              properties: {
                product: {
                  type: Type.STRING,
                  description:
                    'Ürün adı',
                },
                quantity: {
                  type: Type.NUMBER,
                  description:
                    'Sipariş adedi',
                },
              },
              required: [
                'product',
                'quantity',
              ],
            },
          },
        },
        required: [
          'customerName',
          'address',
          'items',
        ],
      },
    },
    {
      name: 'checkOrderStatus',
      description:
        'Sipariş durumunu getirir.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          orderId: {
            type: Type.NUMBER,
            description:
              'Sipariş numarası',
          },
        },
        required: [
          'orderId',
        ],
      },
    },
    {
      name: 'checkCargoStatus',
      description:
        'Sipariş numarasına göre kargo durumunu getirir.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          orderId: {
            type: Type.NUMBER,
            description:
              'Sipariş numarası',
          },
        },
        required: [
          'orderId',
        ],
      },
    },
    {
      name: 'checkCargoByTrackingNumber',
      description:
        'Takip numarasına göre kargo durumunu getirir.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          trackingNumber: {
            type: Type.STRING,
            description:
              'Kargo takip numarası',
          },
        },
        required: [
          'trackingNumber',
        ],
      },
    },
  ];

export async function executeTool(
  name: string,
  args: Record<string, any>
): Promise<any> {
  try {
    switch (name) {
      case 'searchProduct': {
        const products =
          await productService.searchProducts(
            args.productName
          );

        if (
          products.length ===
          0
        ) {
          return {
            success: false,
            errorCode:
              'PRODUCT_NOT_FOUND',
            message:
              'Aradığınız ürün bulunamadı.',
          };
        }

        return {
          success: true,
          products,
        };
      }

      case 'listProducts': {
        const products =
          await productService.listProducts(
            {
              category:
                args.category,
              inStock:
                args.inStock,
              maxPrice:
                args.maxPrice,
            }
          );

        return {
          success: true,
          count:
            products.length,
          products,
        };
      }

      case 'createOrder': {
        return await orderService.createOrder(
          {
            customerName:
              args.customerName,
            address:
              args.address,
            notes: args.notes,
            items:
              args.items.map(
                (item: any) => ({
                  productName:
                    item.product,
                  quantity:
                    Number(
                      item.quantity
                    ),
                })
              ),
          }
        );
      }

      case 'checkOrderStatus': {
        return {
          success: true,
          order:
            await orderService.checkOrderStatus(
              Number(
                args.orderId
              )
            ),
        };
      }

      case 'checkCargoStatus': {
        return {
          success: true,
          cargo:
            await cargoService.checkCargoStatus(
              Number(
                args.orderId
              )
            ),
        };
      }

      case 'checkCargoByTrackingNumber': {
        return {
          success: true,
          cargo:
            await cargoService.checkByTrackingNumber(
              args.trackingNumber
            ),
        };
      }

      default:
        return {
          success: false,
          errorCode:
            'UNKNOWN_TOOL',
          message:
            'İstenen işlem desteklenmiyor.',
        };
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Bilinmeyen hata';

    if (
      message.includes(
        'Ürün bulunamadı'
      )
    ) {
      return {
        success: false,
        errorCode:
          'PRODUCT_NOT_FOUND',
        message:
          'Aradığınız ürün bulunamadı.',
      };
    }

    if (
      message.includes(
        'Yetersiz stok'
      )
    ) {
      return {
        success: false,
        errorCode:
          'OUT_OF_STOCK',
        message:
          'İstenen ürün için yeterli stok bulunmuyor.',
      };
    }

    if (
      message.includes(
        'Sipariş bulunamadı'
      )
    ) {
      return {
        success: false,
        errorCode:
          'ORDER_NOT_FOUND',
        message:
          'Belirtilen sipariş bulunamadı.',
      };
    }

    if (
      message.includes(
        'Kargo bulunamadı'
      )
    ) {
      return {
        success: false,
        errorCode:
          'CARGO_NOT_FOUND',
        message:
          'Belirtilen kargo kaydı bulunamadı.',
      };
    }

    console.error(
      'Tool error:',
      err
    );

    return {
      success: false,
      errorCode:
        'DATABASE_ERROR',
      message:
        'İşlem sırasında bir veritabanı hatası oluştu. Lütfen daha sonra tekrar deneyin.',
    };
  }
}

