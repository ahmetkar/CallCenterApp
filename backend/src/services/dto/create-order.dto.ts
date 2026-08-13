
export interface CreateOrderDto {
  restaurantId: number;

  provider: 'Internal' | 'UberEats' | 'DeliveryHero';

  customer: {
    name: string;
    phone?: string;
    address?: string;
    email?: string;
  };

  items: Array<{
    productName: string;
    quantity: number;
    notes?: string;
    modifiers?: Record<string, any>;
  }>;

  notes?: string;
}

