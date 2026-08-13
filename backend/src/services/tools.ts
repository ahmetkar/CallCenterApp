
import {
  Type,
  FunctionDeclaration,
} from '@google/genai';

import { ProductService } from './product.service';
import { OrderService } from './order.service';
import { DeliveryService } from './delivery.service';
import { RestaurantService } from './restaurant.service';
import dotenv from 'dotenv';

import {
  OrderSource,
} from '../db/entities/order.entity';

dotenv.config();
const RESTAURANT_ID = Number(
  process.env.RESTAURANT_ID
);

if (!RESTAURANT_ID) {
  throw new Error(
    'RESTAURANT_ID env değeri tanımlı değil.'
  );
}

const productService =
  new ProductService();

const orderService =
  new OrderService();

const deliveryService =
  new DeliveryService();

const restaurantService =
  new RestaurantService();

export type ToolResult = {
  success: boolean;
  message?: string;
  errorCode?: string;
  [key: string]: any;
};

export const toolDefinitions: FunctionDeclaration[] = [
{
  name: 'searchProducts',
  description:
    'Menüde ürün ara.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      keyword: {
        type: Type.STRING,
      },
    },
    required: ['keyword'],
  },
},
  {
  name: 'listProducts',
  description:
    'Restoran menüsünü listele.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
      },
      inStock: {
        type: Type.BOOLEAN,
      },
      maxPrice: {
        type: Type.NUMBER,
      },
    },
  },
},
  {
  name: 'createOrder',
  description:
    'Bir veya birden fazla ürün içeren sipariş oluştur.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      provider: {
        type: Type.STRING,
        enum: [
          'Internal',
          'UberEats',
          'DeliveryHero',
        ],
      },
      customerName: {
        type: Type.STRING,
      },
      phone: {
        type: Type.STRING,
      },
      address: {
        type: Type.STRING,
      },
      email: {
        type: Type.STRING,
      },
      notes: {
        type: Type.STRING,
      },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            productName: {
              type: Type.STRING,
            },
            quantity: {
              type: Type.NUMBER,
            },
            notes: {
              type: Type.STRING,
            },
          },
          required: [
            'productName',
            'quantity',
          ],
        },
      },
    },
    required: [
      'provider',
      'customerName',
      'address',
      'items',
    ],
  },
},
  {
    name: 'checkOrderStatus',
    description:
      'Sipariş numarasına göre sipariş durumunu getir.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderNumber: {
          type: Type.STRING,
        },
      },
      required: [
        'orderNumber',
      ],
    },
  },
  {
    name: 'checkDeliveryStatus',
    description:
      'Sipariş numarasına göre kurye durumunu getir.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderNumber: {
          type: Type.STRING,
        },
      },
      required: [
        'orderNumber',
      ],
    },
  },
  {
  name: 'getRestaurantInfo',
  description:
    'Restoran bilgilerini getir.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
},
  {
    name: 'cancelOrder',
    description:
      'Siparişi iptal eder.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderNumber: {
          type: Type.STRING,
        },
      },
      required: [
        'orderNumber',
      ],
    },
  },
];

export async function executeTool(
  name: string,
  args: Record<string, any>
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'searchProducts': {
        const products =
          await productService.searchProducts(
            RESTAURANT_ID,
            args.keyword
          );

        if (products.length === 0) {
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
          count: products.length,
          products,
        };
      }

      case 'listProducts': {
        const products =
    await productService.listProducts(
      RESTAURANT_ID,
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
          count: products.length,
          products,
        };
      }

      case 'createOrder': {
        const provider =
          args.provider ===
          'UberEats'
            ? OrderSource.UBER_EATS
            : args.provider ===
                'DeliveryHero'
              ? OrderSource.DELIVERY_HERO
              : OrderSource.INTERNAL;

              const result =
        await orderService.createOrder(
          {
            restaurantId:
              RESTAURANT_ID,
            provider,
            customer: {
              name:
                args.customerName,
              phone:
                args.phone,
              address:
                args.address,
              email:
                args.email,
            },
            items: (
              args.items ?? []
            ).map(
              (item: any) => ({
                productName:
                  item.productName,
                quantity:
                  Number(
                    item.quantity
                  ),
                notes:
                  item.notes,
              })
            ),
            notes: args.notes,
          }
        );

        return {
          success: true,
          message:
            'Sipariş başarıyla oluşturuldu.',
          orderId:
            result.orderId,
          orderNumber:
            result.orderNumber,
          provider:
            result.provider,
          totalPrice:
            result.totalPrice,
          trackingUrl:
            result.trackingUrl,
        };
      }

      case 'checkOrderStatus': {
        const order =
          await orderService.checkOrderStatus(
            args.orderNumber
          );

        return {
          success: true,
          order,
        };
      }

      case 'checkDeliveryStatus': {
        const delivery =
          await deliveryService.checkDeliveryStatus(
            args.orderNumber
          );

        return {
          success: true,
          delivery,
        };
      }

      case 'getRestaurantInfo': {
        const restaurant =
          await restaurantService.getRestaurant(
            RESTAURANT_ID
          );

        return {
          success: true,
          restaurant,
        };
      }

      case 'cancelOrder': {
        await orderService.cancelOrder(
          args.orderNumber
        );

        return {
          success: true,
          message:
            'Sipariş iptal edildi.',
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
        message,
      };
    }

    if (
      message.includes(
        'yetersiz stok'
      ) ||
      message.includes(
        'Yetersiz stok'
      )
    ) {
      return {
        success: false,
        errorCode:
          'OUT_OF_STOCK',
        message,
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
        message,
      };
    }

    if (
      message.includes(
        'Teslimat bulunamadı'
      ) ||
      message.includes(
        'Kurye bulunamadı'
      )
    ) {
      return {
        success: false,
        errorCode:
          'DELIVERY_NOT_FOUND',
        message,
      };
    }

    console.error(
      'Tool error:',
      err
    );

    return {
      success: false,
      errorCode:
        'INTERNAL_ERROR',
      message,
    };
  }
}

/**
 * 
 * 
 */