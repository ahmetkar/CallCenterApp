
export interface CreatePlatformOrderDto {
  orderNumber: string;

  customer: {
    name: string;
    phone?: string;
    address?: string;
  };

  items: Array<{
    productName: string;
    externalProductId?: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    modifiers?: Record<string, any>;
  }>;

  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
  notes?: string;
}

