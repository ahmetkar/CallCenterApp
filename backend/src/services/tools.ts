import { Type, FunctionDeclaration } from '@google/genai';

export const toolDefinitions: FunctionDeclaration[] = [
  {
    name: 'createOrder',
    description: 'Yeni bir sipariş oluşturur',
    parameters: {
      type: Type.OBJECT,
      properties: {
        product: {
          type: Type.STRING,
          description: 'Sipariş edilecek ürün adı',
        },
        quantity: {
          type: Type.NUMBER,
          description: 'Ürün adedi',
        },
        customerName: {
          type: Type.STRING,
          description: 'Müşteri adı',
        },
        address: {
          type: Type.STRING,
          description: 'Müşterinin sipariş adresi',
        },
      },
      required: [
        'product',
        'quantity',
        'customerName',
        'address',
      ],
    },
  },
  {
    name: 'checkOrderStatus',
    description: 'Sipariş durumunu kontrol eder',
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: {
          type: Type.STRING,
          description: 'Sipariş numarası',
        },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'searchProducts',
    description: 'Ürün bilgisi ve stok durumunu getir',
    parameters: {
      type: Type.OBJECT,
      properties: {
        productName: {
          type: Type.STRING,
        },
      },
      required: ['productName'],
    },
  },
];

export interface CreateOrderArgs {
  product: string;
  quantity: number;
  customerName: string;
  address: string;
}

export interface CheckOrderStatusArgs {
  orderId: string;
}

export interface SearchProductsArgs {
  productName: string;
}

export async function executeTool(
  name: string,
  args: unknown
): Promise<any> {
  console.log(`[TOOL CALL] ${name}`);
  console.log(args);

  switch (name) {
    case 'createOrder': {
      const orderArgs = args as CreateOrderArgs;

      const orderId = 'ORDER-' + Date.now();

      return {
        success: true,
        orderId,
        message: `${orderArgs.customerName} adına ${orderArgs.quantity} adet ${orderArgs.product} siparişi oluşturuldu.`,
      };
    }

    case 'checkOrderStatus': {
      const statusArgs =
        args as CheckOrderStatusArgs;

      return {
        success: true,
        orderId: statusArgs.orderId,
        status: 'Hazırlanıyor',
        estimatedDelivery: 'Yarın 14:00',
      };
    }

    case 'searchProducts': {
      const productArgs =
        args as SearchProductsArgs;

      return {
        productName: productArgs.productName,
        stock: 25,
        price: 300,
        currency: 'TRY',
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}