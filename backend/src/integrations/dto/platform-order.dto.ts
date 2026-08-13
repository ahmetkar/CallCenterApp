
export interface PlatformOrderDto {
  externalOrderId: string;

  externalStoreId: string;

  status: string;

  trackingUrl?: string;

  courier?: {
    name?: string;
    phone?: string;
  };

  estimatedPickupTime?: Date;

  estimatedDeliveryTime?: Date;
}

